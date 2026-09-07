"""Conquistas da jornada: o que a operação do cliente passou a ter.

Nada aqui é preenchido à mão. Cada conquista nasce de um fato que já existe
no banco, e todo fato usado é um fato que o cliente já podia ver. Por isso
não há caminho por onde informação interna escape para o portal.

Regra de tela, que vale tanto quanto a regra de dado: nunca mostrar uma
grade de conquistas apagadas. O portal mostra o que foi conquistado e
exatamente uma próxima.
"""

# As seis etapas com o nome que o cliente lê. O Dia 0 é o diagnóstico e
# entra dentro da primeira etapa, não como etapa separada.
ETAPAS = [
    ("Dia 30", "Diagnóstico e direção"),
    ("Dia 60", "Processos e condução"),
    ("Dia 90", "Time e execução"),
    ("Dia 120", "Gestão e ajuste"),
    ("Dia 150", "Otimização e autonomia"),
    ("Dia 180", "Consolidação e continuidade"),
]

RESULTADO = ("Resultado da jornada: uma operação mais clara, organizada e "
             "preparada para continuar evoluindo.")

SITUACOES = ["Concluída", "Em andamento", "Próxima etapa", "Na sequência"]


def _um(conn, sql, args=()):
    r = conn.execute(sql, args).fetchone()
    return r


def _data(v):
    return (v or "")[:10]


def calcular(conn, cid):
    """Devolve (conquistadas, proxima).

    Cada conquista é um dicionário com chave, titulo, texto e em. A lista
    volta da mais antiga para a mais recente. A próxima é a primeira que
    ainda não aconteceu, ou None quando todas já vieram.
    """
    feitas, pendentes = [], []

    def marca(chave, titulo, texto, em):
        feitas.append({"chave": chave, "titulo": titulo, "texto": texto,
                       "em": _data(em)})

    def falta(chave, titulo, texto):
        pendentes.append({"chave": chave, "titulo": titulo, "texto": texto})

    # 1. Mapa da operação
    r = _um(conn, "SELECT enviado_em FROM ciclos WHERE cliente_id=? AND ciclo='Dia 0' "
                  "AND enviado_em IS NOT NULL", (cid,))
    if r:
        marca("mapa", "Mapa da operação",
              "O cenário da sua operação foi mapeado e agora temos clareza sobre "
              "os próximos movimentos.", r["enviado_em"])
    else:
        falta("mapa", "Mapa da operação",
              "Quando o diagnóstico da sua operação estiver respondido.")

    # 2. O time entrou no jogo
    r = _um(conn, "SELECT MIN(criado_em) em FROM equipe WHERE cliente_id=? AND ativo=1",
            (cid,))
    if r and r["em"]:
        marca("time", "O time entrou no jogo",
              "A equipe foi registrada e agora faz parte da construção da operação.",
              r["em"])
    else:
        falta("time", "O time entrou no jogo",
              "Quando a sua equipe estiver registrada no acompanhamento.")

    # 3. Primeiro movimento
    r = _um(conn, "SELECT MIN(atualizado_em) em FROM acoes WHERE cliente_id=? "
                  "AND status='Concluída'", (cid,))
    if r and r["em"]:
        marca("movimento", "Primeiro movimento",
              "A primeira ação foi concluída e a implementação começou a sair do papel.",
              r["em"])
    else:
        falta("movimento", "Primeiro movimento",
              "Quando a primeira ação da implementação for concluída.")

    # 4. Manual da operação
    r = _um(conn, "SELECT MIN(atualizado_em) em FROM ws_paginas WHERE cliente_id=? "
                  "AND visivel_cliente=1", (cid,))
    if r and r["em"]:
        marca("manual", "Manual da operação",
              "Sua operação ganhou uma base de conhecimento para orientar a execução.",
              r["em"])
    else:
        falta("manual", "Manual da operação",
              "Quando o primeiro material da sua operação for liberado no acervo.")

    # 5. Time em desenvolvimento
    r = _um(conn, "SELECT MIN(visto_em) em FROM aula_vista WHERE cliente_id=?", (cid,))
    if r and r["em"]:
        marca("formacao", "Time em desenvolvimento",
              "O desenvolvimento da equipe começou e novos conhecimentos já estão "
              "entrando na operação.", r["em"])
    else:
        falta("formacao", "Time em desenvolvimento",
              "Quando a sua equipe assistir a primeira aula liberada.")

    # 6. Uma habilidade a mais, um por módulo concluído
    modulos = conn.execute(
        "SELECT m.id, m.titulo, COUNT(a.id) total, "
        "SUM(CASE WHEN v.aula_id IS NULL THEN 0 ELSE 1 END) vistas, "
        "MAX(v.visto_em) em "
        "FROM modulos m JOIN aulas a ON a.modulo_id = m.id "
        "LEFT JOIN aula_vista v ON v.aula_id = a.id AND v.cliente_id = ? "
        "WHERE m.curso_id IN (SELECT curso_id FROM curso_acesso WHERE cliente_id=?) "
        "GROUP BY m.id ORDER BY em", (cid, cid)).fetchall()
    concluidos = [m for m in modulos if m["total"] and m["vistas"] == m["total"]]
    for m in concluidos:
        marca("modulo:" + m["id"], "Uma habilidade a mais",
              "Sua equipe concluiu o módulo " + m["titulo"] +
              ". Mais uma habilidade foi desenvolvida para a operação.", m["em"])
    if not concluidos and modulos:
        falta("modulo", "Uma habilidade a mais",
              "Quando a sua equipe concluir o primeiro módulo de treinamento.")

    # 7. Mais uma etapa da jornada, um por ciclo mensal respondido
    for r in conn.execute(
            "SELECT ciclo, enviado_em FROM ciclos WHERE cliente_id=? "
            "AND ciclo <> 'Dia 0' AND enviado_em IS NOT NULL ORDER BY enviado_em",
            (cid,)):
        marca("ciclo:" + r["ciclo"], "Mais uma etapa da jornada",
              "Mais uma etapa da evolução da sua empresa foi registrada.",
              r["enviado_em"])

    # 8. Gestão à vista, indicadores acompanhados em dois ciclos
    com_numero = conn.execute(
        "SELECT COUNT(DISTINCT ciclo) n FROM respostas WHERE cliente_id=? "
        "AND qid LIKE 'ind_%' AND valor IS NOT NULL AND valor <> ''", (cid,)).fetchone()
    if com_numero and com_numero["n"] >= 2:
        r = _um(conn, "SELECT MAX(atualizado_em) em FROM respostas WHERE cliente_id=? "
                      "AND qid LIKE 'ind_%'", (cid,))
        marca("gestao", "Gestão à vista",
              "Sua empresa começou a acompanhar os próprios indicadores com mais "
              "clareza.", r["em"] if r else "")
    else:
        falta("gestao", "Números à vista",
              "Quando sua empresa acompanhar os próprios indicadores em dois ciclos "
              "consecutivos.")

    # 9. Ciclo concluído, quando todas as ações de um ciclo saem
    for r in conn.execute(
            "SELECT ciclo, COUNT(*) total, "
            "SUM(CASE WHEN status='Concluída' THEN 1 ELSE 0 END) feitas, "
            "MAX(atualizado_em) em FROM acoes WHERE cliente_id=? "
            "AND status <> 'Cancelada' GROUP BY ciclo", (cid,)):
        if r["total"] and r["feitas"] == r["total"]:
            marca("acoes:" + (r["ciclo"] or ""), "Ciclo concluído",
                  "Este ciclo foi concluído e deixou uma base mais preparada para os "
                  "próximos avanços.", r["em"])

    feitas.sort(key=lambda x: x["em"] or "")
    return feitas, (pendentes[0] if pendentes else None)


def inventario(conn, cid):
    """O que já está sendo construído, em nomes e não em números.

    Nome de coisa lê como bem que a empresa tem. Número lê como entrega que
    faltou. Por isso esta lista nunca conta, só nomeia.
    """
    itens = []
    pg = conn.execute("SELECT titulo FROM ws_paginas WHERE cliente_id=? "
                      "AND visivel_cliente=1 ORDER BY ordem LIMIT 4", (cid,)).fetchall()
    for p in pg:
        itens.append(p["titulo"])
    feitas = conn.execute("SELECT titulo FROM acoes WHERE cliente_id=? "
                          "AND status='Concluída' ORDER BY atualizado_em DESC LIMIT 3",
                          (cid,)).fetchall()
    for a in feitas:
        itens.append(a["titulo"])
    tem_curso = conn.execute("SELECT 1 FROM curso_acesso WHERE cliente_id=?",
                             (cid,)).fetchone()
    if tem_curso:
        itens.append("Time em desenvolvimento")
    # sem repetir e sem passar de seis, para a faixa não virar lista longa
    vistos, saida = set(), []
    for i in itens:
        chave = (i or "").strip().lower()
        if not chave or chave in vistos:
            continue
        vistos.add(chave)
        saida.append(i.strip())
    return saida[:6]


def etapas(conn, cid):
    """As seis etapas com a situação de cada uma, sem prazo nem contagem."""
    linhas = {r["ciclo"]: dict(r) for r in conn.execute(
        "SELECT ciclo, enviado_em, progresso FROM ciclos WHERE cliente_id=?", (cid,))}
    dia0 = linhas.get("Dia 0") or {}
    saida, achou_atual = [], False
    for i, (ciclo, nome) in enumerate(ETAPAS):
        c = linhas.get(ciclo) or {}
        feita = bool(c.get("enviado_em"))
        # o Dia 0 respondido já dá andamento à primeira etapa
        comecou = bool(c) or (i == 0 and bool(dia0.get("enviado_em")))
        if feita:
            situacao = "Concluída"
        elif comecou and not achou_atual:
            situacao = "Em andamento"
            achou_atual = True
        elif not achou_atual:
            situacao = "Em andamento"
            achou_atual = True
        else:
            situacao = "Próxima etapa" if saida and \
                saida[-1]["situacao"] == "Em andamento" else "Na sequência"
        saida.append({"ciclo": ciclo, "nome": nome, "situacao": situacao,
                      "feita": feita})
    return saida


def etapa_atual(conn, cid):
    for e in etapas(conn, cid):
        if e["situacao"] == "Em andamento":
            return e
    return {"ciclo": ETAPAS[0][0], "nome": ETAPAS[0][1], "situacao": "Em andamento",
            "feita": False}
