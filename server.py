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
import forms
import questions
import rota
import workspace

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("ECO_DATA_DIR") or (BASE_DIR / "data"))
WEB_DIR = BASE_DIR          # neste repositorio as telas ficam na raiz
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "eco.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD = 20 * 1024 * 1024          # 20 MB por arquivo do cliente
MAX_UPLOAD_ADMIN = 120 * 1024 * 1024   # 120 MB quando quem envia e a B3 Sales
MAX_BODY = 170 * 1024 * 1024           # margem para o base64
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

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY, usuario TEXT UNIQUE NOT NULL, nome TEXT DEFAULT '',
  email TEXT DEFAULT '', senha_hash TEXT NOT NULL, papel TEXT DEFAULT 'admin',
  ativo INTEGER DEFAULT 1, criado_em TEXT, ultimo_acesso TEXT);

CREATE TABLE IF NOT EXISTS perguntas_lib (
  id TEXT PRIMARY KEY, ciclo TEXT NOT NULL, bloco_id TEXT, qid TEXT NOT NULL,
  patch TEXT DEFAULT '{}', ordem INTEGER, removida INTEGER DEFAULT 0,
  atualizado_em TEXT, UNIQUE(ciclo, qid));

CREATE TABLE IF NOT EXISTS perguntas_cliente (
  cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL, qid TEXT NOT NULL,
  bloco_id TEXT, patch TEXT DEFAULT '{}', ordem INTEGER, removida INTEGER DEFAULT 0,
  atualizado_em TEXT, PRIMARY KEY(cliente_id, ciclo, qid),
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS form_snapshots (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL,
  json TEXT NOT NULL, criado_em TEXT,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS acoes (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, ciclo TEXT NOT NULL,
  pilar TEXT, regra TEXT, titulo TEXT NOT NULL, detalhe TEXT DEFAULT '',
  responsavel TEXT DEFAULT '', status TEXT DEFAULT 'Não iniciada',
  ordem INTEGER DEFAULT 0, origem TEXT DEFAULT 'auto',
  criado_em TEXT, atualizado_em TEXT,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS equipe (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, nome TEXT NOT NULL,
  email TEXT DEFAULT '', telefone TEXT DEFAULT '', funcao TEXT DEFAULT '',
  area TEXT DEFAULT '', nivel TEXT DEFAULT '', obs TEXT DEFAULT '',
  ativo INTEGER DEFAULT 1, ordem INTEGER DEFAULT 0, criado_em TEXT,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS ws_paginas (
  id TEXT PRIMARY KEY, cliente_id TEXT, titulo TEXT DEFAULT 'Nova página',
  capa TEXT DEFAULT '', icone TEXT DEFAULT '', pai_id TEXT,
  ordem INTEGER DEFAULT 0, visivel_cliente INTEGER DEFAULT 0,
  criado_em TEXT, atualizado_em TEXT);

CREATE TABLE IF NOT EXISTS ws_blocos (
  id TEXT PRIMARY KEY, pagina_id TEXT NOT NULL, tipo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0, conteudo TEXT DEFAULT '{}', atualizado_em TEXT,
  FOREIGN KEY(pagina_id) REFERENCES ws_paginas(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS ws_versoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, pagina_id TEXT NOT NULL,
  snapshot TEXT, em TEXT, usuario TEXT);

CREATE TABLE IF NOT EXISTS relatorios (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, ciclo TEXT,
  tipo TEXT DEFAULT 'ciclo', titulo TEXT DEFAULT '', conteudo TEXT DEFAULT '',
  publicado INTEGER DEFAULT 0, gerado_em TEXT, gerado_por TEXT,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS midia (
  id TEXT PRIMARY KEY, cliente_id TEXT, nome TEXT, tipo TEXT, categoria TEXT,
  tamanho INTEGER, arquivo TEXT, titulo TEXT DEFAULT '', descricao TEXT DEFAULT '',
  enviado_em TEXT, enviado_por TEXT);

CREATE INDEX IF NOT EXISTS ix_midia_cli ON midia(cliente_id);
CREATE INDEX IF NOT EXISTS ix_acoes_cli ON acoes(cliente_id, ciclo);
CREATE INDEX IF NOT EXISTS ix_equipe_cli ON equipe(cliente_id);
CREATE INDEX IF NOT EXISTS ix_ws_blocos_pag ON ws_blocos(pagina_id, ordem);
CREATE INDEX IF NOT EXISTS ix_ws_paginas_cli ON ws_paginas(cliente_id, ordem);
CREATE INDEX IF NOT EXISTS ix_snap_cli ON form_snapshots(cliente_id, ciclo);
"""

# Colunas acrescentadas depois da primeira versao do sistema.
# (tabela, coluna, definicao) — aplicadas so quando faltam.
COLUNAS_NOVAS = [
    ("links", "snapshot_id", "TEXT"),
    ("ciclos", "snapshot_id", "TEXT"),
    ("ciclos", "publicado_em", "TEXT"),
    ("ciclos", "objetivo", "TEXT DEFAULT ''"),
    ("clientes", "token_portal", "TEXT"),
    ("clientes", "tipo_servico", "TEXT DEFAULT ''"),
    ("clientes", "contrato_inicio", "TEXT"),
    ("clientes", "contrato_fim", "TEXT"),
    ("clientes", "contrato_midia_id", "TEXT"),
    ("clientes", "valor_contrato", "TEXT DEFAULT ''"),
    ("clientes", "portal_ativo", "INTEGER DEFAULT 0"),
]


def migrar(conn):
    """Acrescenta colunas que faltam. Roda a cada boot, sem quebrar nada."""
    for tabela, coluna, ddl in COLUNAS_NOVAS:
        cols = {r["name"] for r in conn.execute(f"PRAGMA table_info({tabela})")}
        if not cols:
            continue
        if coluna not in cols:
            conn.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {ddl}")
    conn.commit()


def init_db():
    conn = db()
    conn.executescript(SCHEMA)
    conn.commit()
    migrar(conn)
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
    # o admin que sempre existiu passa a ser o primeiro usuario da tabela
    vazia = conn.execute("SELECT COUNT(*) n FROM usuarios").fetchone()["n"] == 0
    if vazia and cfg_get("admin_hash"):
        conn.execute("INSERT OR IGNORE INTO usuarios(id,usuario,nome,senha_hash,papel,"
                     "criado_em) VALUES(?,?,?,?,?,?)",
                     (secrets.token_hex(8), cfg_get("admin_usuario") or "b3sales",
                      "Administradora", cfg_get("admin_hash"), "dona", now()))
        conn.commit()


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


def form_do(cliente_id: str, ciclo: str) -> list:
    """O formulario daquele cliente naquele ciclo, ja congelado se publicado."""
    return forms.do_ciclo(db(), cliente_id, ciclo)


def mapa_do(cliente_id: str, ciclo: str) -> dict:
    return {q["id"]: (b, q) for b in form_do(cliente_id, ciclo) for q in b["questions"]}


def perguntas_do(cliente_id: str, ciclo: str):
    for b in form_do(cliente_id, ciclo):
        for q in b["questions"]:
            yield b, q


def form_cliente(cliente_id: str, ciclo: str) -> list:
    """A mesma coisa, sem nenhum campo interno da B3 Sales."""
    out = []
    for b in form_do(cliente_id, ciclo):
        qs = [{k: v for k, v in q.items() if k != "admin"} for q in b["questions"]]
        out.append({**b, "questions": qs})
    return out


def calcular_progresso(cliente_id: str, ciclo: str) -> int:
    ans = respostas_de(cliente_id, ciclo)
    todas = [q for _, q in perguntas_do(cliente_id, ciclo)
             if q["type"] != "files" and visivel(q, ans)]
    feitas = sum(1 for q in todas if preenchida(ans.get(q["id"])))
    p = round(feitas / len(todas) * 100) if todas else 0
    db().execute("UPDATE ciclos SET progresso=? WHERE cliente_id=? AND ciclo=?",
                 (p, cliente_id, ciclo))
    db().commit()
    return p


def faltando(cliente_id: str, ciclo: str):
    ans = respostas_de(cliente_id, ciclo)
    qm = mapa_do(cliente_id, ciclo)
    out = []
    for qid in [q["id"] for _, q in perguntas_do(cliente_id, ciclo) if q.get("required")]:
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
    ciclos = []
    for row in db().execute("SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid",
                            (cid,)).fetchall():
        ciclo = row["ciclo"]
        qm = mapa_do(cid, ciclo)
        ans = respostas_de(cid, ciclo)
        legivel = []
        for b, q in perguntas_do(cid, ciclo):
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
            "dados_nao_acompanhados": analise.nao_informados(ans, ciclo),
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
        if p.startswith("/c/"):
            return self._send(200, (WEB_DIR / "portal.html").read_bytes())
        if p.startswith("/static/"):
            return self.static(p[len("/static/"):])
        if p == "/saude":
            return self.json({"ok": True, "em": now()})

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
        m = re.fullmatch(r"/api/c/([\w\-]+)", p)
        if m:
            return self.api_portal(m.group(1))
        m = re.fullmatch(r"/api/c/([\w\-]+)/pagina/([\w\-]+)", p)
        if m:
            return self.api_portal_pagina(m.group(1), m.group(2))
        if p == "/api/admin/midia":
            if not self.exige_admin():
                return
            return self.api_midia()
        if p == "/api/admin/metodologia":
            if not self.exige_admin():
                return
            return self.api_metodologia()
        m = re.fullmatch(r"/api/admin/ws/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_ws(m.group(1))
        m = re.fullmatch(r"/api/admin/ws-pagina/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_ws_pagina(m.group(1))
        if p == "/api/admin/painel":
            if not self.exige_admin():
                return
            return self.api_painel()
        if p == "/api/admin/usuarios":
            if not self.exige_admin():
                return
            return self.api_usuarios()
        m = re.fullmatch(r"/api/admin/rota/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_rota(m.group(1))
        m = re.fullmatch(r"/api/admin/equipe/([\w\-]+)", p)
        if m:
            if not self.exige_admin():
                return
            return self.api_equipe(m.group(1))

        # -------- anexos
        m = re.fullmatch(r"/api/midia/([\w\-]+)", p)
        if m:
            return self.api_baixar_midia(m.group(1))
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
        if p == "/api/admin/usuario-salvar":
            return self.api_usuario_salvar()
        if p == "/api/admin/usuario-excluir":
            return self.api_usuario_excluir()
        if p == "/api/admin/portal":
            return self.api_portal_config()
        if p == "/api/admin/midia-enviar":
            return self.api_midia_enviar()
        if p == "/api/admin/midia-excluir":
            return self.api_midia_excluir()
        if p == "/api/admin/metodologia-modelo":
            return self.api_metodologia_modelo()
        if p == "/api/admin/ws-copiar":
            return self.api_ws_copiar()
        if p == "/api/admin/ws-pagina":
            return self.api_ws_pagina_salvar()
        if p == "/api/admin/ws-pagina-excluir":
            return self.api_ws_pagina_excluir()
        if p == "/api/admin/ws-modelo":
            return self.api_ws_modelo()
        if p == "/api/admin/ws-bloco-novo":
            return self.api_ws_bloco_novo()
        if p == "/api/admin/ws-bloco":
            return self.api_ws_bloco_salvar()
        if p == "/api/admin/ws-bloco-mover":
            return self.api_ws_bloco_mover()
        if p == "/api/admin/ws-bloco-excluir":
            return self.api_ws_bloco_excluir()
        if p == "/api/admin/rota-gerar":
            return self.api_rota_gerar()
        if p == "/api/admin/acao-salvar":
            return self.api_acao_salvar()
        if p == "/api/admin/acao-excluir":
            return self.api_acao_excluir()
        if p == "/api/admin/equipe-salvar":
            return self.api_equipe_salvar()
        if p == "/api/admin/equipe-excluir":
            return self.api_equipe_excluir()
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
            "titulo_ciclo": questions.titulo_do_ciclo(ciclo),
            "abertura": questions.abertura_do_ciclo(ciclo),
            "eh_acompanhamento": ciclo != questions.CICLOS[0],
            "blocos": form_cliente(cid, ciclo),
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
        qm = mapa_do(cid, ciclo)
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
        row = db().execute("SELECT * FROM usuarios WHERE usuario=? AND ativo=1",
                           (u,)).fetchone()
        if row and verify_password(s, row["senha_hash"]):
            db().execute("UPDATE usuarios SET ultimo_acesso=? WHERE id=?", (now(), row["id"]))
            db().commit()
        elif u == cfg_get("admin_usuario") and verify_password(s, cfg_get("admin_hash")):
            pass  # conta antiga, de antes da tabela de usuarios
        else:
            return self.erro("Usuário ou senha inválidos.", 401)
        return self.json({"ok": True}, 200, {
            "Set-Cookie": f"eco_sess={sign_session(u)}; Path=/; Max-Age={SESSION_HOURS*3600};"
                          f"{self.cookie_seguro()} HttpOnly; SameSite=Lax"})

    def api_trocar_senha(self):
        b = self.body()
        eu = self.admin_user()
        row = db().execute("SELECT * FROM usuarios WHERE usuario=?", (eu,)).fetchone()
        hash_atual = row["senha_hash"] if row else cfg_get("admin_hash")
        if not verify_password(b.get("atual") or "", hash_atual):
            return self.erro("Senha atual incorreta.", 403)
        nova = b.get("nova") or ""
        if len(nova) < 8:
            return self.erro("A nova senha precisa ter ao menos 8 caracteres.")
        novo_hash = hash_password(nova)
        novo_user = (b.get("usuario") or "").strip() or eu
        if row:
            db().execute("UPDATE usuarios SET senha_hash=?, usuario=? WHERE id=?",
                         (novo_hash, novo_user, row["id"]))
        cfg_set("admin_hash", novo_hash)
        if b.get("usuario"):
            cfg_set("admin_usuario", novo_user)
        db().commit()
        return self.json({"ok": True, "usuario": novo_user})

    # ------------------------------------------------------------ usuarios
    def api_usuarios(self):
        rows = db().execute(
            "SELECT id,usuario,nome,email,papel,ativo,criado_em,ultimo_acesso "
            "FROM usuarios ORDER BY criado_em").fetchall()
        return self.json({"usuarios": [dict(r) for r in rows],
                          "eu": self.admin_user()})

    def api_usuario_salvar(self):
        b = self.body()
        uid = b.get("id")
        usuario = (b.get("usuario") or "").strip()
        if not usuario:
            return self.erro("Informe o nome de acesso.")
        if uid:
            sets = ["usuario=?", "nome=?", "email=?", "papel=?", "ativo=?"]
            vals = [usuario, b.get("nome", ""), b.get("email", ""),
                    b.get("papel") or "admin", 1 if b.get("ativo", 1) else 0]
            if b.get("senha"):
                if len(b["senha"]) < 8:
                    return self.erro("A senha precisa ter ao menos 8 caracteres.")
                sets.append("senha_hash=?")
                vals.append(hash_password(b["senha"]))
            vals.append(uid)
            db().execute(f"UPDATE usuarios SET {', '.join(sets)} WHERE id=?", vals)
        else:
            if len(b.get("senha") or "") < 8:
                return self.erro("A senha precisa ter ao menos 8 caracteres.")
            ja = db().execute("SELECT 1 FROM usuarios WHERE usuario=?", (usuario,)).fetchone()
            if ja:
                return self.erro("Já existe alguém com esse nome de acesso.")
            db().execute("INSERT INTO usuarios(id,usuario,nome,email,senha_hash,papel,"
                         "criado_em) VALUES(?,?,?,?,?,?,?)",
                         (secrets.token_hex(8), usuario, b.get("nome", ""),
                          b.get("email", ""), hash_password(b["senha"]),
                          b.get("papel") or "admin", now()))
        db().commit()
        return self.json({"ok": True})

    # ------------------------------------------------------- modo cliente
    def api_portal_config(self):
        """Liga ou desliga o portal do cliente e devolve o endereço."""
        b = self.body()
        cid = b.get("cliente_id")
        c = cliente_dict(cid)
        if not c:
            return self.erro("Cliente não encontrado.", 404)
        token = c.get("token_portal")
        if b.get("acao") == "novo" or not token:
            token = novo_token()
            db().execute("UPDATE clientes SET token_portal=? WHERE id=?", (token, cid))
        ativo = 1 if b.get("ativo", True) else 0
        db().execute("UPDATE clientes SET portal_ativo=? WHERE id=?", (ativo, cid))
        db().commit()
        return self.json({"ok": True, "token": token, "ativo": ativo})

    def portal_dados(self, token):
        """O que o cliente vê. Nada de score, gargalo ou observação interna."""
        c = db().execute("SELECT * FROM clientes WHERE token_portal=? AND portal_ativo=1",
                         (token,)).fetchone()
        if not c:
            return None
        cid = c["id"]
        ciclos = []
        for r in db().execute("SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid",
                              (cid,)):
            ciclo = r["ciclo"]
            feitas = [dict(x) for x in db().execute(
                "SELECT titulo, pilar, status FROM acoes WHERE cliente_id=? AND ciclo=? "
                "ORDER BY ordem", (cid, ciclo))]
            docs = db().execute("SELECT COUNT(*) n FROM anexos WHERE cliente_id=? AND ciclo=?",
                                (cid, ciclo)).fetchone()["n"]
            ciclos.append({
                "ciclo": ciclo,
                "titulo": questions.titulo_do_ciclo(ciclo),
                "objetivo": r["objetivo"] or "",
                "enviado_em": r["enviado_em"],
                "concluido": bool(r["enviado_em"]),
                "progresso": r["progresso"] or 0,
                "entregas": [{"titulo": a["titulo"],
                              "pilar": analise.PILARES.get(a["pilar"] or "", ""),
                              "feito": a["status"] == "Concluída"}
                             for a in feitas if a["status"] != "Cancelada"],
                "documentos": docs,
            })
        paginas = [dict(r) for r in db().execute(
            "SELECT id, titulo, capa, ordem FROM ws_paginas WHERE cliente_id=? "
            "AND visivel_cliente=1 ORDER BY ordem", (cid,))]
        total_acoes = db().execute(
            "SELECT COUNT(*) n FROM acoes WHERE cliente_id=? AND status!='Cancelada'",
            (cid,)).fetchone()["n"]
        feitas = db().execute(
            "SELECT COUNT(*) n FROM acoes WHERE cliente_id=? AND status='Concluída'",
            (cid,)).fetchone()["n"]
        return {
            "empresa": c["empresa"], "responsavel": c["responsavel"] or "",
            "ciclos": ciclos, "paginas": paginas,
            "resumo": {"entregas": total_acoes, "concluidas": feitas,
                       "documentos": db().execute(
                           "SELECT COUNT(*) n FROM anexos WHERE cliente_id=?",
                           (cid,)).fetchone()["n"],
                       "materiais": len(paginas),
                       "ciclos_feitos": len([x for x in ciclos if x["concluido"]])},
            "evolucao": self.portal_evolucao(cid),
        }

    def portal_evolucao(self, cid):
        """Compara os números do Dia 0 com o ciclo mais recente que tenha número."""
        base = respostas_de(cid, questions.CICLOS[0])
        ini = {x["nome"]: x for x in analise.indicadores(base)}
        if not ini:
            return []
        saida = []
        for nome, x in ini.items():
            saida.append({"nome": nome, "inicio": x["valor"], "ref": x.get("ref") or ""})
        return saida[:6]

    def api_portal(self, token):
        d = self.portal_dados(token)
        if not d:
            return self.erro("Este acompanhamento não está disponível.", 404)
        return self.json(d)

    def api_portal_pagina(self, token, pid):
        d = db().execute(
            "SELECT p.* FROM ws_paginas p JOIN clientes c ON c.id = p.cliente_id "
            "WHERE c.token_portal=? AND c.portal_ativo=1 AND p.id=? AND p.visivel_cliente=1",
            (token, pid)).fetchone()
        if not d:
            return self.erro("Página não disponível.", 404)
        pag = workspace.ler_pagina(db(), pid)
        pag["anexos"] = [dict(r) for r in db().execute(
            "SELECT id, nome, tipo FROM anexos WHERE cliente_id=?", (d["cliente_id"],))]
        pag.pop("cliente_id", None)
        return self.json(pag)

    # ------------------------------------------------- biblioteca de mídia
    def api_midia(self):
        """Arquivos enviados pela B3 Sales. Sem cliente = biblioteca geral."""
        cid = self.q1("cliente")
        cat = self.q1("categoria")
        sql = "SELECT * FROM midia WHERE 1=1"
        args = []
        if cid:
            # dentro de um cliente valem os dele e os da biblioteca geral
            sql += " AND (cliente_id=? OR cliente_id IS NULL)"
            args.append(cid)
        else:
            sql += " AND cliente_id IS NULL"
        if cat:
            sql += " AND categoria=?"
            args.append(cat)
        sql += " ORDER BY enviado_em DESC LIMIT 300"
        arquivos = [dict(r) for r in db().execute(sql, args)]
        if cid:
            # e tambem o que o proprio cliente mandou no diagnostico
            for r in db().execute("SELECT id, nome, tipo, tamanho, ciclo FROM anexos "
                                  "WHERE cliente_id=? ORDER BY enviado_em DESC", (cid,)):
                d = dict(r)
                d["categoria"] = "diagnostico"
                d["origem_tabela"] = "anexos"
                arquivos.append(d)
        return self.json({"arquivos": arquivos})

    def api_midia_enviar(self):
        b = self.body()
        nome = (b.get("nome") or "arquivo")[:180]
        dados = b.get("dados") or ""
        if "," in dados[:200]:
            dados = dados.split(",", 1)[1]
        try:
            bin_ = base64.b64decode(dados)
        except Exception:
            return self.erro("Arquivo inválido.")
        if not bin_:
            return self.erro("Arquivo vazio.")
        if len(bin_) > MAX_UPLOAD_ADMIN:
            return self.erro("O arquivo passa de 120 MB. Para vídeo longo, use o bloco "
                             "de vídeo com o link do Panda, YouTube ou Vimeo: fica mais "
                             "leve e carrega melhor para quem assiste.")
        cid = b.get("cliente_id") or None
        if cid and not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        mid = secrets.token_urlsafe(12)
        pasta = UPLOAD_DIR / (cid or "_biblioteca")
        pasta.mkdir(parents=True, exist_ok=True)
        seguro = re.sub(r"[^\w\.\- ]", "_", nome)[:120]
        destino = pasta / f"{mid}__{seguro}"
        destino.write_bytes(bin_)
        db().execute("INSERT INTO midia(id,cliente_id,nome,tipo,categoria,tamanho,arquivo,"
                     "titulo,descricao,enviado_em,enviado_por) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                     (mid, cid, nome, b.get("tipo") or "", b.get("categoria") or "material",
                      len(bin_), str(destino.relative_to(DATA_DIR)),
                      b.get("titulo", ""), b.get("descricao", ""), now(),
                      self.admin_user() or ""))
        db().commit()
        return self.json({"ok": True, "id": mid, "nome": nome,
                          "tipo": b.get("tipo") or "", "tamanho": len(bin_)})

    def api_midia_excluir(self):
        b = self.body()
        r = db().execute("SELECT * FROM midia WHERE id=?", (b.get("id"),)).fetchone()
        if not r:
            return self.erro("Arquivo não encontrado.", 404)
        try:
            (DATA_DIR / r["arquivo"]).unlink(missing_ok=True)
        except Exception:
            pass
        db().execute("DELETE FROM midia WHERE id=?", (b["id"],))
        db().commit()
        return self.json({"ok": True})

    def api_baixar_midia(self, mid):
        r = db().execute("SELECT * FROM midia WHERE id=?", (mid,)).fetchone()
        if not r:
            return self.erro("Arquivo não encontrado.", 404)
        f = DATA_DIR / r["arquivo"]
        if not f.is_file():
            return self.erro("Arquivo não está mais no servidor.", 404)
        tipo = r["tipo"] or mimetypes.guess_type(r["nome"])[0] or "application/octet-stream"
        # imagem, audio e video abrem na propria pagina; o resto baixa
        inline = tipo.split("/")[0] in ("image", "audio", "video") or tipo == "application/pdf"
        disp = "inline" if inline else "attachment"
        return self._send(200, f.read_bytes(), tipo, {
            "Content-Disposition": f'{disp}; filename="{r["nome"]}"',
            "Cache-Control": "private, max-age=86400"})

    # ------------------------------------------------------ metodologia
    def api_metodologia(self):
        """A base reutilizável da B3 Sales. Páginas sem dono."""
        return self.json({
            "paginas": workspace.listar_metodologia(db()),
            "tipos": [{"id": k, "nome": v[0], "icone": v[1]}
                      for k, v in workspace.TIPOS.items()],
            "capas": workspace.CAPAS,
        })

    def api_metodologia_modelo(self):
        criadas = workspace.montar_metodologia(db(), now())
        return self.json({"ok": True, "criadas": len(criadas)})

    def api_ws_copiar(self):
        """Traz uma página da metodologia para dentro de um cliente."""
        b = self.body()
        cid = b.get("cliente_id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        novo = workspace.copiar_para_cliente(db(), b.get("pagina_id"), cid, now())
        if not novo:
            return self.erro("Página não encontrada.", 404)
        return self.json({"ok": True, "id": novo})

    # ------------------------------------------------- espaço de materiais
    def api_ws(self, cid):
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        return self.json({
            "paginas": workspace.listar_paginas(db(), cid),
            "tipos": [{"id": k, "nome": v[0], "icone": v[1]}
                      for k, v in workspace.TIPOS.items()],
            "capas": workspace.CAPAS,
        })

    def api_ws_pagina(self, pid):
        p = workspace.ler_pagina(db(), pid)
        if not p:
            return self.erro("Página não encontrada.", 404)
        # o que da para inserir na pagina: a biblioteca da casa, o que a B3 Sales
        # enviou para este cliente, e o que o proprio cliente anexou no diagnostico.
        arquivos = []
        if p["cliente_id"]:
            for r in db().execute(
                    "SELECT id,nome,tipo,tamanho,categoria FROM midia "
                    "WHERE cliente_id=? OR cliente_id IS NULL ORDER BY enviado_em DESC",
                    (p["cliente_id"],)):
                arquivos.append({**dict(r), "origem_tabela": "midia"})
            for r in db().execute(
                    "SELECT id,nome,tipo,tamanho,ciclo FROM anexos WHERE cliente_id=? "
                    "ORDER BY enviado_em DESC", (p["cliente_id"],)):
                arquivos.append({**dict(r), "categoria": "diagnóstico",
                                 "origem_tabela": "anexos"})
        else:
            for r in db().execute("SELECT id,nome,tipo,tamanho,categoria FROM midia "
                                  "WHERE cliente_id IS NULL ORDER BY enviado_em DESC"):
                arquivos.append({**dict(r), "origem_tabela": "midia"})
        p["arquivos"] = arquivos
        p["subpaginas"] = [dict(r) for r in db().execute(
            "SELECT id, titulo, capa FROM ws_paginas WHERE pai_id=? ORDER BY ordem",
            (pid,))]
        return self.json(p)

    def api_ws_pagina_salvar(self):
        b = self.body()
        conn = db()
        if b.get("id"):
            sets, vals = [], []
            for k in ("titulo", "capa", "icone", "visivel_cliente", "ordem", "pai_id"):
                if k in b:
                    sets.append(f"{k}=?")
                    vals.append(int(b[k]) if k in ("visivel_cliente", "ordem") else b[k])
            if sets:
                sets.append("atualizado_em=?")
                vals += [now(), b["id"]]
                conn.execute(f"UPDATE ws_paginas SET {', '.join(sets)} WHERE id=?", vals)
                conn.commit()
            return self.json({"ok": True, "id": b["id"]})
        cid = b.get("cliente_id") or None
        # sem cliente, a página entra na metodologia da casa
        if cid and not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        pid = workspace.criar_pagina(conn, cid, (b.get("titulo") or "Nova página").strip(),
                                     now(), b.get("capa", ""))
        if b.get("pai_id"):
            conn.execute("UPDATE ws_paginas SET pai_id=? WHERE id=?", (b["pai_id"], pid))
            conn.commit()
        return self.json({"ok": True, "id": pid})

    def api_ws_modelo(self):
        b = self.body()
        cid = b.get("cliente_id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        criadas = workspace.montar_modelo(db(), cid, now())
        return self.json({"ok": True, "criadas": len(criadas)})

    def api_ws_pagina_excluir(self):
        b = self.body()
        conn = db()
        conn.execute("DELETE FROM ws_blocos WHERE pagina_id=?", (b.get("id"),))
        conn.execute("DELETE FROM ws_versoes WHERE pagina_id=?", (b.get("id"),))
        conn.execute("DELETE FROM ws_paginas WHERE id=?", (b.get("id"),))
        conn.commit()
        return self.json({"ok": True})

    def api_ws_bloco_novo(self):
        b = self.body()
        bid = workspace.novo_bloco(db(), b.get("pagina_id"), b.get("tipo"), now(),
                                   b.get("depois_de"))
        if not bid:
            return self.erro("Tipo de bloco desconhecido.")
        return self.json({"ok": True, "id": bid})

    def api_ws_bloco_salvar(self):
        b = self.body()
        conn = db()
        conn.execute("UPDATE ws_blocos SET conteudo=?, atualizado_em=? WHERE id=?",
                     (json.dumps(b.get("conteudo") or {}, ensure_ascii=False),
                      now(), b.get("id")))
        r = conn.execute("SELECT pagina_id FROM ws_blocos WHERE id=?", (b.get("id"),)).fetchone()
        if r:
            workspace._tocar(conn, r["pagina_id"], now())
        conn.commit()
        return self.json({"ok": True})

    def api_ws_bloco_mover(self):
        b = self.body()
        ok = workspace.mover_bloco(db(), b.get("id"), b.get("direcao"), now())
        return self.json({"ok": ok})

    def api_ws_bloco_excluir(self):
        b = self.body()
        conn = db()
        r = conn.execute("SELECT pagina_id FROM ws_blocos WHERE id=?", (b.get("id"),)).fetchone()
        conn.execute("DELETE FROM ws_blocos WHERE id=?", (b.get("id"),))
        if r:
            workspace._tocar(conn, r["pagina_id"], now())
        conn.commit()
        return self.json({"ok": True})

    # ------------------------------------------------------ painel geral
    def api_painel(self):
        """Retrato da carteira. Mede processo implantado, não só faturamento."""
        conn = db()
        clientes = [dict(r) for r in conn.execute(
            "SELECT * FROM clientes ORDER BY criado_em DESC")]
        ativos = [c for c in clientes if not c["arquivado"]]
        ids = [c["id"] for c in ativos]

        por_ciclo = {c: 0 for c in questions.CICLOS}
        por_status = {}
        pilares = {"E": [], "C": [], "O": []}
        geral = []
        atrasados, sem_contato, jornada = [], [], []
        total_acoes = concluidas = 0
        hoje = datetime.now()

        for c in ativos:
            cid = c["id"]
            ciclos = [dict(r) for r in conn.execute(
                "SELECT * FROM ciclos WHERE cliente_id=? ORDER BY rowid", (cid,))]
            atual = ciclos[-1] if ciclos else None
            if atual:
                por_ciclo[atual["ciclo"]] = por_ciclo.get(atual["ciclo"], 0) + 1
                por_status[atual["status"]] = por_status.get(atual["status"], 0) + 1

            ans = respostas_de(cid, questions.CICLOS[0])
            sc = analise.score(ans)
            if sc:
                for k in ("E", "C", "O"):
                    pilares[k].append(sc["pilares"][k]["score"])
                geral.append(sc["geral"])

            acoes = [dict(r) for r in conn.execute(
                "SELECT status FROM acoes WHERE cliente_id=?", (cid,))]
            total_acoes += len(acoes)
            feitas = len([a for a in acoes if a["status"] == "Concluída"])
            concluidas += feitas

            docs = conn.execute("SELECT COUNT(*) n FROM anexos WHERE cliente_id=?",
                                (cid,)).fetchone()["n"]
            paginas = conn.execute("SELECT COUNT(*) n FROM ws_paginas WHERE cliente_id=?",
                                   (cid,)).fetchone()["n"]

            ultimo = conn.execute(
                "SELECT MAX(ultimo_acesso) u FROM links WHERE cliente_id=?",
                (cid,)).fetchone()["u"]
            dias = None
            if ultimo:
                try:
                    dias = (hoje - datetime.fromisoformat(ultimo)).days
                except ValueError:
                    dias = None
            if dias is not None and dias > 7:
                sem_contato.append({"id": cid, "empresa": c["empresa"], "dias": dias})

            if atual and atual["status"] in ("Não iniciado", "Em preenchimento"):
                criado = atual["criado_em"] or c["criado_em"]
                try:
                    parado = (hoje - datetime.fromisoformat(criado)).days
                except (ValueError, TypeError):
                    parado = 0
                if parado > 14:
                    atrasados.append({"id": cid, "empresa": c["empresa"],
                                      "ciclo": atual["ciclo"], "dias": parado})

            jornada.append({
                "id": cid, "empresa": c["empresa"], "segmento": c["segmento"] or "",
                "ciclo": atual["ciclo"] if atual else questions.CICLOS[0],
                "status": atual["status"] if atual else "Não iniciado",
                "progresso": atual["progresso"] if atual else 0,
                "score": sc["geral"] if sc else None,
                "entrada": sc["entrada_nome"] if sc else None,
                "ciclos_feitos": len([x for x in ciclos if x["enviado_em"]]),
                "acoes": len(acoes), "acoes_feitas": feitas,
                "documentos": docs, "paginas": paginas,
                "dias_sem_contato": dias,
            })

        def media(v):
            return round(sum(v) / len(v)) if v else 0

        return self.json({
            "total": len(ativos),
            "arquivados": len([c for c in clientes if c["arquivado"]]),
            "por_ciclo": por_ciclo,
            "por_status": por_status,
            "pilares": {"E": media(pilares["E"]), "C": media(pilares["C"]),
                        "O": media(pilares["O"])},
            "score_medio": media(geral),
            "acoes": {"total": total_acoes, "concluidas": concluidas,
                      "pct": round(concluidas / total_acoes * 100) if total_acoes else 0},
            "documentos": conn.execute(
                "SELECT COUNT(*) n FROM anexos WHERE cliente_id IN "
                "(%s)" % (",".join("?" * len(ids)) or "''"), ids).fetchone()["n"] if ids else 0,
            "paginas": conn.execute(
                "SELECT COUNT(*) n FROM ws_paginas WHERE cliente_id IN "
                "(%s)" % (",".join("?" * len(ids)) or "''"), ids).fetchone()["n"] if ids else 0,
            "diagnosticos_enviados": conn.execute(
                "SELECT COUNT(*) n FROM ciclos WHERE enviado_em IS NOT NULL").fetchone()["n"],
            "atrasados": sorted(atrasados, key=lambda x: -x["dias"])[:8],
            "sem_contato": sorted(sem_contato, key=lambda x: -x["dias"])[:8],
            "jornada": jornada,
            "ciclos": questions.CICLOS,
        })

    # ---------------------------------------------- rota de implementação
    def api_rota(self, cid):
        ciclo = self.q1("ciclo") or questions.CICLOS[0]
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        ans = respostas_de(cid, ciclo)
        return self.json({"ciclo": ciclo, "acoes": rota.listar(db(), cid, ciclo),
                          "sugestoes": rota.sugerir(ans),
                          "status_possiveis": ["Não iniciada", "Em andamento",
                                               "Concluída", "Bloqueada", "Cancelada"],
                          "equipe": [dict(r) for r in db().execute(
                              "SELECT id,nome,funcao FROM equipe WHERE cliente_id=? "
                              "AND ativo=1 ORDER BY ordem", (cid,))]})

    def api_rota_gerar(self):
        b = self.body()
        cid, ciclo = b.get("cliente_id"), b.get("ciclo")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        ans = respostas_de(cid, ciclo)
        if not analise.score(ans):
            return self.erro("A rota nasce do diagnóstico do Dia 0. "
                             "Gere a rota a partir do ciclo inicial.")
        r = rota.gerar(db(), cid, ciclo, ans, now(), bool(b.get("substituir")))
        return self.json({"ok": True, **r, "acoes": rota.listar(db(), cid, ciclo)})

    def api_acao_salvar(self):
        b = self.body()
        cid = b.get("cliente_id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        titulo = (b.get("titulo") or "").strip()
        if not titulo:
            return self.erro("Escreva o que precisa ser feito.")
        if b.get("id"):
            db().execute("UPDATE acoes SET titulo=?, detalhe=?, responsavel=?, status=?, "
                         "pilar=?, ordem=?, atualizado_em=? WHERE id=? AND cliente_id=?",
                         (titulo, b.get("detalhe", ""), b.get("responsavel", ""),
                          b.get("status") or "Não iniciada", b.get("pilar", ""),
                          int(b.get("ordem") or 0), now(), b["id"], cid))
        else:
            prox = db().execute("SELECT COALESCE(MAX(ordem),0)+1 n FROM acoes "
                                "WHERE cliente_id=? AND ciclo=?",
                                (cid, b.get("ciclo"))).fetchone()["n"]
            db().execute(
                "INSERT INTO acoes(id,cliente_id,ciclo,pilar,titulo,detalhe,responsavel,"
                "status,ordem,origem,criado_em,atualizado_em) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (secrets.token_hex(8), cid, b.get("ciclo"), b.get("pilar", ""), titulo,
                 b.get("detalhe", ""), b.get("responsavel", ""),
                 b.get("status") or "Não iniciada", prox, "manual", now(), now()))
        db().commit()
        return self.json({"ok": True})

    def api_acao_excluir(self):
        b = self.body()
        db().execute("DELETE FROM acoes WHERE id=?", (b.get("id"),))
        db().commit()
        return self.json({"ok": True})

    # -------------------------------------------------- equipe do cliente
    def api_equipe(self, cid):
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        rows = db().execute(
            "SELECT * FROM equipe WHERE cliente_id=? ORDER BY ordem, criado_em",
            (cid,)).fetchall()
        return self.json({"equipe": [dict(r) for r in rows],
                          "areas": questions.AREAS_EQUIPE, "funcoes": questions.FUNCOES_EQUIPE,
                          "niveis": questions.NIVEIS_EQUIPE})

    def api_equipe_salvar(self):
        b = self.body()
        cid = b.get("cliente_id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        nome = (b.get("nome") or "").strip()
        if not nome:
            return self.erro("Informe o nome da pessoa.")
        campos = ("nome", "email", "telefone", "funcao", "area", "nivel", "obs")
        if b.get("id"):
            sets = [f"{k}=?" for k in campos] + ["ativo=?", "ordem=?"]
            vals = [b.get(k, "") for k in campos]
            vals += [1 if b.get("ativo", 1) else 0, int(b.get("ordem") or 0), b["id"], cid]
            db().execute(f"UPDATE equipe SET {', '.join(sets)} WHERE id=? AND cliente_id=?",
                         vals)
        else:
            prox = db().execute("SELECT COALESCE(MAX(ordem),0)+1 n FROM equipe "
                                "WHERE cliente_id=?", (cid,)).fetchone()["n"]
            db().execute(
                "INSERT INTO equipe(id,cliente_id,nome,email,telefone,funcao,area,nivel,obs,"
                "ordem,criado_em) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (secrets.token_hex(8), cid, nome, b.get("email", ""), b.get("telefone", ""),
                 b.get("funcao", ""), b.get("area", ""), b.get("nivel", ""),
                 b.get("obs", ""), prox, now()))
        db().commit()
        return self.json({"ok": True})

    def api_equipe_excluir(self):
        b = self.body()
        db().execute("DELETE FROM equipe WHERE id=?", (b.get("id"),))
        db().commit()
        return self.json({"ok": True})

    def api_usuario_excluir(self):
        b = self.body()
        eu = self.admin_user()
        row = db().execute("SELECT * FROM usuarios WHERE id=?", (b.get("id"),)).fetchone()
        if not row:
            return self.erro("Usuário não encontrado.", 404)
        if row["usuario"] == eu:
            return self.erro("Você não pode excluir a própria conta.")
        n = db().execute("SELECT COUNT(*) n FROM usuarios WHERE ativo=1").fetchone()["n"]
        if n <= 1:
            return self.erro("Precisa existir ao menos uma pessoa com acesso.")
        db().execute("DELETE FROM usuarios WHERE id=?", (b["id"],))
        db().commit()
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
                          "status_possiveis": questions.STATUS,
                          "tipos_servico": questions.TIPOS_SERVICO})

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
        forms.congelar(conn, cid, ciclo, now())
        calcular_progresso(cid, ciclo)
        return self.json({"ok": True, "id": cid, "token": token})

    def api_editar_cliente(self):
        b = self.body()
        cid = b.get("id")
        if not cliente_dict(cid):
            return self.erro("Cliente não encontrado.", 404)
        campos = ["empresa", "responsavel", "cargo", "segmento", "contato", "email",
                  "obs_internas", "tipo_servico", "contrato_inicio", "contrato_fim",
                  "contrato_midia_id", "valor_contrato"]
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
        conn.execute("DELETE FROM ws_blocos WHERE pagina_id IN "
                     "(SELECT id FROM ws_paginas WHERE cliente_id=?)", (cid,))
        for tabela in ("respostas", "historico", "anexos", "analises", "ciclos", "links",
                       "acoes", "equipe", "perguntas_cliente", "form_snapshots",
                       "relatorios", "ws_paginas"):
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
            expira = (datetime.now() + timedelta(days=dias)).isoformat(timespec="seconds") if dias else None
            db().execute("INSERT INTO links(token,cliente_id,ciclo,criado_em,expira_em) "
                         "VALUES(?,?,?,?,?)", (t, cid, ciclo, now(), expira))
            db().commit()
            ja = db().execute("SELECT enviado_em FROM ciclos WHERE cliente_id=? AND ciclo=?",
                              (cid, ciclo)).fetchone()
            # so refaz a versao congelada enquanto o cliente ainda nao enviou
            if not (ja and ja["enviado_em"]):
                forms.congelar(db(), cid, ciclo, now())
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
        forms.congelar(db(), cid, ciclo, now())
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
            "blocos": form_do(cid, ciclo), "respostas": ans,
            "anexos": anexos_de(cid, ciclo), "links": links,
            "analise": dict(an) if an else {"notas": "", "gargalos": "", "prioridades": "",
                                            "proximo_foco": ""},
            "score": analise.score(ans), "indicadores": analise.indicadores(ans),
            "nao_informados": analise.nao_informados(ans, ciclo),
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
        vistos = set()
        pares = list(perguntas_do(cid, a)) + list(perguntas_do(cid, b))
        for _, q in pares:
            if q["id"] in vistos:
                continue
            vistos.add(q["id"])
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
