# -*- coding: utf-8 -*-
"""Motor de analise interna da B3 Sales. Nada aqui e exibido ao cliente."""

from questions import question_map


def _v(ans, qid):
    a = ans.get(qid) or {}
    return a.get("v")


def _na(ans, qid):
    a = ans.get(qid) or {}
    return a.get("na")


def _num(ans, qid):
    v = _v(ans, qid)
    try:
        if v in (None, ""):
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _list(ans, qid):
    v = _v(ans, qid)
    if isinstance(v, list):
        return v
    if v in (None, ""):
        return []
    return [v]


def indicadores(ans):
    """Indicadores derivados dos numeros informados."""
    out = []

    def add(nome, valor, ref=None, sinal=None, obs=""):
        out.append({"nome": nome, "valor": valor, "ref": ref, "sinal": sinal, "obs": obs})

    leads = _num(ans, "n_leads")
    atend = _num(ans, "n_atendidos")
    agend = _num(ans, "n_agendamentos")
    comp = _num(ans, "n_comparecimentos")
    noshow = _num(ans, "n_noshow")
    prop = _num(ans, "n_propostas")
    vendas = _num(ans, "n_vendas")
    ticket = _num(ans, "n_ticket")
    fat = _num(ans, "n_faturamento")
    base = _num(ans, "n_base_total")
    recup = _num(ans, "n_recuperadas")
    invest = _num(ans, "n_invest_marketing")
    ativos = _num(ans, "n_clientes_ativos")
    recorr = _num(ans, "n_clientes_recorrentes")

    if leads and atend is not None:
        p = atend / leads * 100
        add("Taxa de atendimento", f"{p:.0f}%", "acima de 90%",
            "critico" if p < 70 else ("atencao" if p < 90 else "ok"),
            f"{leads - atend:.0f} leads por mês sem resposta." if leads > atend else "")
    if leads and vendas is not None:
        add("Conversão ponta a ponta", f"{vendas / leads * 100:.1f}%", "varia por segmento", None)
    if agend and comp is not None:
        p = comp / agend * 100
        add("Comparecimento", f"{p:.0f}%", "acima de 80%",
            "critico" if p < 60 else ("atencao" if p < 80 else "ok"))
    if agend and noshow is not None:
        p = noshow / agend * 100
        add("No show", f"{p:.0f}%", "abaixo de 20%",
            "critico" if p > 30 else ("atencao" if p > 20 else "ok"))
    if prop and vendas is not None:
        p = vendas / prop * 100
        add("Conversão de proposta", f"{p:.0f}%", "acima de 30%",
            "critico" if p < 20 else ("atencao" if p < 30 else "ok"),
            f"{prop - vendas:.0f} propostas por mês sem fechamento." if prop > vendas else "")
    if ticket and vendas:
        calc = ticket * vendas
        add("Receita comercial calculada", f"R$ {calc:,.0f}".replace(",", "."),
            f"declarado: R$ {fat:,.0f}".replace(",", ".") if fat else None,
            "atencao" if fat and abs(calc - fat) / fat > 0.35 else None,
            "Divergência relevante entre ticket × volume e faturamento declarado."
            if fat and abs(calc - fat) / fat > 0.35 else "")
    if base and recup is not None and recup == 0:
        add("Receita adormecida", f"{base:.0f} contatos", "reativação zerada", "critico",
            "Base existente sem nenhuma reativação no último mês.")
    if invest and vendas:
        add("Custo por venda", f"R$ {invest / vendas:,.0f}".replace(",", "."), None, None)
    if invest and leads:
        add("Custo por lead", f"R$ {invest / leads:,.2f}".replace(".", ","), None, None)
    if ativos and recorr is not None:
        p = recorr / ativos * 100
        add("Recorrência", f"{p:.0f}%", "acima de 30%",
            "critico" if p < 15 else ("atencao" if p < 30 else "ok"))
    if fat and ticket:
        add("Vendas necessárias para a meta", None, None, None)
        meta = _num(ans, "ctx_meta_12m")
        if meta:
            out[-1]["valor"] = f"{meta / ticket:.0f} vendas/mes"
            out[-1]["ref"] = f"hoje: {vendas:.0f}" if vendas else None
            out[-1]["sinal"] = "atencao" if vendas and meta / ticket > vendas * 2.5 else None
            out[-1]["obs"] = ("Meta exige mais que o dobro do volume atual sem mudança de ticket."
                              if vendas and meta / ticket > vendas * 2.5 else "")
        else:
            out.pop()
    return out


# Regras de score por pilar: (id, funcao(ans) -> bool ok, peso, rotulo do gargalo)
def _regras():
    return {
        "E": [
            ("icp", lambda a: bool(_v(a, "e_icp")) and len(str(_v(a, "e_icp"))) > 60, 2,
             "Cliente ideal sem definição clara"),
            ("icp_doc", lambda a: _v(a, "e_icp_documentado") == "Sim", 1,
             "ICP não documentado para a equipe"),
            ("valor", lambda a: bool(_v(a, "e_diferencial")) and len(str(_v(a, "e_diferencial"))) > 50, 2,
             "Proposta de valor frágil"),
            ("meta", lambda a: _v(a, "e_meta_definida") == "Sim", 3,
             "Empresa opera sem meta comercial"),
            ("meta_equipe", lambda a: _v(a, "e_meta_equipe") == "Sim", 2,
             "Equipe não conhece a meta"),
            ("canais", lambda a: len(_list(a, "e_canais")) >= 2, 2,
             "Aquisição concentrada em um único canal"),
        ],
        "C": [
            ("vox", lambda a: _v(a, "c_tempo_resposta") in
             ("Até 5 minutos", "De 5 a 30 minutos"), 3,
             "Velocidade de contato acima do limite"),
            ("script", lambda a: _v(a, "c_script") == "Sim, escrito e seguido por todos", 3,
             "Atendimento sem padrão escrito"),
            ("qualif", lambda a: len([x for x in _list(a, "c_qualificacao")
                                      if x != "Nenhuma, já mandamos o preço"]) >= 3, 3,
             "Preço apresentado sem qualificação"),
            ("agenda", lambda a: _v(a, "c_agendamento") == "Sim", 1,
             "Jornada sem etapa de agendamento"),
            ("aquec", lambda a: bool([x for x in _list(a, "c_confirmacao") if x != "Nada é feito"]), 2,
             "Sem aquecimento entre agendamento e reunião"),
            ("proposta", lambda a: str(_v(a, "c_proposta") or "").startswith("Apresentada ao vivo"), 2,
             "Proposta enviada sem apresentação"),
            ("followup", lambda a: _v(a, "c_followup_existe") ==
             "Sim, com cadência definida e registrada", 3,
             "Follow up sem cadência estruturada"),
            ("perda", lambda a: _v(a, "c_motivo_perda") == "Sim", 2,
             "Motivo de perda não é registrado"),
            ("reativ", lambda a: _v(a, "c_reativacao") == "Sim, com rotina definida", 2,
             "Base de clientes sem rotina de reativação"),
        ],
        "O": [
            ("crm", lambda a: _v(a, "o_crm") == "Sim, e toda a equipe usa todos os dias", 3,
             "Operação sem registro confiável de oportunidade"),
            ("rotina", lambda a: bool([x for x in _list(a, "o_rotina")
                                       if x != "Nenhuma rotina definida"]), 3,
             "Ausência de rotina de acompanhamento"),
            ("kpi", lambda a: len([x for x in _list(a, "o_indicadores")
                                   if x != "Nenhum indicador"]) >= 4, 3,
             "Gestão por percepção, sem indicadores"),
            ("treino", lambda a: str(_v(a, "o_treinamento") or "").startswith("Temos material"), 2,
             "Sem trilha de treinamento replicável"),
            ("doc", lambda a: len([x for x in _list(a, "o_documentacao")
                                   if x != "Nada está documentado"]) >= 3, 2,
             "Processo não documentado"),
            ("gestao", lambda a: _v(a, "o_gestao") == "Sim", 3,
             "Sem acompanhamento diário de resultado"),
            ("dependencia", lambda a: _v(a, "est_dona_participa") in
             ("Não participa da operação diária", "Participa apenas de negociações específicas"), 3,
             "Operação dependente da liderança"),
        ],
    }


PILARES = {"E": "Estratégia", "C": "Condução", "O": "Operação"}


def aplicavel(ans):
    """O score foi escrito sobre as perguntas do Dia 0.

    Nos acompanhamentos mensais as perguntas sao outras, entao as regras nao
    encontrariam nada e devolveriam zero por cento com gargalos inventados.
    Antes de pontuar, conferimos se as respostas sao mesmo do diagnostico.
    """
    marcadores = ("e_meta_definida", "c_script", "o_crm", "e_icp", "c_followup_existe")
    return any(m in ans for m in marcadores)


def score(ans):
    if not aplicavel(ans):
        return None
    regras = _regras()
    res = {}
    gargalos = []
    for p, lista in regras.items():
        ganho = 0
        total = 0
        for rid, fn, peso, rotulo in lista:
            total += peso
            try:
                ok = bool(fn(ans))
            except Exception:
                ok = False
            if ok:
                ganho += peso
            else:
                gargalos.append({"pilar": p, "pilar_nome": PILARES[p],
                                 "peso": peso, "rotulo": rotulo, "regra": rid})
        res[p] = {"nome": PILARES[p],
                  "score": round(ganho / total * 100) if total else 0,
                  "pontos": ganho, "total": total}
    geral = round(sum(r["score"] for r in res.values()) / 3)
    gargalos.sort(key=lambda g: -g["peso"])
    fraco = min(res.items(), key=lambda kv: kv[1]["score"])[0]
    return {"pilares": res, "geral": geral, "gargalos": gargalos,
            "entrada": fraco, "entrada_nome": PILARES[fraco],
            "classificacao": _classificar(geral)}


def _classificar(g):
    if g < 30:
        return "Operação informal. A estrutura precisa ser construída"
    if g < 50:
        return "Operação em formação. Existe base, falta padrão"
    if g < 70:
        return "Operação organizada. Falta gestão por indicador"
    if g < 85:
        return "Operação madura. Hora do ajuste fino e da escala"
    return "Operação consolidada. Foco em previsibilidade"


def nao_informados(ans, ciclo=None):
    """Perguntas em que a empresa declarou nao acompanhar o dado."""
    qm = question_map(ciclo)
    out = []
    for qid, a in ans.items():
        if a and a.get("na"):
            b, q = qm.get(qid, (None, None))
            if q:
                out.append({"qid": qid, "label": q["label"], "motivo": a["na"],
                            "bloco": b["title"]})
    return out
