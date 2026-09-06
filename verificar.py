# -*- coding: utf-8 -*-
"""Verificacao de integridade do banco de perguntas e do motor de analise."""
import re, sys
import questions, analise

erros = []
ids = set()
CHAVES = {"id","label","type","required","help","example","placeholder","options","other",
          "unknown","unit","fields","total","rows","responsaveis","show_if","followup","admin"}
TIPOS = {"text","textarea","number","currency","percent","select","radio","multiselect",
         "yesno","scale","date","duration","numgroup","matrix","files"}

for b in questions.BLOCKS:
    for k in ("id","eyebrow","title","intro","questions"):
        if k not in b: erros.append(f"bloco {b.get('id')} sem chave {k}")
    for q in b["questions"]:
        qid = q.get("id")
        if not qid or not re.fullmatch(r"[a-z][a-z0-9_]*", qid):
            erros.append(f"id invalido: {qid!r}")
        if qid in ids: erros.append(f"id duplicado: {qid}")
        ids.add(qid)
        if q.get("type") not in TIPOS: erros.append(f"{qid}: tipo desconhecido {q.get('type')}")
        for k in q:
            if k not in CHAVES: erros.append(f"{qid}: chave inesperada {k!r}")
        if q["type"] in ("select","radio","multiselect") and not q.get("options"):
            erros.append(f"{qid}: {q['type']} sem options")
        if q["type"] == "numgroup" and not q.get("fields"):
            erros.append(f"{qid}: numgroup sem fields")
        if q["type"] == "matrix" and not (q.get("rows") and q.get("responsaveis")):
            erros.append(f"{qid}: matrix sem rows/responsaveis")
        for k in ("label","help","example","intro","title"):
            if q.get(k) and not isinstance(q[k], str): erros.append(f"{qid}: {k} nao e texto")
        if q.get("admin"):
            for k in q["admin"]:
                if k not in ("indicador","objetivo","analise"):
                    erros.append(f"{qid}: chave admin inesperada {k!r}")

# condicoes apontam para perguntas existentes
for _, q in questions.all_questions():
    c = q.get("show_if")
    if c:
        if c["q"] not in ids: erros.append(f"{q['id']}: show_if aponta para {c['q']} inexistente")
        alvo = questions.question_map().get(c["q"])
        if alvo:
            ops = set(alvo[1].get("options") or []) | {"Sim", "Não"}
            for v in c.get("in", []) + c.get("not_in", []):
                if v not in ops: erros.append(f"{q['id']}: show_if usa opcao inexistente {v!r}")

# o motor de analise so pode citar opcoes que existem
todas_ops = set()
for _, q in questions.all_questions():
    todas_ops |= set(q.get("options") or []) | set(q.get("responsaveis") or [])
todas_ops |= {"Sim", "Não"}
fonte = open("analise.py", encoding="utf-8").read()
for lit in re.findall(r'_v\(a, "(\w+)"\)\s*(?:==|in)\s*\(?((?:"[^"]*"(?:,\s*)?)+)\)?', fonte):
    qid, bloco = lit
    if qid not in ids: erros.append(f"analise.py cita pergunta inexistente: {qid}")
    for v in re.findall(r'"([^"]*)"', bloco):
        if v not in todas_ops: erros.append(f"analise.py: opcao inexistente {v!r} (pergunta {qid})")
for v in re.findall(r'x != "([^"]*)"', fonte):
    if v not in todas_ops: erros.append(f"analise.py: opcao inexistente {v!r}")

# o cliente nunca pode receber campos internos
import json
if '"admin"' in json.dumps(questions.client_blocks(), ensure_ascii=False):
    erros.append("VAZAMENTO: campos internos presentes no payload do cliente")

if erros:
    print("PROBLEMAS ENCONTRADOS:")
    for e in erros: print("  -", e)
    sys.exit(1)
print("Banco de perguntas integro.")
print("  blocos      :", len(questions.BLOCKS))
print("  perguntas   :", len(ids))
print("  obrigatorias:", len(questions.required_ids()))
print("  ciclos      :", len(questions.CICLOS))
print("  regras ECO  :", sum(len(v) for v in analise._regras().values()))
