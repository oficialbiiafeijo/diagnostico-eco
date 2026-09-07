"""Central de Ação: o controle interno da execução da B3 Sales.

A decisão que sustenta este módulo: a Central **não guarda cópia** de nada.
Uma ação da rota mora em `acoes`. Uma entrega de material mora em
`ws_paginas`, que já tem status, responsável, prioridade e prazo. A Central
lê essas tabelas, junta num formato só e escreve de volta na origem. Assim
não existe tarefa duplicada, nem prazo que muda num lugar e fica velho no
outro.

Só o que não tem casa em nenhuma aba nasce aqui: lembrete, decisão de
reunião, cobrança ao cliente, observação. Esses ficam em `registros`.

Nada daqui aparece para o cliente. Todo registro nasce interno.
"""

from datetime import datetime

TIPOS = ["Tarefa", "Pendência", "Lembrete", "Mensagem", "Decisão",
         "Observação", "Anexo", "Evidência", "Próximo passo", "Reunião",
         "Cobrança ao cliente"]

# Atrasado não entra: ele é calculado pelo prazo, nunca escolhido à mão.
STATUS = ["Não iniciado", "Em andamento", "Aguardando cliente",
          "Aguardando B3 Sales", "Bloqueado", "Concluído", "Cancelado"]

PRIORIDADES = ["Urgente", "Alta", "Média", "Baixa"]

PILARES = {"E": "Estratégia", "C": "Condução", "O": "Operação"}

ORIGENS = {"rota": "Rota de implementação", "material": "Materiais",
           "metodologia": "Metodologia", "registro": "Central de Ação"}

FECHADOS = ("Concluído", "Cancelado", "Concluída", "Cancelada")

# Como cada aba fala de status, traduzido para a fala da Central.
DE_ACAO = {"Não iniciada": "Não iniciado", "Em andamento": "Em andamento",
           "Concluída": "Concluído", "Cancelada": "Cancelado"}
PARA_ACAO = {v: k for k, v in DE_ACAO.items()}
DE_PAGINA = {"A fazer": "Não iniciado", "Em andamento": "Em andamento",
             "Em revisão": "Em andamento", "Aguardando cliente": "Aguardando cliente",
             "Concluído": "Concluído", "Pausado": "Bloqueado"}
PARA_PAGINA = {"Não iniciado": "A fazer", "Em andamento": "Em andamento",
               "Aguardando cliente": "Aguardando cliente",
               "Aguardando B3 Sales": "Em andamento", "Bloqueado": "Pausado",
               "Concluído": "Concluído", "Cancelado": "Pausado"}


def _dias(prazo):
    """Quantos dias passaram do prazo. Negativo quando ainda falta."""
    if not prazo:
        return None
    try:
        d = datetime.fromisoformat(str(prazo)[:10])
    except ValueError:
        return None
    return (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - d).days


def _fechar(item):
    """Marca atraso e dias, sem nunca sobrescrever um status escolhido."""
    d = _dias(item.get("prazo"))
    item["dias_prazo"] = d
    item["atrasado"] = bool(d is not None and d > 0 and
                            item.get("status") not in FECHADOS)
    item["dias_atraso"] = d if item["atrasado"] else 0
    return item


def _de_acao(r, nomes_dele):
    resp = (r["responsavel"] or "").strip()
    return _fechar({
        "id": "rota:" + r["id"], "origem": "rota", "origem_id": r["id"],
        "cliente_id": r["cliente_id"], "tipo": "Tarefa",
        "titulo": r["titulo"], "descricao": r["detalhe"] or "",
        "ciclo": r["ciclo"] or "", "pilar": r["pilar"] or "",
        "responsavel": resp,
        "lado": "cliente" if resp.strip().lower() in nomes_dele else "b3sales",
        "prazo": r["prazo"] if "prazo" in r.keys() else None,
        "prioridade": (r["prioridade"] if "prioridade" in r.keys() else "") or "Média",
        "status": DE_ACAO.get(r["status"], r["status"] or "Não iniciado"),
        "visibilidade": "interno",
        "criado_em": r["criado_em"], "atualizado_em": r["atualizado_em"],
    })


def _de_pagina(r, nomes_dele):
    resp = (r["responsavel"] or "").strip()
    return _fechar({
        "id": "material:" + r["id"], "origem": "material" if r["cliente_id"] else
        "metodologia", "origem_id": r["id"], "cliente_id": r["cliente_id"],
        "tipo": "Entrega", "titulo": r["titulo"], "descricao": r["setor"] or "",
        "ciclo": "", "pilar": "", "responsavel": resp,
        "lado": "cliente" if resp.strip().lower() in nomes_dele else "b3sales",
        "prazo": r["prazo"], "prioridade": r["prioridade"] or "Média",
        "status": DE_PAGINA.get(r["status"], r["status"] or "Não iniciado"),
        "visibilidade": "cliente" if r["visivel_cliente"] else "interno",
        "criado_em": r["criado_em"], "atualizado_em": r["atualizado_em"],
    })


def _de_registro(r):
    return _fechar({
        "id": "registro:" + r["id"], "origem": "registro", "origem_id": r["id"],
        "cliente_id": r["cliente_id"], "tipo": r["tipo"] or "Tarefa",
        "titulo": r["titulo"], "descricao": r["descricao"] or "",
        "ciclo": r["ciclo"] or "", "pilar": r["pilar"] or "",
        "responsavel": r["responsavel"] or "", "lado": r["lado"] or "b3sales",
        "prazo": r["prazo"], "prioridade": r["prioridade"] or "Média",
        "status": r["status"] or "Não iniciado",
        "visibilidade": r["visibilidade"] or "interno",
        "midia_ids": r["midia_ids"] or "", "obs": r["obs"] or "",
        "criado_em": r["criado_em"], "atualizado_em": r["atualizado_em"],
    })


def time_do_cliente(conn, cid):
    """Quem é do lado do cliente. Serve para separar pendência dele da nossa."""
    nomes = {(r["nome"] or "").strip().lower() for r in conn.execute(
        "SELECT nome FROM equipe WHERE cliente_id=? AND ativo=1", (cid,))}
    r = conn.execute("SELECT responsavel FROM clientes WHERE id=?", (cid,)).fetchone()
    if r and r["responsavel"]:
        nomes.add(r["responsavel"].strip().lower())
    nomes.add("cliente")
    nomes.discard("")
    return nomes


def listar(conn, cliente_id=None, filtros=None):
    """Junta as três origens num formato só, sem copiar nada."""
    f = filtros or {}
    itens = []

    clientes = {r["id"]: r["empresa"] for r in conn.execute(
        "SELECT id, empresa FROM clientes")}
    times = {}

    def time(cid):
        if cid not in times:
            times[cid] = time_do_cliente(conn, cid) if cid else set()
        return times[cid]

    sql = "SELECT * FROM acoes WHERE status <> 'Cancelada'"
    args = []
    if cliente_id:
        sql += " AND cliente_id=?"
        args.append(cliente_id)
    for r in conn.execute(sql, args):
        itens.append(_de_acao(r, time(r["cliente_id"])))

    # só páginas com prazo ou responsável entram: as outras são só documento
    sql = ("SELECT * FROM ws_paginas WHERE (prazo IS NOT NULL AND prazo <> '') "
           "OR (responsavel IS NOT NULL AND responsavel <> '')")
    args = []
    if cliente_id:
        sql += " AND cliente_id=?"
        args.append(cliente_id)
    for r in conn.execute(sql, args):
        itens.append(_de_pagina(r, time(r["cliente_id"])))

    sql = "SELECT * FROM registros WHERE 1=1"
    args = []
    if cliente_id:
        sql += " AND cliente_id=?"
        args.append(cliente_id)
    for r in conn.execute(sql, args):
        itens.append(_de_registro(r))

    for i in itens:
        # os anexos do registro, com o nome de cada arquivo
        i["anexos"] = []
        for mid in [x for x in (i.get("midia_ids") or "").split(",") if x]:
            r = conn.execute("SELECT id, nome, tipo FROM midia WHERE id=?",
                             (mid,)).fetchone()
            if r:
                i["anexos"].append(dict(r))
        i["cliente_nome"] = clientes.get(i["cliente_id"], "")
        i["origem_nome"] = ORIGENS.get(i["origem"], i["origem"])
        i["pilar_nome"] = PILARES.get(i["pilar"], "")

    def passa(i):
        if f.get("status") == "Atrasado":
            if not i["atrasado"]:
                return False
        elif f.get("status") and i["status"] != f["status"]:
            return False
        if f.get("prioridade") and i["prioridade"] != f["prioridade"]:
            return False
        if f.get("origem") and i["origem"] != f["origem"]:
            return False
        if f.get("tipo") and i["tipo"] != f["tipo"]:
            return False
        if f.get("ciclo") and i["ciclo"] != f["ciclo"]:
            return False
        if f.get("pilar") and i["pilar"] != f["pilar"]:
            return False
        if f.get("lado") and i["lado"] != f["lado"]:
            return False
        if f.get("responsavel") and \
                f["responsavel"].lower() not in (i["responsavel"] or "").lower():
            return False
        if f.get("aberto") and i["status"] in FECHADOS:
            return False
        if f.get("busca"):
            alvo = (i["titulo"] + " " + i["descricao"]).lower()
            if f["busca"].lower() not in alvo:
                return False
        return True

    itens = [i for i in itens if passa(i)]

    ordem_p = {p: n for n, p in enumerate(PRIORIDADES)}

    def chave(i):
        # atrasado primeiro, depois quem tem prazo mais perto, depois prioridade
        return (0 if i["atrasado"] else 1,
                i["prazo"] or "9999-99-99",
                ordem_p.get(i["prioridade"], 9),
                i["titulo"] or "")

    itens.sort(key=chave)
    return itens


def resumo(itens):
    """O retrato que vai no topo da Central e no painel do cliente."""
    abertos = [i for i in itens if i["status"] not in FECHADOS]
    proximo = None
    for i in abertos:
        if i["prazo"]:
            proximo = i
            break
    return {
        "total": len(itens),
        "concluidos": len([i for i in itens if i["status"] == "Concluído"]),
        "andamento": len([i for i in itens if i["status"] == "Em andamento"]),
        "atrasados": len([i for i in itens if i["atrasado"]]),
        "do_cliente": len([i for i in abertos if i["lado"] == "cliente"]),
        "da_casa": len([i for i in abertos if i["lado"] == "b3sales"]),
        "bloqueados": len([i for i in abertos if i["status"] == "Bloqueado"]),
        "proximo_prazo": proximo["prazo"] if proximo else None,
        "proxima_acao": proximo["titulo"] if proximo else
                        (abertos[0]["titulo"] if abertos else None),
        "por_ciclo": _por_ciclo(itens),
    }


def _por_ciclo(itens):
    fora = {}
    for i in itens:
        c = i["ciclo"] or "Sem ciclo"
        fora[c] = fora.get(c, 0) + 1
    return fora


def gravar(conn, item_id, campos, agora):
    """Escreve na origem, nunca numa cópia.

    Devolve True quando gravou. É esta função que garante que mudar o prazo
    na Central muda o prazo na aba de onde a tarefa veio.
    """
    if ":" not in (item_id or ""):
        return False
    origem, oid = item_id.split(":", 1)

    if origem == "rota":
        mapa = {"titulo": "titulo", "descricao": "detalhe",
                "responsavel": "responsavel", "prazo": "prazo",
                "prioridade": "prioridade", "pilar": "pilar"}
        sets, vals = [], []
        for k, col in mapa.items():
            if k in campos:
                sets.append(col + "=?")
                vals.append(campos[k])
        if "status" in campos:
            sets.append("status=?")
            vals.append(PARA_ACAO.get(campos["status"], campos["status"]))
        if not sets:
            return False
        sets.append("atualizado_em=?")
        vals += [agora, oid]
        conn.execute("UPDATE acoes SET " + ",".join(sets) + " WHERE id=?", vals)
        return True

    if origem in ("material", "metodologia"):
        mapa = {"titulo": "titulo", "responsavel": "responsavel",
                "prazo": "prazo", "prioridade": "prioridade"}
        sets, vals = [], []
        for k, col in mapa.items():
            if k in campos:
                sets.append(col + "=?")
                vals.append(campos[k])
        if "status" in campos:
            sets.append("status=?")
            vals.append(PARA_PAGINA.get(campos["status"], campos["status"]))
            if campos["status"] == "Concluído":
                sets.append("concluido_em=?")
                vals.append(agora)
        if not sets:
            return False
        sets.append("atualizado_em=?")
        vals += [agora, oid]
        conn.execute("UPDATE ws_paginas SET " + ",".join(sets) + " WHERE id=?", vals)
        return True

    if origem == "registro":
        campos_ok = ["tipo", "titulo", "descricao", "ciclo", "pilar", "responsavel",
                     "lado", "prazo", "prioridade", "status", "visibilidade",
                     "midia_ids", "obs"]
        sets, vals = [], []
        for k in campos_ok:
            if k in campos:
                sets.append(k + "=?")
                vals.append(campos[k])
        if not sets:
            return False
        sets.append("atualizado_em=?")
        vals += [agora, oid]
        conn.execute("UPDATE registros SET " + ",".join(sets) + " WHERE id=?", vals)
        return True

    return False
