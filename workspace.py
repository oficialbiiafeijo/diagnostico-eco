# -*- coding: utf-8 -*-
"""
Espaço de materiais e metodologia.

Cada cliente tem páginas. Cada página tem blocos. O bloco guarda seu conteúdo
em JSON, no formato que o tipo dele pede.

Escolhas de desenho, pensadas para uso diário e leitura confortável:

  - cada bloco de texto é um campo próprio, não um editor de página inteira.
    Colar de qualquer lugar não traz sujeira junto e nada some.
  - reordenar é com seta para cima e para baixo, não arrastando.
  - imagens e arquivos reaproveitam os anexos que já existiam no sistema.
"""
from __future__ import annotations

import json
import secrets

# tipo -> (rótulo no menu, ícone, conteúdo inicial)
TIPOS = {
    "titulo":   ("Título", "H", {"texto": ""}),
    "texto":    ("Texto", "T", {"texto": ""}),
    "destaque": ("Destaque", "!", {"texto": "", "tom": "ouro"}),
    "lista":    ("Lista", "•", {"itens": [""]}),
    "tabela":   ("Tabela", "▦", {"colunas": ["", ""], "linhas": [["", ""]]}),
    "imagem":   ("Imagem", "▣", {"anexo_id": "", "legenda": ""}),
    "arquivo":  ("Arquivo", "⇩", {"anexo_id": "", "titulo": ""}),
    "link":     ("Link", "↗", {"url": "", "titulo": "", "descricao": ""}),
    "divisor":  ("Divisor", "—", {}),
}

# Capas padrão por pilar, para a página já nascer com cara de material da casa.
CAPAS = [
    {"id": "estrategia", "nome": "Estratégia",
     "css": "linear-gradient(135deg,#241030,#5A3A6E 62%,#8E6FA3)"},
    {"id": "conducao", "nome": "Condução",
     "css": "linear-gradient(135deg,#472B60,#A8803F 68%,#E6CB98)"},
    {"id": "operacao", "nome": "Operação",
     "css": "linear-gradient(135deg,#7E3A24,#C2683F 60%,#E2A183)"},
    {"id": "ouro", "nome": "Dourado",
     "css": "linear-gradient(135deg,#8A6530,#CFA467 58%,#F5E9D2)"},
    {"id": "ameixa", "nome": "Ameixa",
     "css": "linear-gradient(135deg,#241030,#472B60 70%,#C9B4D6)"},
    {"id": "creme", "nome": "Creme",
     "css": "linear-gradient(135deg,#EDE0D6,#FAF3EC 60%,#FFFCF9)"},
]

# Estrutura sugerida quando a B3 Sales cria o espaço de um cliente novo.
MODELO_INICIAL = [
    ("Diagnóstico e leitura do negócio", "estrategia",
     "O retrato do que encontramos e a leitura que fizemos."),
    ("Cliente ideal e proposta de valor", "estrategia",
     "Quem esta empresa atende melhor e por que escolhem ela."),
    ("Processo comercial", "conducao",
     "A jornada do lead, etapa por etapa, do primeiro contato ao fechamento."),
    ("Scripts e abordagem", "conducao",
     "O que a equipe fala em cada momento da conversa."),
    ("Indicadores e rotina de gestão", "operacao",
     "Os números que acompanhamos e os encontros que sustentam o processo."),
    ("Treinamentos e materiais", "operacao",
     "O que já foi treinado e o material que ficou com a equipe."),
]


def _agora_ordem(conn, cliente_id):
    r = conn.execute("SELECT COALESCE(MAX(ordem),0)+1 n FROM ws_paginas WHERE cliente_id=?",
                     (cliente_id,)).fetchone()
    return r["n"]


def criar_pagina(conn, cliente_id, titulo, agora, capa="", descricao="", ordem=None):
    pid = secrets.token_hex(8)
    conn.execute(
        "INSERT INTO ws_paginas(id,cliente_id,titulo,capa,ordem,criado_em,atualizado_em) "
        "VALUES(?,?,?,?,?,?,?)",
        (pid, cliente_id, titulo, capa,
         ordem if ordem is not None else _agora_ordem(conn, cliente_id), agora, agora))
    if descricao:
        conn.execute("INSERT INTO ws_blocos(id,pagina_id,tipo,ordem,conteudo,atualizado_em) "
                     "VALUES(?,?,?,?,?,?)",
                     (secrets.token_hex(8), pid, "texto", 1,
                      json.dumps({"texto": descricao}, ensure_ascii=False), agora))
    conn.commit()
    return pid


def montar_modelo(conn, cliente_id, agora):
    """Cria a estrutura sugerida. Tudo pode ser renomeado ou apagado depois."""
    criadas = []
    for i, (titulo, capa, desc) in enumerate(MODELO_INICIAL, start=1):
        criadas.append(criar_pagina(conn, cliente_id, titulo, agora, capa, desc, i))
    return criadas


def listar_paginas(conn, cliente_id):
    saida = []
    for r in conn.execute(
            "SELECT * FROM ws_paginas WHERE cliente_id=? ORDER BY ordem, criado_em",
            (cliente_id,)):
        d = dict(r)
        d["blocos"] = conn.execute(
            "SELECT COUNT(*) n FROM ws_blocos WHERE pagina_id=?", (r["id"],)).fetchone()["n"]
        saida.append(d)
    return saida


def ler_pagina(conn, pagina_id):
    p = conn.execute("SELECT * FROM ws_paginas WHERE id=?", (pagina_id,)).fetchone()
    if not p:
        return None
    blocos = []
    for b in conn.execute("SELECT * FROM ws_blocos WHERE pagina_id=? ORDER BY ordem, rowid",
                          (pagina_id,)):
        d = dict(b)
        try:
            d["conteudo"] = json.loads(b["conteudo"] or "{}")
        except ValueError:
            d["conteudo"] = {}
        blocos.append(d)
    return {**dict(p), "blocos": blocos}


def novo_bloco(conn, pagina_id, tipo, agora, depois_de=None):
    if tipo not in TIPOS:
        return None
    base = json.dumps(TIPOS[tipo][2], ensure_ascii=False)
    if depois_de:
        r = conn.execute("SELECT ordem FROM ws_blocos WHERE id=?", (depois_de,)).fetchone()
        pos = (r["ordem"] if r else 0) + 1
        conn.execute("UPDATE ws_blocos SET ordem=ordem+1 WHERE pagina_id=? AND ordem>=?",
                     (pagina_id, pos))
    else:
        r = conn.execute("SELECT COALESCE(MAX(ordem),0)+1 n FROM ws_blocos WHERE pagina_id=?",
                         (pagina_id,)).fetchone()
        pos = r["n"]
    bid = secrets.token_hex(8)
    conn.execute("INSERT INTO ws_blocos(id,pagina_id,tipo,ordem,conteudo,atualizado_em) "
                 "VALUES(?,?,?,?,?,?)", (bid, pagina_id, tipo, pos, base, agora))
    _tocar(conn, pagina_id, agora)
    conn.commit()
    return bid


def mover_bloco(conn, bloco_id, direcao, agora):
    b = conn.execute("SELECT * FROM ws_blocos WHERE id=?", (bloco_id,)).fetchone()
    if not b:
        return False
    op = "<" if direcao == "cima" else ">"
    ordem = "DESC" if direcao == "cima" else "ASC"
    viz = conn.execute(
        f"SELECT * FROM ws_blocos WHERE pagina_id=? AND ordem {op} ? "
        f"ORDER BY ordem {ordem} LIMIT 1", (b["pagina_id"], b["ordem"])).fetchone()
    if not viz:
        return False
    conn.execute("UPDATE ws_blocos SET ordem=? WHERE id=?", (viz["ordem"], b["id"]))
    conn.execute("UPDATE ws_blocos SET ordem=? WHERE id=?", (b["ordem"], viz["id"]))
    _tocar(conn, b["pagina_id"], agora)
    conn.commit()
    return True


def _tocar(conn, pagina_id, agora):
    conn.execute("UPDATE ws_paginas SET atualizado_em=? WHERE id=?", (agora, pagina_id))


def guardar_versao(conn, pagina_id, agora, usuario=""):
    p = ler_pagina(conn, pagina_id)
    if not p:
        return
    conn.execute("INSERT INTO ws_versoes(pagina_id,snapshot,em,usuario) VALUES(?,?,?,?)",
                 (pagina_id, json.dumps(p, ensure_ascii=False), agora, usuario))
    # guardamos as vinte ultimas versoes de cada pagina
    conn.execute(
        "DELETE FROM ws_versoes WHERE pagina_id=? AND id NOT IN "
        "(SELECT id FROM ws_versoes WHERE pagina_id=? ORDER BY id DESC LIMIT 20)",
        (pagina_id, pagina_id))
    conn.commit()
