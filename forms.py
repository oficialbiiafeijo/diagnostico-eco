# -*- coding: utf-8 -*-
"""
Montagem do formulário de cada ciclo.

O formulário nasce de três camadas, aplicadas como remendo por pergunta:

  1. código      o padrão do Método ECO (questions.py e ciclos.py)
  2. biblioteca  edições que a B3 Sales fez para todos os clientes
  3. cliente     ajustes feitos só para aquela empresa

Depois que o link é publicado, o formulário inteiro é congelado. A partir daí
tudo passa a ler a versão congelada: o que o cliente vê, o cálculo de
progresso, a validação ao salvar e a exportação.

Sem isso, editar uma pergunta faria a resposta já dada sumir sem aviso.
"""
from __future__ import annotations

import copy
import json
import secrets

import questions

# Chaves que a B3 Sales pode alterar numa pergunta existente.
CAMPOS_EDITAVEIS = {"label", "help", "example", "placeholder", "type", "options",
                    "required", "other", "unknown", "unit", "max", "multi",
                    "show_if", "followup"}


def _aplicar(pergunta: dict, patch: dict) -> dict:
    limpo = {k: v for k, v in (patch or {}).items() if k in CAMPOS_EDITAVEIS}
    return {**pergunta, **limpo}


def _remendos(conn, ciclo: str, cliente_id: str | None):
    """Junta biblioteca e ajustes do cliente num único mapa por pergunta."""
    saida = {}
    for r in conn.execute("SELECT qid, patch, ordem, removida, bloco_id "
                          "FROM perguntas_lib WHERE ciclo=?", (ciclo,)):
        saida[r["qid"]] = {"patch": json.loads(r["patch"] or "{}"),
                           "ordem": r["ordem"], "removida": r["removida"],
                           "bloco_id": r["bloco_id"]}
    if cliente_id:
        for r in conn.execute("SELECT qid, patch, ordem, removida, bloco_id "
                              "FROM perguntas_cliente WHERE cliente_id=? AND ciclo=?",
                              (cliente_id, ciclo)):
            antes = saida.get(r["qid"], {})
            juntos = {**antes.get("patch", {}), **json.loads(r["patch"] or "{}")}
            saida[r["qid"]] = {
                "patch": juntos,
                "ordem": r["ordem"] if r["ordem"] is not None else antes.get("ordem"),
                "removida": r["removida"],
                "bloco_id": r["bloco_id"] or antes.get("bloco_id"),
            }
    return saida


def resolver(conn, ciclo: str, cliente_id: str | None = None) -> list:
    """Monta o formulário vivo do ciclo, já com as edições aplicadas."""
    blocos = copy.deepcopy(questions.blocos_do_ciclo(ciclo))
    remendos = _remendos(conn, ciclo, cliente_id)
    if not remendos:
        return blocos

    vistos = set()
    for b in blocos:
        saida = []
        for q in b["questions"]:
            r = remendos.get(q["id"])
            vistos.add(q["id"])
            if not r:
                saida.append(q)
                continue
            if r["removida"]:
                continue
            nova = _aplicar(q, r["patch"])
            if r["ordem"] is not None:
                nova["_ordem"] = r["ordem"]
            saida.append(nova)
        saida.sort(key=lambda x: x.get("_ordem", 10_000))
        for q in saida:
            q.pop("_ordem", None)
        b["questions"] = saida

    # perguntas criadas do zero pela B3 Sales
    porbloco = {}
    for qid, r in remendos.items():
        if qid in vistos or r["removida"]:
            continue
        nova = {"id": qid, "type": "text", "label": qid}
        nova = _aplicar(nova, r["patch"])
        porbloco.setdefault(r["bloco_id"] or (blocos[-1]["id"] if blocos else None),
                            []).append((r["ordem"], nova))
    for b in blocos:
        extras = porbloco.get(b["id"])
        if not extras:
            continue
        for ordem, q in sorted(extras, key=lambda x: x[0] if x[0] is not None else 10_000):
            pos = ordem if ordem is not None else len(b["questions"])
            b["questions"].insert(min(pos, len(b["questions"])), q)
    return blocos


# ------------------------------------------------------------- congelamento
def congelar(conn, cliente_id: str, ciclo: str, agora: str) -> str:
    """Guarda a versão publicada do formulário e devolve o id dela."""
    blocos = resolver(conn, ciclo, cliente_id)
    blocos = _preencher_dinamicos(conn, blocos, cliente_id, ciclo)
    sid = secrets.token_hex(8)
    conn.execute("INSERT INTO form_snapshots(id,cliente_id,ciclo,json,criado_em) "
                 "VALUES(?,?,?,?,?)",
                 (sid, cliente_id, ciclo, json.dumps(blocos, ensure_ascii=False), agora))
    conn.execute("UPDATE ciclos SET snapshot_id=?, publicado_em=? "
                 "WHERE cliente_id=? AND ciclo=?", (sid, agora, cliente_id, ciclo))
    conn.commit()
    return sid


def do_ciclo(conn, cliente_id: str, ciclo: str) -> list:
    """A verdade sobre o formulário: a versão congelada, se já existir."""
    row = conn.execute("SELECT snapshot_id FROM ciclos WHERE cliente_id=? AND ciclo=?",
                       (cliente_id, ciclo)).fetchone()
    if row and row["snapshot_id"]:
        snap = conn.execute("SELECT json FROM form_snapshots WHERE id=?",
                            (row["snapshot_id"],)).fetchone()
        if snap:
            return json.loads(snap["json"])
    return resolver(conn, ciclo, cliente_id)


# ------------------------------------------------- opções vindas do passado
CICLO_ANTERIOR = {"Dia 30": "Dia 0", "Dia 60": "Dia 30", "Dia 90": "Dia 60",
                  "Dia 120": "Dia 90", "Dia 150": "Dia 120", "Dia 180": "Dia 150"}


def _preencher_dinamicos(conn, blocos, cliente_id, ciclo):
    """Resolve os campos que dependem do que ficou registrado antes.

    Fazemos isso no congelamento para que o formulário do cliente não precise
    calcular nada, e para que a lista não mude depois que ele começar.
    """
    anterior = CICLO_ANTERIOR.get(ciclo)
    acoes = [r["titulo"] for r in conn.execute(
        "SELECT titulo FROM acoes WHERE cliente_id=? AND ciclo=? ORDER BY ordem",
        (cliente_id, anterior or ciclo))] if anterior else []
    prioridades = _prioridades_anteriores(conn, cliente_id, anterior)
    indicadores = _indicadores_do_cliente(conn, cliente_id)

    for b in blocos:
        for q in b["questions"]:
            t = q.get("type")
            if t == "acoes_status" and acoes:
                q["options"] = acoes
            elif t == "prioridades_prev" and prioridades:
                q["options"] = prioridades
            elif t == "indicador_ref" and indicadores:
                q["options"] = indicadores
    return blocos


def _prioridades_anteriores(conn, cliente_id, anterior):
    if not anterior:
        return []
    row = conn.execute("SELECT prioridades FROM analises WHERE cliente_id=? AND ciclo=?",
                       (cliente_id, anterior)).fetchone()
    if row and (row["prioridades"] or "").strip():
        linhas = [x.strip(" -•\t") for x in row["prioridades"].splitlines()]
        return [x for x in linhas if x][:12]
    # sem análise escrita, usamos o que o cliente marcou como próxima prioridade
    for qid in ("c30_proxima_prioridade", "c60_prioridade_conducao",
                "c90_prioridade_execucao", "c120_prioridade", "c150_prioridade_final",
                "prox_prioridade"):
        r = conn.execute("SELECT valor FROM respostas WHERE cliente_id=? AND ciclo=? AND qid=?",
                         (cliente_id, anterior, qid)).fetchone()
        if r:
            v = (json.loads(r["valor"] or "{}") or {}).get("v")
            if isinstance(v, list) and v:
                return v
            if v:
                return [v]
    return []


# Indicadores que o Dia 0 pergunta se a empresa acompanha.
_QID_INDICADORES = "o_indicadores"

_PADRAO_INDICADORES = ["Leads recebidos", "Tempo de resposta", "Agendamentos",
                       "Comparecimentos", "Propostas", "Vendas", "Conversão",
                       "Ticket médio", "Follow ups", "Recompra", "Indicações",
                       "Faturamento"]


def _indicadores_do_cliente(conn, cliente_id):
    r = conn.execute("SELECT valor FROM respostas WHERE cliente_id=? AND ciclo='Dia 0' "
                     "AND qid=?", (cliente_id, _QID_INDICADORES)).fetchone()
    if r:
        v = (json.loads(r["valor"] or "{}") or {}).get("v")
        lista = v if isinstance(v, list) else ([v] if v else [])
        lista = [x for x in lista if x and not x.startswith("Nenhum")]
        if lista:
            return lista
    return _PADRAO_INDICADORES
