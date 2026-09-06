# -*- coding: utf-8 -*-
"""
Rota de implementação: transforma o diagnóstico em plano de ação.

O motor de análise já sabe apontar o pilar mais fraco e listar os gargalos
ordenados por peso. Aqui cada gargalo vira uma ação concreta, com o nome
que a B3 Sales usa na reunião.

A rota é uma sugestão de partida. Tudo pode ser reescrito, reordenado ou
apagado no painel, e o que a B3 Sales escrever manda sobre o automático.
"""
from __future__ import annotations

import secrets

import analise

# Para cada regra do score, a ação que resolve aquele gargalo.
# A chave é o "regra" que analise.score() devolve dentro de cada gargalo.
ACOES = {
    # ---------------------------------------------------------- Estratégia
    "icp": ("Definir o cliente ideal por escrito",
            "Descrever perfil, dor, poder de compra e momento de compra. "
            "Sem isso, todo script e toda campanha viram tentativa."),
    "icp_doc": ("Documentar o cliente ideal para a equipe",
                "O perfil precisa sair da cabeça da liderança e virar material "
                "que qualquer pessoa do time consulta."),
    "valor": ("Construir a proposta de valor",
              "Por que este cliente escolhe você e não o concorrente. "
              "Uma frase que a equipe inteira saiba repetir."),
    "meta": ("Definir a meta comercial do mês",
             "Meta em faturamento e em quantidade de vendas. "
             "Operação sem meta não tem como saber se está indo bem."),
    "meta_equipe": ("Levar a meta para a equipe",
                    "Cada pessoa precisa saber o número do mês e o que "
                    "depende dela para chegar lá."),
    "canais": ("Abrir um segundo canal de aquisição",
               "Depender de um canal só deixa o faturamento exposto. "
               "Escolha o segundo canal e defina a rotina dele."),

    # ------------------------------------------------------------ Condução
    "vox": ("Reduzir o tempo de resposta",
            "Definir quem responde, em quanto tempo e por onde. "
            "Velocidade no primeiro contato é o que mais muda conversão."),
    "script": ("Escrever o roteiro de atendimento",
               "Um roteiro que a equipe siga de verdade, do primeiro "
               "contato até a proposta."),
    "qualif": ("Criar a etapa de qualificação",
               "Definir o que precisa ser entendido antes de falar preço: "
               "necessidade, urgência, decisão e investimento."),
    "agenda": ("Colocar a etapa de agendamento na jornada",
               "Entre o interesse e a proposta precisa existir uma conversa marcada."),
    "aquec": ("Criar o aquecimento antes da reunião",
              "Confirmação e lembrete entre o agendamento e o encontro, "
              "para derrubar o não comparecimento."),
    "proposta": ("Passar a apresentar a proposta ao vivo",
                 "Proposta enviada sem conversa vira comparação de preço."),
    "followup": ("Estruturar a cadência de follow up",
                 "Quantos contatos, em quais dias e por qual canal. "
                 "Registrado, para não depender de memória."),
    "perda": ("Registrar o motivo de cada perda",
              "Sem motivo de perda registrado não dá para saber o que corrigir."),
    "reativ": ("Criar a rotina de reativação da base",
               "A base que já existe costuma ser a venda mais rápida do mês."),

    # ------------------------------------------------------------ Operação
    "crm": ("Colocar a operação dentro de um registro único",
            "Um lugar só onde toda oportunidade é registrada e atualizada."),
    "rotina": ("Criar a rotina de acompanhamento",
               "Um encontro fixo por semana para olhar número e destravar "
               "oportunidade parada."),
    "kpi": ("Definir os indicadores do mês",
            "Escolher os poucos números que a operação vai acompanhar "
            "e onde eles ficam visíveis."),
    "treino": ("Montar a trilha de treinamento",
               "Material que permita treinar alguém novo sem começar do zero."),
    "doc": ("Documentar o processo comercial",
            "Escrever o passo a passo. Documento é o que faz o processo "
            "sobreviver à saída de uma pessoa."),
    "gestao": ("Instalar o acompanhamento diário do resultado",
               "Olhar o número todo dia é o que permite corrigir dentro do mês."),
    "dependencia": ("Reduzir a dependência da liderança",
                    "Transferir etapas do processo para o time, uma de cada vez, "
                    "começando pelas mais repetitivas."),
}

# Quantas ações a rota sugere por ciclo. Mais que isso ninguém executa.
LIMITE = 5


def sugerir(respostas: dict, limite: int = LIMITE) -> list:
    """Devolve as ações sugeridas para o ciclo, da mais pesada para a mais leve."""
    s = analise.score(respostas)
    if not s:
        return []
    saida = []
    for g in s["gargalos"][:limite]:
        titulo, detalhe = ACOES.get(
            g["regra"], (g["rotulo"], "Tratar este ponto no próximo ciclo."))
        saida.append({"pilar": g["pilar"], "pilar_nome": g["pilar_nome"],
                      "regra": g["regra"], "peso": g["peso"],
                      "titulo": titulo, "detalhe": detalhe})
    return saida


def gerar(conn, cliente_id: str, ciclo: str, respostas: dict, agora: str,
          substituir: bool = False) -> dict:
    """Grava a rota do ciclo. Preserva o que a B3 Sales escreveu à mão."""
    if substituir:
        conn.execute("DELETE FROM acoes WHERE cliente_id=? AND ciclo=? AND origem='auto'",
                     (cliente_id, ciclo))
    ja = {r["regra"] for r in conn.execute(
        "SELECT regra FROM acoes WHERE cliente_id=? AND ciclo=?", (cliente_id, ciclo))
        if r["regra"]}
    sugestoes = sugerir(respostas)
    novas = 0
    ordem = conn.execute("SELECT COALESCE(MAX(ordem),0) n FROM acoes "
                         "WHERE cliente_id=? AND ciclo=?",
                         (cliente_id, ciclo)).fetchone()["n"]
    for a in sugestoes:
        if a["regra"] in ja:
            continue
        ordem += 1
        novas += 1
        conn.execute(
            "INSERT INTO acoes(id,cliente_id,ciclo,pilar,regra,titulo,detalhe,ordem,"
            "origem,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (secrets.token_hex(8), cliente_id, ciclo, a["pilar"], a["regra"],
             a["titulo"], a["detalhe"], ordem, "auto", agora, agora))
    conn.commit()
    s = analise.score(respostas)
    return {"novas": novas, "total": len(sugestoes),
            "pilar_entrada": s["entrada_nome"] if s else None,
            "classificacao": s["classificacao"] if s else None}


def listar(conn, cliente_id: str, ciclo: str) -> list:
    return [dict(r) for r in conn.execute(
        "SELECT * FROM acoes WHERE cliente_id=? AND ciclo=? ORDER BY ordem, criado_em",
        (cliente_id, ciclo))]
