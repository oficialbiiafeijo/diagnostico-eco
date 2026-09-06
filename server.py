# -*- coding: utf-8 -*-
"""
Diagnostico Comercial ECO - Grupo B3 Sales
Servidor HTTP sem nenhuma dependencia externa (somente biblioteca padrao do Python).

Rodar:      python3 server.py
Abrir:      http://127.0.0.1:8000
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import urllib.parse
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import analise
import questions

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("ECO_DATA_DIR") or (BASE_DIR / "data"))
WEB_DIR = BASE_DIR
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "eco.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD = 20 * 1024 * 1024          # 20 MB por arquivo
MAX_BODY = 28 * 1024 * 1024            # margem para o base64
SESSION_HOURS = 12
_local = threading.local()


# --------------------------------------------------------------------- infra
def db() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, timeout=20)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180_000).hex()
    return hmac.compare_digest(actual, expected)


def cfg_get(k, default=None):
    row = db().execute("SELECT v FROM config WHERE k=?", (k,)).fetchone()
    return row["v"] if row else default


def cfg_set(k, v):
    db().execute("INSERT INTO config(k,v) VALUES(?,?) "
                 "ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))
    db().commit()


SCHEMA = """
CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY, empresa TEXT NOT NULL, responsavel TEXT, cargo TEXT,
  segmento TEXT, contato TEXT, email TEXT, criado_em TEXT, obs_internas TEXT DEFAULT '',
  arquivado INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS links (
  token TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL,
  ativo INTEGER DEFAULT 1, criado_em TEXT, expira_em TEXT,
  ultimo_acesso TEXT, acessos INTEGER DEFAULT 0, preenchido_por TEXT,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS ciclos (
  cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL, status TEXT DEFAULT 'Não iniciado',
  criado_em TEXT, iniciado_em TEXT, enviado_em TEXT, progresso INTEGER DEFAULT 0,
  PRIMARY KEY(cliente_id, ciclo),
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS respostas (
  cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL, qid TEXT NOT NULL,
  valor TEXT, atualizado_em TEXT,
  PRIMARY KEY(cliente_id, ciclo, qid),
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id TEXT, ciclo TEXT, qid TEXT,
  anterior TEXT, novo TEXT, em TEXT);

CREATE TABLE IF NOT EXISTS anexos (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL,
  nome TEXT, tipo TEXT, tamanho INTEGER, arquivo TEXT, nota TEXT DEFAULT '',
  enviado_em TEXT, origem TEXT DEFAULT 'cliente',
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS analises (
  cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL, notas TEXT DEFAULT '',
  gargalos TEXT DEFAULT '', prioridades TEXT DEFAULT '', proximo_foco TEXT DEFAULT '',
  atualizado_em TEXT, PRIMARY KEY(cliente_id, ciclo),
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);
"""


def init_db():
    conn = db()
    conn.executescript(SCHEMA)
    conn.commit()
    if not cfg_get("admin_hash"):
        senha = os.getenv("ECO_ADMIN_SENHA") or "B3Sales@2026"
        cfg_set("admin_hash", hash_password(senha))
        cfg_set("admin_usuario", os.getenv("ECO_ADMIN_USUARIO", "b3sales"))
        cfg_set("api_key", secrets.token_urlsafe(24))
        cfg_set("secret", secrets.token_hex(32))
        aviso = DATA_DIR / "PRIMEIRO-ACESSO.txt"
        aviso.write_text(
            "DIAGNÓSTICO COMERCIAL ECO — GRUPO B3 SALES\n"
            "==========================================\n\n"
            f"Endereço da área interna : /admin\n"
            f"Usuário                  : {cfg_get('admin_usuario')}\n"
            f"Senha                    : {senha}\n\n"
            "Chave de leitura dos dados (para gerar análises fora do sistema):\n"
            f"{cfg_get('api_key')}\n\n"
            "Troque a senha na área interna, em Configurações.\n"
            "Guarde este arquivo em local seguro.\n", encoding="utf-8")
    if not cfg_get("secret"):
        cfg_set("secret", secrets.token_hex(32))
    if not cfg_get("api_key"):
        cfg_set("api_key", secrets.token_urlsafe(24))


# ------------------------------------------------------------------- sessao
def sign_session(user: str) -> str:
    exp = int(time.time()) + SESSION_HOURS * 3600
    raw = f"{user}|{exp}"
    sig = hmac.new(cfg_get("secret").encode(), raw.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{raw}|{sig}".encode()).decode()


def check_session(cookie: str | None) -> str | None:
    if not cookie:
        return None
    try:
        raw = base64.urlsafe_b64decode(cookie.encode()).decode()
        user, exp, sig = raw.rsplit("|", 2)
        expected = hmac.new(cfg_get("secret").encode(), f"{user}|{exp}".encode(),
                            hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        if int(exp) < time.time():
            return None
        return user
    except Exception:
        return None


# ------------------------------------------------------------------ dominio
def novo_token() -> str:
    return secrets.token_urlsafe(18)


def slug(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (s or "").strip().lower()).strip("-")
    return s[:40] or "empresa"


def garantir_ciclo(cliente_id: str, ciclo: str):
    db().execute("INSERT OR IGNORE INTO ciclos(cliente_id, ciclo, criado_em) VALUES(?,?,?)",
                 (cliente_id, ciclo, now()))
    db().commit()


def respostas_de(cliente_id: str, ciclo: str) -> dict:
    rows = db().execute("SELECT qid, valor FROM respostas WHERE cliente_id=? AND ciclo=?",
                        (cliente_id, ciclo)).fetchall()
    out = {}
    for r in rows:
        try:
            out[r["qid"]] = json.loads(r["valor"])
        except Exception:
            out[r["qid"]] = {"v": r["valor"]}
    return out


def preenchida(a) -> bool:
    if not a:
        return False
    if a.get("na"):
        return True
    v = a.get("v")
    if v in (None, "", [], {}):
        return False
    if isinstance(v, dict):
        return any(x not in (None, "", [], {}) for x in v.values())
    return True


def visivel(q, ans) -> bool:
    """Perguntas condicionais so contam quando a condicao esta satisfeita."""
    c = q.get("show_if")
    if not c:
        return True
    v = (ans.get(c["q"]) or {}).get("v")
    lista = v if isinstance(v, list) else ([] if v in (None, "", {}) else [v])
    if "in" in c:
        return any(x in c["in"] for x in lista)
    if "not_in" in c:
        return bool(lista) and not all(x in c["not_in"] for x in lista)
    return True


def calcular_progresso(cliente_id: str, ciclo: str) -> int:
    ans = respostas_de(cliente_id, ciclo)
    todas = [q for _, q in questions.all_questions()
             if q["type"] != "files" and visivel(q, ans)]
    feitas = sum(1 for q in todas if preenchida(ans.get(q["id"])))
    p = round(feitas / len(todas) * 100) if todas else 0
    db().execute("UPDATE ciclos SET progresso=? WHERE cliente_id=? AND ciclo=?",
                 (p, cliente_id, ciclo))
    db().commit()
    return p


def faltando(cliente_id: str, ciclo: str):
    ans = respostas_de(cliente_id, ciclo)
    qm = questions.question_map()
    out = []
    for qid in questions.required_ids():
        b, q = qm[qid]
        if not visivel(q, ans):
            continue
        if not preenchida(ans.get(qid)):
            out.append({"qid": qid, "bloco": b["id"], "bloco_titulo": b["title"],
                        "label": q["label"]})
    return out


def anexos_de(cliente_id: str, ciclo: str):
    rows = db().execute(
        "SELECT id, nome, tipo, tamanho, nota, enviado_em, origem FROM anexos "
        "WHERE cliente_id=? AND ciclo=? ORDER BY enviado_em", (cliente_id, ciclo)).fetchall()
    return [dict(r) for r in rows]


def cliente_dict(cid: str):
    r = db().execute("SELECT * FROM clientes WHERE id=?", (cid,)).fetchone()
    return dict(r) if r else None


def set_status(cliente_id, ciclo, status):
    garantir_ciclo(cliente_id, ciclo)
    db().execute("UPDATE ciclos SET status=? WHERE cliente_id=? AND ciclo=?",
                 (status, cliente_id, ciclo))
    db().commit()


def dump_cliente(cid: str) -> dict:
    """Retrato completo de um cliente, usado na exportacao e na API de leitura."""
    c = cliente_dict(cid)
    if not c:
        return {}
    qm = questions.question_map()
    ciclos = []
    for row in db().execute("SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid",
                            (cid,)).fetchall():
        ciclo = row["ciclo"]
        ans = respostas_de(cid, ciclo)
        legivel = []
        for b, q in questions.all_questions():
            a = ans.get(q["id"])
            if not preenchida(a):
                continue
            legivel.append({
                "bloco": b["title"], "pergunta": q["label"], "qid": q["id"],
                "resposta": a.get("v"), "outro": a.get("outro") or "",
                "nao_informado": a.get("na") or "", "complemento": a.get("extra") or "",
                "indicador_interno": (q.get("admin") or {}).get("indicador", ""),
            })
        an = db().execute("SELECT * FROM analises WHERE cliente_id=? AND ciclo=?",
                          (cid, ciclo)).fetchone()
        ciclos.append({
            "ciclo": ciclo, "status": row["status"], "progresso": row["progresso"],
            "enviado_em": row["enviado_em"], "respostas": legivel,
            "score_eco": analise.score(ans),
            "indicadores_calculados": analise.indicadores(ans),
            "dados_nao_acompanhados": analise.nao_informados(ans),
            "analise_b3sales": dict(an) if an else {},
            "anexos": anexos_de(cid, ciclo),
        })
    links = [dict(r) for r in db().execute(
        "SELECT token, ciclo, ativo, criado_em, expira_em, ultimo_acesso, acessos, "
        "preenchido_por FROM links WHERE cliente_id=?", (cid,)).fetchall()]
    return {"cliente": c, "links": links, "ciclos": ciclos,
            "exportado_em": now(), "sistema": "Diagnostico Comercial ECO - Grupo B3 Sales"}


# ------------------------------------------------------------------ handler
class Handler(BaseHTTPRequestHandler):
    server_version = "DiagnosticoECO"
    protocol_version = "HTTP/1.1"

    def cookie_seguro(self) -> str:
        """Marca o cookie como Secure quando o site esta atras de HTTPS."""
        proto = (self.headers.get("X-Forwarded-Proto") or "").lower()
        return " Secure;" if proto == "https" else ""

    def log_message(self, fmt, *args):
        if os.getenv("ECO_LOG"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # -- helpers
    def _send(self, code, body=b"", ctype="text/html; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def json(self, data, code=200, extra=None):
        self._send(code, json.dumps(data, ensure_ascii=False),
                   "application/json; charset=utf-8", extra)

    def erro(self, msg, code=400):
        self.json({"erro": msg}, code)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("o conteúdo enviado é grande demais")
        if not n:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8"))

    def cookie(self, name):
        raw = self.headers.get("Cookie") or ""
        for part in raw.split(";"):
            k, _, v = part.strip().partition("=")
            if k == name:
                return v
        return None

    def admin_user(self):
        return check_session(self.cookie("eco_sess"))

    def exige_admin(self):
        u = self.admin_user()
        if not u:
            self.erro("Sessão expirada. Faça login novamente.", 401)
            return None
        return u

    def query(self):
        return urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)

    def q1(self, k, default=None):
        return (self.query().get(k) or [default])[0]

    # -- roteamento
    def do_GET(self):
        try:
            self.route_get(urllib.parse.urlparse(self.path).path)
        except BrokenPipeError:
            pass
        except Exception as e:
            self.erro(f"Erro interno: {e}", 500)

    def do_POST(self):
        try:
            self.route_post(urllib.parse.urlparse(self.path).path)
        except BrokenPipeError:
            pass
        except Exception as e:
            self.erro(f"Erro interno: {e}", 500)

    do_HEAD = do_GET

    # ---------------------------------------------------------------- GET
    def route_get(self, p):
        if p == "/":
            return self._send(200, (WEB_DIR / "home.html").read_bytes())
        if p == "/admin":
            return self._send(200, (WEB_DIR / "admin.html").read_bytes())
        if p.startswith("/d/"):
            return self._send(200, (WEB_DIR / "cliente.html").read_bytes())
        if p.startswith("/static/"):
            return self.static(p[len("/static/"):])
        if p == "/saude":
            return self.health_check()

        # -------- API do cliente
        m = re.fullmatch(r"/api/d/([\w\-]+)", p)
        if m:
            return self.api_cliente_get(m.group(1))

        # -------- API interna
        if p == "/api/admin/sessao":
            u = self.admin_user()
            return self.json({"logado": bool(u), "usuario": u})
        if p == "/api/admin/clientes":
            if not self.exige_admin():
                return
            return self.api_lista_clientes()
        m = re.fullmatch(r"/api/admin/cliente/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_admin_cliente(m.group(1))
        m = re.fullmatch(r"/api/admin/comparar/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_comparar(m.group(1))
        m = re.fullmatch(r"/api/admin/exportar/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            d = dump_cliente(m.group(1))
            nome = slug(d.get("cliente", {}).get("empresa", "cliente"))
            return self._send(200, json.dumps(d, ensure_ascii=False, indent=2),
                              "application/json; charset=utf-8",
                              {"Content-Disposition":
                               f'attachment; filename="diagnostico-eco-{nome}.json"'})
        m = re.fullmatch(r"/api/admin/exportar-csv/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_csv(m.group(1))
        if p == "/api/admin/config":
            if not self.exige_admin():
                return
            return self.json({"api_key": cfg_get("api_key"),
                              "usuario": cfg_get("admin_usuario")})

        # -------- anexos
        m = re.fullmatch(r"/api/anexo/([\w\-]+)", p)
        if m:
            return self.api_baixar_anexo(m.group(1))

        # -------- API de leitura por chave (para analise externa / Claude)
        if p == "/api/dados":
            return self.api_dados()
        m = re.fullmatch(r"/api/dados/([\w\-]+)", p)
        if m:
            if not self.chave_ok():
                return self.erro("Chave inválida.", 403)
            return self.json(dump_cliente(m.group(1)))

        self._send(404, "<h1>404</h1><p>Página não encontrada.</p>")

    # --------------------------------------------------------------- POST
    def route_post(self, p):
        m = re.fullmatch(r"/api/d/([\w\-]+)/salvar", p)
        if m:
            return self.api_salvar(m.group(1))
        m = re.fullmatch(r"/api/d/([\w\-]+)/anexo", p)
        if m:
            return self.api_upload(m.group(1))
        m = re.fullmatch(r"/api/d/([\w\-]+)/anexo-remover", p)
        if m:
            return self.api_remover_anexo(m.group(1))
        m = re.fullmatch(r"/api/d/([\w\-]+)/enviar", p)
        if m:
            return self.api_enviar(m.group(1))

        if p == "/api/admin/login":
            return self.api_login()
        if p == "/api/admin/sair":
            return self.json({"ok": True}, 200,
                             {"Set-Cookie": "eco_sess=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"})
        if not self.exige_admin():
            return
        if p == "/api/admin/cliente-novo":
            return self.api_criar_cliente()
        if p == "/api/admin/cliente-editar":
            return self.api_editar_cliente()
        if p == "/api/admin/link":
            return self.api_link()
        if p == "/api/admin/analise":
            return self.api_salvar_analise()
        if p == "/api/admin/status":
            return self.api_set_status()
        if p == "/api/admin/ciclo-novo":
            return self.api_novo_ciclo()
        if p == "/api/admin/senha":
            return self.api_trocar_senha()
        if p == "/api/admin/anexo-nota":
            return self.api_nota_anexo()
        if p == "/api/admin/cliente-excluir":
            return self.api_excluir_cliente()
        self.erro("Rota não encontrada.", 404)

    # ------------------------------------------------------------ estaticos
    def static(self, rel):
        f = (WEB_DIR / rel).resolve()
        if not str(f).startswith(str(WEB_DIR.resolve())) or not f.is_file():
            return self._send(404, "não encontrado", "text/plain; charset=utf-8")
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        if ctype.startswith("text/") or "javascript" in ctype:
            ctype += "; charset=utf-8"
        self._send(200, f.read_bytes(), ctype, {"Cache-Control": "no-cache"})

    # ---------------------------------------------------------- health check
    def health_check(self):
        """Verifica se o servidor e o banco de dados estao funcionando."""
        try:
            db().execute("SELECT 1").fetchone()
            return self.json({"ok": True, "em": now()})
        except Exception as e:
            return self.json({"ok": False, "erro": f"Banco de dados inacessível: {str(e)}"},
                           500)

    # -------------------------------------------------------------- cliente
    def link_valido(self, token):
        r = db().execute("SELECT * FROM links WHERE token=?", (token,)).fetchone()
        if not r:
            return None, "Este link não existe ou foi removido."
        if not r["ativo"]:
            return None, "Este link foi desativado pela equipe do Grupo B3 Sales."
        if r["expira_em"] and r["expira_em"] < now():
            return None, "Este link expirou. Solicite um novo à equipe do Grupo B3 Sales."
        return r, None

    def api_cliente_get(self, token):
        link, err = self.link_valido(token)
        if err:
            return self.json({"erro": err, "bloqueado": True}, 200)
        cid, ciclo = link["cliente_id"], link["ciclo"]
        garantir_ciclo(cid, ciclo)
        db().execute("UPDATE links SET ultimo_acesso=?, acessos=acessos+1 WHERE token=?",
                     (now(), token))
        row = db().execute("SELECT * FROM ciclos WHERE cliente_id=? AND ciclo=?",
                           (cid, ciclo)).fetchone()
        if row["status"] == "Não iniciado":
            db().execute("UPDATE ciclos SET status='Em preenchimento', iniciado_em=? "
                         "WHERE cliente_id=? AND ciclo=?", (now(), cid, ciclo))
        db().commit()
        c = cliente_dict(cid)
        row = db().execute("SELECT * FROM ciclos WHERE cliente_id=? AND ciclo=?",
                           (cid, ciclo)).fetchone()
        return self.json({
            "empresa": c["empresa"], "responsavel": c["responsavel"] or "",
            "ciclo": ciclo, "status": row["status"],
            "enviado": bool(row["enviado_em"]), "enviado_em": row["enviado_em"],
            "progresso": calcular_progresso(cid, ciclo),
            "blocos": questions.client_blocks(),
            "respostas": respostas_de(cid, ciclo),
            "anexos": anexos_de(cid, ciclo),
            "faltando": faltando(cid, ciclo),
        })

    def api_salvar(self, token):
        link, err = self.link_valido(token)
        if err:
            return self.erro(err, 403)
        cid, ciclo = link["cliente_id"], link["ciclo"]
        row = db().execute("SELECT enviado_em FROM ciclos WHERE cliente_id=? AND ciclo=?",
                           (cid, ciclo)).fetchone()
        if row and row["enviado_em"]:
            return self.erro("Este diagnóstico já foi enviado e não pode mais ser alterado.", 403)
        payload = self.body()
        itens = payload.get("itens") or []
        qm = questions.question_map()
        conn = db()
        for it in itens:
            qid = it.get("qid")
            if qid not in qm:
                continue
            valor = json.dumps(it.get("valor"), ensure_ascii=False)
            ant = conn.execute("SELECT valor FROM respostas WHERE cliente_id=? AND ciclo=? "
                               "AND qid=?", (cid, ciclo, qid)).fetchone()
            if ant and ant["valor"] == valor:
                continue
            conn.execute(
                "INSERT INTO respostas(cliente_id,ciclo,qid,valor,atualizado_em) VALUES(?,?,?,?,?) "
                "ON CONFLICT(cliente_id,ciclo,qid) DO UPDATE SET valor=excluded.valor, "
                "atualizado_em=excluded.atualizado_em", (cid, ciclo, qid, valor, now()))
            conn.execute("INSERT INTO historico(cliente_id,ciclo,qid,anterior,novo,em) "
                         "VALUES(?,?,?,?,?,?)",
                         (cid, ciclo, qid, ant["valor"] if ant else None, valor, now()))
        if payload.get("preenchido_por"):
            conn.execute("UPDATE links SET preenchido_por=? WHERE token=?",
                         (str(payload["preenchido_por"])[:120], token))
        conn.commit()
        return self.json({"ok": True, "salvo_em": now(),
                          "progresso": calcular_progresso(cid, ciclo)})

    def api_upload(self, token):
        link, err = self.link_valido(token)
        if err:
            return self.erro(err, 403)
        cid, ciclo = link["cliente_id"], link["ciclo"]
        b = self.body()
        nome = (b.get("nome") or "arquivo")[:160]
        dados = b.get("dados") or ""
        if "," in dados[:120]:
            dados = dados.split(",", 1)[1]
        try:
            bin_ = base64.b64decode(dados)
        except Exception:
            return self.erro("Arquivo inválido.")
        if len(bin_) > MAX_UPLOAD:
            return self.erro("O arquivo passa de 20 MB. Comprima ou envie em partes.")
        if not bin_:
            return self.erro("Arquivo vazio.")
        aid = secrets.token_urlsafe(12)
        pasta = UPLOAD_DIR / cid / slug(ciclo)
        pasta.mkdir(parents=True, exist_ok=True)
        seguro = re.sub(r"[^\w\.\- ]", "_", nome)[:120]
        destino = pasta / f"{aid}__{seguro}"
        destino.write_bytes(bin_)
        db().execute("INSERT INTO anexos(id,cliente_id,ciclo,nome,tipo,tamanho,arquivo,"
                     "enviado_em,origem) VALUES(?,?,?,?,?,?,?,?,?)",
                     (aid, cid, ciclo, nome, b.get("tipo") or "", len(bin_),
                      str(destino.relative_to(DATA_DIR)), now(), "cliente"))
        db().commit()
        return self.json({"ok": True, "anexos": anexos_de(cid, ciclo)})

    def api_remover_anexo(self, token):
        link, err = self.link_valido(token)
        if err:
            return self.erro(err, 403)
        aid = (self.body() or {}).get("id")
        r = db().execute("SELECT * FROM anexos WHERE id=? AND cliente_id=? AND ciclo=?",
                         (aid, link["cliente_id"], link["ciclo"])).fetchone()
        if not r:
            return self.erro("Anexo não encontrado.", 404)
        try:
            (DATA_DIR / r["arquivo"]).unlink(missing_ok=True)
        except Exception:
            pass
        db().execute("DELETE FROM anexos WHERE id=?", (aid,))
        db().commit()
        return self.json({"ok": True, "anexos": anexos_de(link["cliente_id"], link["ciclo"])})

    def api_enviar(self, token):
        link, err = self.link_valido(token)
        if err:
            return self.erro(err, 403)
        cid, ciclo = link["cliente_id"], link["ciclo"]
        falta = faltando(cid, ciclo)
        if falta:
            return self.json({"ok": False, "faltando": falta}, 200)
        db().execute("UPDATE ciclos SET status='Enviado pelo cliente', enviado_em=? "
                     "WHERE cliente_id=? AND ciclo=?", (now(), cid, ciclo))
        db().commit()
        calcular_progresso(cid, ciclo)
        return self.json({"ok": True, "enviado_em": now()})

    def api_baixar_anexo(self, aid):
        r = db().execute("SELECT * FROM anexos WHERE id=?", (aid,)).fetchone()
        if not r:
            return self._send(404, "não encontrado", "text/plain; charset=utf-8")
        autorizado = bool(self.admin_user())
        if not autorizado:
            tok = self.q1("token")
            if tok:
                link = db().execute("SELECT * FROM links WHERE token=?", (tok,)).fetchone()
                autorizado = bool(link and link["ativo"]
                                  and link["cliente_id"] == r["cliente_id"]
                                  and link["ciclo"] == r["ciclo"])
        if not autorizado:
            return self._send(403, "acesso negado", "text/plain; charset=utf-8")
        f = DATA_DIR / r["arquivo"]
        if not f.is_file():
            return self._send(404, "arquivo removido", "text/plain; charset=utf-8")
        ctype = r["tipo"] or mimetypes.guess_type(r["nome"])[0] or "application/octet-stream"
        nome = re.sub(r'[";\r\n]', "_", r["nome"])
        return self._send(200, f.read_bytes(), ctype,
                          {"Content-Disposition": f'attachment; filename="{nome}"'})

    # ---------------------------------------------------------------- admin
    def api_login(self):
        b = self.body()
        u = (b.get("usuario") or "").strip()
        s = b.get("senha") or ""
        time.sleep(0.35)
        if u != cfg_get("admin_usuario") or not verify_password(s, cfg_get("admin_hash")):
            return self.erro("Usuário ou senha inválidos.", 401)
        return self.json({"ok": True}, 200, {
            "Set-Cookie": f"eco_sess={sign_session(u)}; Path=/; Max-Age={SESSION_HOURS*3600};"
                          f"{self.cookie_seguro()} HttpOnly; SameSite=Lax"})

    def api_trocar_senha(self):
        b = self.body()
        if not verify_password(b.get("atual") or "", cfg_get("admin_hash")):
            return self.erro("Senha atual incorreta.", 403)
        nova = b.get("nova") or ""
        if len(nova) < 8:
            return self.erro("A nova senha precisa ter ao menos 8 caracteres.")
        cfg_set("admin_hash", hash_password(nova))
        if b.get("usuario"):
            cfg_set("admin_usuario", b["usuario"].strip())
        return self.json({"ok": True})

    def api_lista_clientes(self):
        mostrar_arquivados = self.q1("arquivados") == "1"
        rows = db().execute(
            "SELECT * FROM clientes WHERE arquivado = ? ORDER BY criado_em DESC",
            (1 if mostrar_arquivados else 0,)).fetchall()
        out = []
        for c in rows:
            ciclos = db().execute(
                "SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid", (c["id"],)).fetchall()
            links = db().execute(
                "SELECT token, ciclo, ativo, ultimo_acesso, acessos, preenchido_por, expira_em "
                "FROM links WHERE cliente_id=? ORDER BY rowid", (c["id"],)).fetchall()
            atual = ciclos[-1] if ciclos else None
            nanexos = db().execute("SELECT COUNT(*) n FROM anexos WHERE cliente_id=?",
                                   (c["id"],)).fetchone()["n"]
            out.append({**dict(c),
                        "ja_enviou": any(x["enviado_em"] for x in ciclos),
                        "ciclos": [dict(x) for x in ciclos],
                        "links": [dict(x) for x in links],
                        "ciclo_atual": atual["ciclo"] if atual else "-",
                        "status": atual["status"] if atual else "Não iniciado",
                        "progresso": atual["progresso"] if atual else 0,
                        "enviado_em": atual["enviado_em"] if atual else None,
                        "anexos": nanexos})
        return self.json({"clientes": out, "ciclos": questions.CICLOS,
                          "status_possiveis": questions.STATUS})

    def api_criar_cliente(self):
        b = self.body()
        empresa = (b.get("empresa") or "").strip()
        if not empresa:
            return self.erro("Informe o nome da empresa.")
        cid = f"{slug(empresa)}-{secrets.token_hex(3)}"
        ciclo = b.get("ciclo") or questions.CICLOS[0]
        dias = int(b.get("validade_dias") or 0)
        expira = (datetime.now() + timedelta(days=dias)).isoformat(timespec="seconds") if dias else None
        conn = db()
        conn.execute("INSERT INTO clientes(id,empresa,responsavel,cargo,segmento,contato,"
                     "email,criado_em) VALUES(?,?,?,?,?,?,?,?)",
                     (cid, empresa, b.get("responsavel", ""), b.get("cargo", ""),
                      b.get("segmento", ""), b.get("contato", ""), b.get("email", ""), now()))
        token = novo_token()
        conn.execute("INSERT INTO links(token,cliente_id,ciclo,criado_em,expira_em) "
                     "VALUES(?,?,?,?,?)", (token, cid, ciclo, now(), expira))
        conn.execute("INSERT INTO ciclos(cliente_id,ciclo,criado_em) VALUES(?,?,?)",
                     (cid, ciclo, now()))
        # pre-preenche identificacao com o que a B3 Sales ja sabe
        pre = {"emp_nome": empresa, "emp_responsavel": b.get("responsavel", ""),
               "emp_segmento": b.get("segmento", ""), "emp_contato": b.get("contato", ""),
               "emp_email": b.get("email", ""), "emp_cargo": b.get("cargo", "")}
        for qid, val in pre.items():
            if val:
                conn.execute("INSERT OR IGNORE INTO respostas(cliente_id,ciclo,qid,valor,"
                             "atualizado_em) VALUES(?,?,?,?,?)",
                             (cid, ciclo, qid, json.dumps({"v": val}, ensure_ascii=False), now()))
        conn.commit()
        calcular_progresso(cid, ciclo)
        return self.json({"ok": True, "id": cid, "token": token})

    def api_editar_cliente(self):
        b = self.body()
        cid = b.get("id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        campos = ["empresa", "responsavel", "cargo", "segmento", "contato", "email",
                  "obs_internas"]
        sets, vals = [], []
        for k in campos:
            if k in b:
                sets.append(f"{k}=?")
                vals.append(b[k])
        if b.get("arquivado") is not None:
            sets.append("arquivado=?")
            vals.append(1 if b["arquivado"] else 0)
        if sets:
            vals.append(cid)
            db().execute(f"UPDATE clientes SET {', '.join(sets)} WHERE id=?", vals)
            db().commit()
        return self.json({"ok": True})

    def api_excluir_cliente(self):
        """Remove o cliente, todos os ciclos, respostas e anexos. Nao ha volta."""
        b = self.body()
        cid = b.get("id")
        c = cliente_dict(cid)
        if not c:
            return self.erro("Cliente não encontrado.", 404)
        if (b.get("confirmacao") or "").strip() != c["empresa"]:
            return self.erro("Para excluir, digite o nome da empresa exatamente como cadastrado.")
        pasta = UPLOAD_DIR / cid
        if pasta.is_dir():
            for f in sorted(pasta.rglob("*"), reverse=True):
                try:
                    f.unlink() if f.is_file() else f.rmdir()
                except OSError:
                    pass
            try:
                pasta.rmdir()
            except OSError:
                pass
        conn = db()
        for tabela in ("respostas", "historico", "anexos", "analises", "ciclos", "links"):
            conn.execute(f"DELETE FROM {tabela} WHERE cliente_id=?", (cid,))
        conn.execute("DELETE FROM clientes WHERE id=?", (cid,))
        conn.commit()
        return self.json({"ok": True})

    def api_link(self):
        b = self.body()
        acao = b.get("acao")
        token = b.get("token")
        if acao == "novo":
            cid, ciclo = b.get("cliente_id"), b.get("ciclo")
            if not cliente_dict(cid):
                return self.erro("Cliente não encontrado.", 404)
            garantir_ciclo(cid, ciclo)
            db().execute("UPDATE links SET ativo=0 WHERE cliente_id=? AND ciclo=?", (cid, ciclo))
            t = novo_token()
            dias = int(b.get("validade_dias") or 0)
            expira = (datetime.now() + timedelta(dias=dias)).isoformat(timespec="seconds") if dias else None
            db().execute("INSERT INTO links(token,cliente_id,ciclo,criado_em,expira_em) "
                         "VALUES(?,?,?,?,?)", (t, cid, ciclo, now(), expira))
            db().commit()
            return self.json({"ok": True, "token": t})
        if acao in ("desativar", "ativar"):
            db().execute("UPDATE links SET ativo=? WHERE token=?",
                         (0 if acao == "desativar" else 1, token))
            db().commit()
            return self.json({"ok": True})
        return self.erro("Ação inválida.")

    def api_novo_ciclo(self):
        b = self.body()
        cid, ciclo = b.get("cliente_id"), b.get("ciclo")
        if ciclo not in questions.CICLOS:
            return self.erro("Ciclo inválido.")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        existe = db().execute("SELECT 1 FROM ciclos WHERE cliente_id=? AND ciclo=?",
                              (cid, ciclo)).fetchone()
        if existe:
            return self.erro("Este ciclo já existe para o cliente.")
        garantir_ciclo(cid, ciclo)
        if b.get("copiar_de"):
            copiadas = db().execute(
                "SELECT qid, valor FROM respostas WHERE cliente_id=? AND ciclo=?",
                (cid, b["copiar_de"])).fetchall()
            for r in copiadas:
                db().execute("INSERT OR IGNORE INTO respostas(cliente_id,ciclo,qid,valor,"
                             "atualizado_em) VALUES(?,?,?,?,?)",
                             (cid, ciclo, r["qid"], r["valor"], now()))
            if copiadas:
                # o ciclo ja nasce preenchido: falta o cliente revisar e concluir
                db().execute("UPDATE ciclos SET status=? WHERE cliente_id=? AND ciclo=?",
                             ("Aguardando conclusão", cid, ciclo))
        t = novo_token()
        db().execute("INSERT INTO links(token,cliente_id,ciclo,criado_em) VALUES(?,?,?,?)",
                     (t, cid, ciclo, now()))
        db().commit()
        calcular_progresso(cid, ciclo)
        return self.json({"ok": True, "token": t})

    def api_admin_cliente(self, cid):
        c = cliente_dict(cid)
        if not c:
            return self.erro("Cliente não encontrado.", 404)
        ciclo = self.q1("ciclo")
        ciclos = [dict(r) for r in db().execute(
            "SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid", (cid,)).fetchall()]
        if not ciclos:
            garantir_ciclo(cid, questions.CICLOS[0])
            ciclos = [dict(r) for r in db().execute(
                "SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid", (cid,)).fetchall()]
        if ciclo not in [x["ciclo"] for x in ciclos]:
            ciclo = ciclos[-1]["ciclo"]
        calcular_progresso(cid, ciclo)
        ciclos = [dict(r) for r in db().execute(
            "SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid", (cid,)).fetchall()]
        ans = respostas_de(cid, ciclo)
        an = db().execute("SELECT * FROM analises WHERE cliente_id=? AND ciclo=?",
                          (cid, ciclo)).fetchone()
        links = [dict(r) for r in db().execute(
            "SELECT * FROM links WHERE cliente_id=? ORDER BY rowid", (cid,)).fetchall()]
        hist = [dict(r) for r in db().execute(
            "SELECT qid, anterior, novo, em FROM historico WHERE cliente_id=? AND ciclo=? "
            "ORDER BY id DESC LIMIT 60", (cid, ciclo)).fetchall()]
        return self.json({
            "cliente": c, "ciclo": ciclo, "ciclos": ciclos,
            "ciclos_possiveis": questions.CICLOS, "status_possiveis": questions.STATUS,
            "blocos": questions.BLOCKS, "respostas": ans,
            "anexos": anexos_de(cid, ciclo), "links": links,
            "analise": dict(an) if an else {"notas": "", "gargalos": "", "prioridades": "",
                                            "proximo_foco": ""},
            "score": analise.score(ans), "indicadores": analise.indicadores(ans),
            "nao_informados": analise.nao_informados(ans),
            "faltando": faltando(cid, ciclo), "historico": hist,
        })

    def api_salvar_analise(self):
        b = self.body()
        cid, ciclo = b.get("cliente_id"), b.get("ciclo")
        garantir_ciclo(cid, ciclo)
        db().execute(
            "INSERT INTO analises(cliente_id,ciclo,notas,gargalos,prioridades,proximo_foco,"
            "atualizado_em) VALUES(?,?,?,?,?,?,?) "
            "ON CONFLICT(cliente_id,ciclo) DO UPDATE SET notas=excluded.notas, "
            "gargalos=excluded.gargalos, prioridades=excluded.prioridades, "
            "proximo_foco=excluded.proximo_foco, atualizado_em=excluded.atualizado_em",
            (cid, ciclo, b.get("notas", ""), b.get("gargalos", ""), b.get("prioridades", ""),
             b.get("proximo_foco", ""), now()))
        db().commit()
        return self.json({"ok": True})

    def api_nota_anexo(self):
        b = self.body()
        db().execute("UPDATE anexos SET nota=? WHERE id=?", (b.get("nota", ""), b.get("id")))
        db().commit()
        return self.json({"ok": True})

    def api_set_status(self):
        b = self.body()
        if b.get("status") not in questions.STATUS:
            return self.erro("Status inválido.")
        set_status(b.get("cliente_id"), b.get("ciclo"), b["status"])
        return self.json({"ok": True})

    def api_comparar(self, cid):
        a, b = self.q1("a"), self.q1("b")
        ra, rb = respostas_de(cid, a), respostas_de(cid, b)
        sa, sb = analise.score(ra), analise.score(rb)
        ia = {x["nome"]: x for x in analise.indicadores(ra)}
        ib = {x["nome"]: x for x in analise.indicadores(rb)}
        linhas = []
        qm = questions.question_map()
        for _, q in questions.all_questions():
            if q["type"] not in ("number", "currency", "percent", "scale"):
                continue
            va = (ra.get(q["id"]) or {}).get("v")
            vb = (rb.get(q["id"]) or {}).get("v")
            if va in (None, "") and vb in (None, ""):
                continue
            try:
                fa, fb = float(va), float(vb)
                dif = fb - fa
                pct = (dif / fa * 100) if fa else None
            except (TypeError, ValueError):
                dif = pct = None
            linhas.append({"label": q["label"], "qid": q["id"], "a": va, "b": vb,
                           "dif": dif, "pct": pct})
        return self.json({"a": a, "b": b, "score_a": sa, "score_b": sb,
                          "indicadores_a": ia, "indicadores_b": ib, "linhas": linhas})

    def api_csv(self, cid):
        d = dump_cliente(cid)
        linhas = ["ciclo;bloco;pergunta;resposta;complemento;nao_informado;indicador_interno"]

        def esc(x):
            s = str(x if x is not None else "")
            if isinstance(x, (list, dict)):
                s = json.dumps(x, ensure_ascii=False)
            return '"' + s.replace('"', "'").replace("\n", " ") + '"'

        for c in d.get("ciclos", []):
            for r in c["respostas"]:
                linhas.append(";".join([esc(c["ciclo"]), esc(r["bloco"]), esc(r["pergunta"]),
                                        esc(r["resposta"]), esc(r["complemento"]),
                                        esc(r["nao_informado"]), esc(r["indicador_interno"])]))
        nome = slug(d.get("cliente", {}).get("empresa", "cliente"))
        return self._send(200, "﻿" + "\n".join(linhas), "text/csv; charset=utf-8",
                          {"Content-Disposition":
                           f'attachment; filename="diagnostico-eco-{nome}.csv"'})

    # ------------------------------------------------------- API por chave
    def chave_ok(self):
        k = self.q1("chave") or (self.headers.get("X-Eco-Chave") or "")
        return bool(k) and hmac.compare_digest(k, cfg_get("api_key") or "")

    def api_dados(self):
        if not self.chave_ok():
            return self.erro("Chave inválida ou ausente.", 403)
        cid = self.q1("cliente")
        if cid:
            return self.json(dump_cliente(cid))
        todos = [dump_cliente(r["id"]) for r in
                 db().execute("SELECT id FROM clientes ORDER BY criado_em DESC").fetchall()]
        return self.json({"total": len(todos), "clientes": todos, "gerado_em": now()})


def main():
    init_db()
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    srv = ThreadingHTTPServer((host, port), Handler)
    print("\n  DIAGNÓSTICO COMERCIAL ECO — Grupo B3 Sales")
    print("  " + "─" * 52)
    print(f"  Área interna : http://127.0.0.1:{port}/admin")
    print(f"  Usuário      : {cfg_get('admin_usuario')}")
    print(f"  Dados        : {DATA_DIR}")
    print("  " + "─" * 52)
    print("  Para encerrar, feche esta janela ou pressione Ctrl+C.\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor encerrado.\n")


if __name__ == "__main__":
    main()
