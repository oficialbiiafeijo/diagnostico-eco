  /* -------------------------------------------------------- detalhe */
  function abrirDetalhe(cid, ciclo) {
    S.cid = cid; S.ciclo = ciclo || S.ciclo || null;
    api("/api/admin/cliente/" + cid + (S.ciclo ? "?ciclo=" + encodeURIComponent(S.ciclo) : ""))
      .then(function (d) {
        if (d.erro) return toast(d.erro);
        S.det = d; S.ciclo = d.ciclo; S.rota = "detalhe";
        shell(telaDetalhe(d));
      });
  }

  function telaDetalhe(d) {
    var c = d.cliente;
    var wrap = document.createElement("div");

    var volta = el('<button class="btn btn-fantasma btn-sm" style="margin-bottom:14px">← Voltar para o cliente</button>');
    volta.onclick = function () { abrirCliente(d.cliente.id, d.ciclo); };
    wrap.appendChild(volta);

    var cab = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">' + esc(c.segmento || "Cliente") + '</div>' +
      '<h1 class="serif">' + esc(c.empresa) + '</h1>' +
      '<p class="muted small" style="margin:6px 0 0">' + esc(c.responsavel || "—") +
      (c.cargo ? " · " + esc(c.cargo) : "") + (c.contato ? " · " + esc(c.contato) : "") +
      (c.email ? " · " + esc(c.email) : "") + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"></div></div>');
    var acoes = cab.lastChild;
    var bEd = el('<button class="btn btn-linha btn-sm">Editar dados</button>');
    bEd.onclick = function () { modalEditar(c); };
    var bMat = el('<button class="btn btn-ouro btn-sm">Materiais e metodologia</button>');
    bMat.onclick = function () { abrirMateriais(c.id); };
    var bPortal = el('<button class="btn btn-linha btn-sm">' +
      (c.portal_ativo ? "Link do cliente" : "Abrir acompanhamento ao cliente") + '</button>');
    bPortal.onclick = function () { modalPortal(c); };
    var bJson = el('<a class="btn btn-linha btn-sm" href="/api/admin/exportar/' + c.id + '">Exportar JSON</a>');
    var bCsv = el('<a class="btn btn-linha btn-sm" href="/api/admin/exportar-csv/' + c.id + '">Exportar CSV</a>');
    var bCiclo = el('<button class="btn btn-ameixa btn-sm">+ Novo ciclo</button>');
    bCiclo.onclick = function () { modalNovoCiclo(d); };
    var bArq2 = el('<button class="btn btn-fantasma btn-sm">' +
      (c.arquivado ? "Reativar" : "Arquivar") + '</button>');
    bArq2.onclick = function () {
      api("/api/admin/cliente-editar", { id: c.id, arquivado: !c.arquivado })
        .then(function () {
          toast(c.arquivado ? "Cliente reativado" : "Cliente arquivado");
          S.arquivados = false; S.rota = "lista"; carregar();
        });
    };
    var bDel = el('<button class="btn btn-fantasma btn-sm" style="color:var(--critico)">Excluir</button>');
    bDel.onclick = function () { modalExcluir(c); };
    var bCur2 = el('<button class="btn btn-linha btn-sm">Cursos do cliente</button>');
    bCur2.onclick = function () { abrirCursosCliente(c.id); };
    acoes.appendChild(bMat); acoes.appendChild(bCur2); acoes.appendChild(bEd);
    acoes.appendChild(bCiclo); acoes.appendChild(bPortal);
    acoes.appendChild(bJson); acoes.appendChild(bCsv);
    acoes.appendChild(bArq2); acoes.appendChild(bDel);
    wrap.appendChild(cab);

    /* abas de ciclo */
    var ab = el('<div class="abas"></div>');
    d.ciclos.forEach(function (x) {
      var b = el('<button class="' + (x.ciclo === d.ciclo ? "at" : "") + '">' + esc(x.ciclo) +
        ' · ' + x.progresso + '%</button>');
      b.onclick = function () { abrirDetalhe(c.id, x.ciclo); };
      ab.appendChild(b);
    });
    if (d.ciclos.length > 1) {
      var bc = el('<button style="border-style:dashed">⇄ Comparar ciclos</button>');
      bc.onclick = function () { modalComparar(d); };
      ab.appendChild(bc);
    }
    wrap.appendChild(ab);

    var grade = el('<div class="grade"></div>');
    var col1 = document.createElement("div"), col2 = document.createElement("div");

    /* ---- coluna direita: score, status, links, anexos */
    var ciclo = d.ciclos.filter(function (x) { return x.ciclo === d.ciclo; })[0] || {};
    var sc = d.score;
    if (!sc) {
      col2.appendChild(el('<div class="card card-pad" style="margin-bottom:16px">' +
        '<div class="eyebrow">Score ECO</div>' +
        '<p class="small muted" style="margin:8px 0 0">O score é calculado sobre o ' +
        'diagnóstico do Dia 0. Este ciclo é um acompanhamento, então ele mede ' +
        'evolução, não estrutura. Abra o Dia 0 para ver o score.</p></div>'));
    }
    var sCard = sc && el('<div class="score-cartao">' +
      '<div class="eyebrow" style="color:var(--ouro-300)">Score ECO · interno</div>' +
      '<div class="score-geral">' + sc.geral + '<span style="font-size:22px;opacity:.6">/100</span></div>' +
      '<p style="font-size:12.5px;color:rgba(255,255,255,.75);margin:6px 0 16px">' +
      esc(sc.classificacao) + '</p></div>');
    if (sc) ["E", "C", "O"].forEach(function (k) {
      var p = sc.pilares[k];
      sCard.appendChild(el('<div class="score-pil"><span class="l">' + k + '</span>' +
        '<span class="n">' + esc(p.nome) + '</span><span class="t"><i style="width:' + p.score + '%"></i></span>' +
        '<span class="p">' + p.score + '</span></div>'));
    });
    if (sc) {
      sCard.appendChild(el('<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16);' +
        'font-size:12.5px;color:rgba(255,255,255,.8)">Porta de entrada sugerida: ' +
        '<strong style="color:var(--ouro-300)">' + esc(sc.entrada_nome) + '</strong></div>'));
      col2.appendChild(sCard);
    }

    /* o foco do ciclo, que o cliente lê no painel dele */
    var fCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">O cliente lê isto</div>' +
      '<h3 class="serif" style="font-size:21px;color:var(--ameixa-900);margin:6px 0 4px">' +
      'Foco atual</h3>' +
      '<p class="small muted" style="margin:0 0 10px">Uma frase dizendo o que está ' +
      'sendo trabalhado agora. Aparece no painel dele, abaixo da etapa. Se ficar ' +
      'vazio, entra o objetivo do ciclo.</p></div>');
    var fTa = document.createElement("textarea");
    fTa.value = ciclo.foco || "";
    fTa.placeholder = "Organizar o caminho que cada oportunidade percorre até a decisão.";
    fCard.appendChild(fTa);
    var fSt = el('<span class="an-ok" style="margin-top:8px;display:inline-block"></span>');
    var fBt = el('<button class="btn btn-ouro btn-sm" style="margin-top:10px">' +
      'Salvar o foco</button>');
    fBt.onclick = function () {
      api("/api/admin/ciclo-foco", { cliente_id: c.id, ciclo: d.ciclo, foco: fTa.value })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          fSt.textContent = "Salvo, o cliente já vê"; fSt.className = "an-ok on";
        });
    };
    fCard.appendChild(fBt); fCard.appendChild(fSt);
    col2.appendChild(fCard);

    /* status */
    var stCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Status do ciclo ' + esc(d.ciclo) + '</div></div>');
    var sel = document.createElement("select");
    sel.style.marginTop = "10px";
    d.status_possiveis.forEach(function (s) {
      var o = el('<option value="' + esc(s) + '">' + esc(stTexto(s)) + '</option>');
      if (ciclo.status === s) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      api("/api/admin/status", { cliente_id: c.id, ciclo: d.ciclo, status: sel.value })
        .then(function () { toast("Status atualizado"); });
    };
    stCard.appendChild(sel);
    stCard.appendChild(el('<div class="small muted" style="margin-top:12px;line-height:1.9">' +
      'Progresso: <strong>' + (ciclo.progresso || 0) + '%</strong><br>' +
      'Enviado em: ' + dataBr(ciclo.enviado_em) + '<br>' +
      'Obrigatórias em aberto: ' + d.faltando.length + '</div>'));
    col2.appendChild(stCard);

    /* links */
    var lkCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Links individuais</div></div>');
    d.links.forEach(function (l) {
      var it = el('<div style="padding:11px 0;border-top:1px solid var(--linha)">' +
        '<div class="small" style="display:flex;justify-content:space-between;gap:8px">' +
        '<span>' + esc(l.ciclo) + '</span>' +
        '<span class="' + (l.ativo ? "sinal-ok" : "muted") + '">' + (l.ativo ? "ativo" : "desativado") + '</span></div>' +
        '<code style="font-size:10.5px;color:var(--muted);word-break:break-all">' +
        esc(linkDe(l.token)) + '</code>' +
        '<div class="small muted" style="margin-top:5px">' + (l.acessos || 0) + ' acessos · último ' +
        dataBr(l.ultimo_acesso) + (l.preenchido_por ? '<br>preenchido por ' + esc(l.preenchido_por) : '') +
        (l.expira_em ? '<br>expira em ' + dataBr(l.expira_em) : '') + '</div>' +
        '<div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap"></div></div>');
      var barra = it.lastChild;
      var b1 = el('<button class="btn btn-linha btn-sm">Copiar</button>');
      b1.onclick = function () { copiar(linkDe(l.token)); };
      var b2 = el('<button class="btn btn-fantasma btn-sm">' + (l.ativo ? "Desativar" : "Reativar") + '</button>');
      b2.onclick = function () {
        api("/api/admin/link", { acao: l.ativo ? "desativar" : "ativar", token: l.token })
          .then(function () { toast("Link atualizado"); abrirCliente(c.id, d.ciclo); });
      };
      barra.appendChild(b1); barra.appendChild(b2);
      lkCard.appendChild(it);
    });
    var bNovo = el('<button class="btn btn-linha btn-sm" style="margin-top:12px;width:100%">Gerar novo link deste ciclo</button>');
    bNovo.onclick = function () {
      if (!confirm("Gerar um novo link para o ciclo " + d.ciclo + "?\nO link anterior deste ciclo será desativado.")) return;
      api("/api/admin/link", { acao: "novo", cliente_id: c.id, ciclo: d.ciclo })
        .then(function (r) { copiar(linkDe(r.token), "Novo link gerado e copiado"); abrirCliente(c.id, d.ciclo); });
    };
    lkCard.appendChild(bNovo);
    col2.appendChild(lkCard);

    /* anexos */
    var axCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Anexos do cliente · ' + d.anexos.length + '</div></div>');
    if (!d.anexos.length) axCard.appendChild(el('<p class="small muted" style="margin-top:10px">Nenhum arquivo enviado neste ciclo.</p>'));
    d.anexos.forEach(function (x) {
      var ext = (x.nome.split(".").pop() || "?").toUpperCase().slice(0, 4);
      var it = el('<div class="anexo" style="margin-top:10px;padding:10px 12px">' +
        '<div class="anexo-ico" style="width:30px;height:30px;font-size:11px">' + esc(ext) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="anexo-nome" style="font-size:12.5px">' +
        esc(x.nome) + '</div><div class="anexo-meta">' + tamanho(x.tamanho) + ' · ' +
        dataBr(x.enviado_em) + '</div></div></div>');
      it.appendChild(el('<a class="btn btn-fantasma btn-sm" href="/api/anexo/' + x.id + '">Baixar</a>'));
      axCard.appendChild(it);
    });
    col2.appendChild(axCard);

    /* ---- coluna esquerda: abas de conteudo */
    var navAbas = el('<div class="frentes-nav"></div>');
    [["respostas", "Respostas", "◍", "var(--azul-500)"],
     ["rota", "Rota do ciclo", "◆", "var(--terracota-500)"],
     ["equipe", "Equipe do cliente", "◐", "var(--ameixa-600)"],
     ["diagnostico", "Diagnóstico interno", "▦", "var(--ouro-600)"],
     ["notas", "Análise da B3 Sales", "✎", "var(--verde-500)"],
     ["recados", "Recados do cliente", "✉", "var(--ouro-700)"],
     ["historico", "Histórico", "◷", "var(--azul-800)"]].forEach(function (t) {
      var b = el('<button class="frente-b' + (S.aba === t[0] ? " at" : "") + '">' +
        '<span class="frente-i" style="background:' + t[3] + '">' + t[2] + '</span>' +
        '<span>' + t[1] + '</span></button>');
      b.onclick = function () { S.aba = t[0]; shell(telaDetalhe(d)); };
      navAbas.appendChild(b);
    });
    col1.appendChild(navAbas);

    if (S.aba === "respostas") col1.appendChild(painelRespostas(d));
    else if (S.aba === "rota") col1.appendChild(painelRota(d));
    else if (S.aba === "equipe") col1.appendChild(painelEquipe(d));
    else if (S.aba === "diagnostico") col1.appendChild(painelDiagnostico(d));
    else if (S.aba === "notas") col1.appendChild(painelNotas(d));
    else if (S.aba === "recados") col1.appendChild(painelRecados(d));
    else col1.appendChild(painelHistorico(d));

    grade.appendChild(col1); grade.appendChild(col2);
    wrap.appendChild(grade);
    return wrap;
  }

  function textoResp(q, a) {
    if (!a) return "";
    if (a.na) return a.na;
    var v = a.v, s = "";
    if (v === null || v === undefined || v === "") s = "";
    else if (Array.isArray(v)) s = v.join(" · ");
    else if (q.type === "duration") {
      var p = [];
      if (v.anos) p.push(v.anos + " anos");
      if (v.meses) p.push(v.meses + " meses");
      if (v.data) p.push("início " + v.data);
      s = p.join(" e ");
    } else if (q.type === "numgroup") {
      s = (q.fields || []).filter(function (f) { return v[f.id] !== "" && v[f.id] != null; })
        .map(function (f) { return f.label + ": " + v[f.id]; }).join("\n");
    } else if (q.type === "matrix") {
      s = Object.keys(v).filter(function (r) { return v[r].resp; }).map(function (r) {
        return r + " → " + v[r].resp + (v[r].qtd ? " (" + v[r].qtd + " pessoa(s))" : "") +
          (v[r].subst ? " · substituto: " + v[r].subst : "");
      }).join("\n");
    } else if (q.type === "currency") s = "R$ " + v;
    else s = String(v) + (q.unit && q.type !== "currency" ? " " + q.unit : "");
    if (a.outro) s += (s ? " — " : "") + a.outro;
    if (a.extra) s += (s ? "\n↳ " : "") + a.extra;
    return s;
  }

  function painelRespostas(d) {
    var box = document.createElement("div");
    d.blocos.forEach(function (b) {
      var card = el('<div class="card card-pad" style="margin-bottom:16px">' +
        '<div class="eyebrow">' + esc(b.eyebrow) + '</div>' +
        '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
        esc(b.title) + '</h2></div>');
      b.questions.forEach(function (q) {
        var a = d.respostas[q.id];
        var t = textoResp(q, a);
        var it = el('<div class="resp-item"><div class="resp-p">' + esc(q.label) + '</div>' +
          '<div class="resp-v' + (t ? "" : " vazio") + '">' + (t ? esc(t) : "Não respondida") + '</div></div>');
        if (q.admin) {
          var adm = q.admin;
          it.appendChild(el('<div class="resp-adm"><span class="interno-tag">Uso interno · não visível ao cliente</span>' +
            (adm.indicador ? '<div><b>Indicador:</b> ' + esc(adm.indicador) + '</div>' : '') +
            (adm.objetivo ? '<div><b>Objetivo:</b> ' + esc(adm.objetivo) + '</div>' : '') +
            (adm.analise ? '<div><b>Análise:</b> ' + esc(adm.analise) + '</div>' : '') + '</div>'));
        }
        card.appendChild(it);
      });
      box.appendChild(card);
    });
    return box;
  }

  function painelDiagnostico(d) {
    var box = document.createElement("div");
    var ind = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Indicadores calculados</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'O que os números <em class="grifo">mostram</em></h2></div>');
    if (!d.indicadores.length) ind.appendChild(el('<p class="muted small">Ainda não há números suficientes para calcular indicadores.</p>'));
    d.indicadores.forEach(function (i) {
      ind.appendChild(el('<div class="ind"><div><strong>' + esc(i.nome) + '</strong>' +
        (i.ref ? '<div class="small muted">referência: ' + esc(i.ref) + '</div>' : '') +
        (i.obs ? '<div class="small ' + (i.sinal ? "sinal-" + i.sinal : "muted") + '">' + esc(i.obs) + '</div>' : '') +
        '</div><div class="v ' + (i.sinal ? "sinal-" + i.sinal : "") + '">' + esc(i.valor) + '</div></div>'));
    });
    box.appendChild(ind);

    var g = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Gargalos identificados · ordenados por peso</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'Onde a operação <em class="grifo">vaza</em></h2></div>');
    var gargalos = (d.score && d.score.gargalos) || [];
    if (!gargalos.length) g.appendChild(el('<p class="muted small">Os gargalos estruturais são lidos no diagnóstico do Dia 0.</p>'));
    gargalos.forEach(function (x) {
      g.appendChild(el('<div class="garg"><div class="peso">' + x.peso + '</div>' +
        '<div><strong>' + esc(x.rotulo) + '</strong>' +
        '<div class="small muted">Pilar: ' + esc(x.pilar_nome) + '</div></div></div>'));
    });
    box.appendChild(g);

    if (d.nao_informados.length) {
      var ni = el('<div class="card card-pad">' +
        '<div class="eyebrow">Dados que a empresa não acompanha</div>' +
        '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 6px">' +
        'A ausência também é <em class="grifo">diagnóstico</em></h2>' +
        '<p class="small muted" style="margin-bottom:12px">' + d.nao_informados.length +
        ' respostas marcadas como não acompanhadas. Isso mede a maturidade de gestão.</p></div>');
      d.nao_informados.forEach(function (x) {
        ni.appendChild(el('<div class="ind"><div><strong>' + esc(x.label) + '</strong>' +
          '<div class="small muted">' + esc(x.bloco) + '</div></div>' +
          '<div class="small sinal-atencao" style="white-space:nowrap">' + esc(x.motivo) + '</div></div>'));
      });
      box.appendChild(ni);
    }
    return box;
  }

  function painelNotas(d) {
    var a = d.analise || {};
    var card = el('<div class="card card-pad">' +
      '<div class="eyebrow">Uso interno · o cliente nunca vê este conteúdo</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 18px">' +
      'Análise do <em class="grifo">Grupo B3 Sales</em></h2></div>');
    var campos = [
      ["gargalos", "Gargalos priorizados", "Quais gargalos atacar primeiro e por quê."],
      ["prioridades", "Prioridades do ciclo", "O que será implementado neste ciclo."],
      ["proximo_foco", "Próximo foco de implementação", "O que entra no ciclo seguinte."],
      ["notas", "Observações internas", "Contexto, percepções da reunião, alertas."],
    ];
    var refs = {};
    campos.forEach(function (c) {
      card.appendChild(el('<label class="small" style="color:var(--ameixa-700);font-weight:500;' +
        'margin-top:16px;display:block">' + c[1] + '</label>'));
      card.appendChild(el('<p class="small muted" style="margin:2px 0 7px">' + c[2] + '</p>'));
      var ta = document.createElement("textarea");
      ta.value = a[c[0]] || "";
      refs[c[0]] = ta;
      card.appendChild(ta);
    });
    var salvar = el('<button class="btn btn-ouro" style="margin-top:20px">Salvar análise</button>');
    var aviso = el('<span class="an-ok"></span>');
    var linhaSalvar = el('<div style="display:flex;align-items:center;gap:12px;margin-top:20px"></div>');
    linhaSalvar.appendChild(salvar); linhaSalvar.appendChild(aviso);
    salvar.onclick = function () {
      var body = { cliente_id: d.cliente.id, ciclo: d.ciclo };
      campos.forEach(function (c) { body[c[0]] = refs[c[0]].value; });
      salvar.disabled = true; salvar.textContent = "Salvando…";
      api("/api/admin/analise", body).then(function (r) {
        salvar.disabled = false; salvar.textContent = "Salvar análise";
        if (r && r.erro) return toast(r.erro);
        aviso.textContent = "Registrado em " + dataBr(r.em || new Date().toISOString());
        aviso.className = "an-ok on";
        toast("Análise registrada");
        S.aba = "notas"; abrirDetalhe(d.cliente.id, d.ciclo);
      });
    };
    card.appendChild(linhaSalvar);
    if (a.atualizado_em) {
      card.appendChild(el('<p class="small muted" style="margin-top:10px">Última atualização: ' +
        dataBr(a.atualizado_em) + '</p>'));
    }

    /* cada salvamento vira um registro com data, que fica guardado aqui */
    var regs = d.analise_notas || [];
    var lista = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Registrado ao longo do tempo</div>' +
      '<h2 class="serif" style="font-size:25px;color:var(--ameixa-900);margin:6px 0 4px">' +
      'Observações do <em class="grifo">ciclo</em></h2>' +
      '<p class="small muted" style="margin:0 0 14px">Cada vez que você salva, fica guardado ' +
      'com a data. Assim dá para reler o que foi dito em cada reunião.</p></div>');
    if (!regs.length) {
      lista.appendChild(el('<p class="muted small">Nenhum registro ainda neste ciclo.</p>'));
    }
    var rotulos = { gargalos: "Gargalos priorizados", prioridades: "Prioridades do ciclo",
                    proximo_foco: "Próximo foco", notas: "Observações internas" };
    regs.forEach(function (n) {
      var bl = el('<div class="an-reg"></div>');
      bl.appendChild(el('<div class="an-reg-topo"><span class="an-reg-data">' +
        dataBr(n.criado_em) + '</span>' +
        (n.autor ? '<span class="small muted">por ' + esc(n.autor) + '</span>' : '') +
        '</div>'));
      Object.keys(rotulos).forEach(function (k) {
        if (!(n[k] || "").trim()) return;
        bl.appendChild(el('<div class="an-reg-c"><b>' + rotulos[k] + '</b>' +
          '<p>' + esc(n[k]) + '</p></div>'));
      });
      var bx = el('<button class="btn btn-fantasma btn-sm">Apagar registro</button>');
      bx.onclick = function () {
        api("/api/admin/analise-apagar", { id: n.id }).then(function () {
          toast("Registro apagado"); S.aba = "notas"; abrirDetalhe(d.cliente.id, d.ciclo);
        });
      };
      bl.appendChild(bx);
      lista.appendChild(bl);
    });
    var fora = el('<div></div>');
    fora.appendChild(card); fora.appendChild(lista);
    return fora;
  }

  /* O que o cliente escreveu no portal, direto para quem cuida da conta. */
  function painelRecados(d) {
    var card = el('<div class="card card-pad">' +
      '<div class="eyebrow">Vindo do portal do cliente</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 4px">' +
      'Recados de <em class="grifo">' + esc(d.cliente.empresa) + '</em></h2>' +
      '<p class="small muted" style="margin:0 0 16px">Pedidos, dúvidas e informações que ' +
      'ele mandou pelo canal de atendimento. Ele não vê nada do que está por aqui.</p></div>');
    var msgs = d.recados || [];
    if (!msgs.length) {
      card.appendChild(el('<p class="muted small">Nenhum recado até agora.</p>'));
      return card;
    }
    msgs.forEach(function (m) {
      card.appendChild(el('<div class="an-reg">' +
        '<div class="an-reg-topo"><span class="an-reg-data">' + dataBr(m.criado_em) + '</span>' +
        (m.assunto ? '<span class="small muted">' + esc(m.assunto) + '</span>' : '') +
        (m.autor ? '<span class="small muted">por ' + esc(m.autor) + '</span>' : '') +
        '</div><div class="an-reg-c"><p>' + esc(m.texto) + '</p></div></div>'));
    });
    return card;
  }

  function painelHistorico(d) {
    var qm = {};
    d.blocos.forEach(function (b) { b.questions.forEach(function (q) { qm[q.id] = q.label; }); });
    var card = el('<div class="card card-pad">' +
      '<div class="eyebrow">Últimas 60 alterações</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'Histórico de <em class="grifo">preenchimento</em></h2></div>');
    if (!d.historico.length) card.appendChild(el('<p class="muted small">Nenhuma alteração registrada.</p>'));
    d.historico.forEach(function (h) {
      var novo = "";
      try { var o = JSON.parse(h.novo); novo = o && (o.na || (Array.isArray(o.v) ? o.v.join(" · ") : typeof o.v === "object" ? JSON.stringify(o.v) : o.v)); } catch (e) { novo = h.novo; }
      card.appendChild(el('<div class="ind"><div><strong>' + esc(qm[h.qid] || h.qid) + '</strong>' +
        '<div class="small muted" style="white-space:pre-wrap">' + esc(String(novo || "").slice(0, 180)) + '</div></div>' +
        '<div class="small muted" style="white-space:nowrap">' + dataBr(h.em) + '</div></div>'));
    });

    /* a linha do tempo do que a B3 Sales registrou, junto do que o cliente respondeu */
    var regs = d.analise_notas || [], msgs = d.recados || [];
    if (regs.length || msgs.length) {
      var linha = el('<div class="card card-pad" style="margin-top:16px">' +
        '<div class="eyebrow">Reuniões e recados</div>' +
        '<h2 class="serif" style="font-size:25px;color:var(--ameixa-900);margin:6px 0 14px">' +
        'A conversa, <em class="grifo">mês a mês</em></h2></div>');
      var itens = regs.map(function (r) {
        var partes = [r.gargalos, r.prioridades, r.proximo_foco, r.notas]
          .filter(function (x) { return (x || "").trim(); });
        return { em: r.criado_em, quem: "Análise da B3 Sales",
                 texto: partes.join("  ·  "), cor: "var(--verde-500)" };
      }).concat(msgs.map(function (m) {
        return { em: m.criado_em, quem: "Recado de " + (m.autor || "cliente"),
                 texto: (m.assunto ? m.assunto + ": " : "") + m.texto,
                 cor: "var(--ouro-700)" };
      }));
      itens.sort(function (a, b) { return a.em < b.em ? 1 : -1; });
      itens.forEach(function (i) {
        linha.appendChild(el('<div class="ind">' +
          '<div><strong style="color:' + i.cor + '">' + esc(i.quem) + '</strong>' +
          '<div class="small muted" style="white-space:pre-wrap">' +
          esc(i.texto.slice(0, 240)) + '</div></div>' +
          '<div class="small muted" style="white-space:nowrap">' + dataBr(i.em) +
          '</div></div>'));
      });
      var fora = el('<div></div>');
      fora.appendChild(card); fora.appendChild(linha);
      return fora;
    }
    return card;
  }

