# -*- coding: utf-8 -*-
"""Teste de ponta a ponta do Diagnóstico ECO. Uso: python3 testar.py [porta]"""
import base64, http.cookiejar, json, sys, urllib.error, urllib.request

PORTA = sys.argv[1] if len(sys.argv) > 1 else "8000"
B = f"http://127.0.0.1:{PORTA}"
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
ok = falhas = 0


def checa(nome, cond, extra=""):
    global ok, falhas
    if cond:
        ok += 1
        print(f"  ok    {nome}")
    else:
        falhas += 1
        print(f"  FALHA {nome} {extra}")


def req(path, body=None, metodo=None, cru=False):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=metodo,
                               headers={"Content-Type": "application/json"} if d else {})
    try:
        with op.open(r) as resp:
            raw = resp.read()
            return raw if cru else json.loads(raw.decode())
    except urllib.error.HTTPError as e:
        return {"_http": e.code, **(json.loads(e.read().decode() or "{}") if not cru else {})}


print("\nDiagnóstico Comercial ECO — teste de ponta a ponta\n")

checa("servidor no ar", req("/saude").get("ok"))
checa("login recusa senha errada", req("/api/admin/login", {"usuario": "b3sales", "senha": "x"}).get("_http") == 401)
checa("área interna exige sessão", req("/api/admin/clientes").get("_http") == 401)

import server  # noqa: E402  (lê a senha inicial do próprio banco)
senha = "B3Sales@2026"
checa("login aceita a senha inicial", req("/api/admin/login", {"usuario": "b3sales", "senha": senha}).get("ok"),
      "(troque a senha e ajuste o teste se já mudou)")

novo = req("/api/admin/cliente-novo", {"empresa": "Teste Automático ECO", "responsavel": "Fulana",
                                       "segmento": "Estética e beleza", "ciclo": "Dia 0"})
checa("cadastro de cliente gera link", bool(novo.get("token")))
tok, cid = novo.get("token"), novo.get("id")

d = req(f"/api/d/{tok}")
checa("cliente carrega o diagnóstico", d.get("empresa") == "Teste Automático ECO")
checa("cliente recebe os 8 blocos", len(d.get("blocos", [])) == 8)
checa("campos internos NÃO vazam para o cliente", '"admin"' not in json.dumps(d, ensure_ascii=False))

req(f"/api/d/{tok}/salvar", {"itens": [{"qid": "n_leads", "valor": {"v": "250"}}]})
checa("resposta é salva", (req(f"/api/d/{tok}").get("respostas", {}).get("n_leads") or {}).get("v") == "250")

req(f"/api/d/{tok}/salvar", {"itens": [{"qid": "n_leads", "valor": {"v": "", "na": "Não sei informar"}}]})
checa("'não sei informar' é armazenado",
      (req(f"/api/d/{tok}").get("respostas", {}).get("n_leads") or {}).get("na") == "Não sei informar")

up = req(f"/api/d/{tok}/anexo", {"nome": "teste.txt", "tipo": "text/plain",
                                 "dados": base64.b64encode(b"conteudo").decode()})
checa("upload de anexo funciona", up.get("ok") and len(up.get("anexos", [])) == 1)
aid = up["anexos"][0]["id"] if up.get("anexos") else ""

env = req(f"/api/d/{tok}/enviar", {})
checa("envio bloqueia com obrigatórias em aberto", env.get("ok") is False and env.get("faltando"))

det = req(f"/api/admin/cliente/{cid}")
checa("painel mostra os campos internos", '"admin"' in json.dumps(det.get("blocos"), ensure_ascii=False))
checa("Score ECO é calculado", isinstance(det.get("score", {}).get("geral"), int))

checa("API de leitura recusa chave errada", req("/api/dados?chave=errada").get("_http") == 403)
chave = req("/api/admin/config").get("api_key")
checa("API de leitura aceita a chave", req(f"/api/dados?chave={chave}").get("total", 0) >= 1)

checa("exclusão exige o nome exato",
      req("/api/admin/cliente-excluir", {"id": cid, "confirmacao": "errado"}).get("_http") == 400)
checa("exclusão funciona com o nome certo",
      req("/api/admin/cliente-excluir", {"id": cid, "confirmacao": "Teste Automático ECO"}).get("ok"))
checa("link do cliente excluído fica inativo", req(f"/api/d/{tok}").get("bloqueado"))
resp = req(f"/api/anexo/{aid}", cru=True)
checa("anexo do cliente excluído fica inacessível",
      isinstance(resp, dict) and resp.get("_http") in (403, 404), f"-> {resp!r}")

print(f"\n{ok} verificações passaram, {falhas} falharam.\n")
sys.exit(1 if falhas else 0)
