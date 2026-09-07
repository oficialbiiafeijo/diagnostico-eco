  /* ------------------------------------------------------- visão geral */
  var CORES_CICLO = ["#1B2A4A", "#263A63", "#472B60", "#8E6FA3",
                     "#A8803F", "#C2683F", "#3E7D5A"];

  function rosca(dados, tamanho, centro, legenda) {
    /* dados: [{rotulo, valor, cor}] */
    var total = dados.reduce(function (a, d) { return a + d.valor; }, 0);
    var R = tamanho / 2, r = R * 0.62, cx = R, cy = R;
    var meio = (centro === undefined || centro === null) ? total : centro;
    var rot = legenda || "CLIENTES";
    function moldura(interno) {
      return '<svg viewBox="0 0 ' + tamanho + ' ' + tamanho + '" width="' + tamanho +
        '" height="' + tamanho + '">' + interno +
        '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" ' +
        'style="font-family:var(--serif);font-size:' + (R * 0.52) + 'px;fill:var(--ameixa-900);' +
        'font-variant-numeric:lining-nums tabular-nums;' +
        'font-feature-settings:\'lnum\' 1,\'tnum\' 1">' + meio + '</text>' +
        '<text x="' + cx + '" y="' + (cy + R * 0.28) + '" text-anchor="middle" ' +
        'style="font-size:9px;letter-spacing:.18em;fill:var(--muted)">' + esc(rot) +
        '</text></svg>';
    }
    if (!total) {
      return moldura('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) +
        '" fill="none" stroke="var(--creme-3)" stroke-width="' + (R - r) + '"/>');
    }
    /* um item sozinho fecha a volta inteira: arco de 360 graus não desenha, usamos anel */
    var cheios = dados.filter(function (d) { return d.valor > 0; });
    if (cheios.length === 1) {
      return moldura('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) +
        '" fill="none" stroke="' + cheios[0].cor + '" stroke-width="' + (R - r) +
        '"><title>' + esc(cheios[0].rotulo) + ': ' + cheios[0].valor + '</title></circle>');
    }
    var ang = -Math.PI / 2, partes = "";
    dados.forEach(function (d) {
      if (!d.valor) return;
      var fatia = d.valor / total * Math.PI * 2;
      var fim = ang + fatia;
      var grande = fatia > Math.PI ? 1 : 0;
      var x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
      var x2 = cx + R * Math.cos(fim), y2 = cy + R * Math.sin(fim);
      var x3 = cx + r * Math.cos(fim), y3 = cy + r * Math.sin(fim);
      var x4 = cx + r * Math.cos(ang), y4 = cy + r * Math.sin(ang);
      partes += '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + grande + ' 1 ' +
        x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 ' + grande + ' 0 ' +
        x4 + ' ' + y4 + ' Z" fill="' + d.cor + '"><title>' + esc(d.rotulo) + ': ' +
        d.valor + '</title></path>';
      ang = fim;
    });
    return moldura(partes);
  }

  function barrasPilar(p) {
    var itens = [{ k: "E", n: "Estratégia", v: p.E, c: "var(--azul-500)" },
                 { k: "C", n: "Condução", v: p.C, c: "var(--ouro-600)" },
                 { k: "O", n: "Operação", v: p.O, c: "var(--terracota-500)" }];
    var h = "";
    itens.forEach(function (i) {
      h += '<div class="pil-linha">' +
        '<span class="pil-k">' + i.k + '</span>' +
        '<span class="pil-n">' + i.n + '</span>' +
        '<span class="pil-t"><i style="width:' + Math.max(i.v, 2) + '%;background:' + i.c + '"></i></span>' +
        '<span class="pil-v">' + i.v + '</span></div>';
    });
    return h;
  }

  /* cada empresa ganha um tom próprio, para o olho achar rápido no quadro */
  var TONS = ["linear-gradient(140deg,#472B60,#241030)",
              "linear-gradient(140deg,#263A63,#111E38)",
              "linear-gradient(140deg,#A8803F,#7E5A22)",
              "linear-gradient(140deg,#B25837,#7E3A24)",
              "linear-gradient(140deg,#3E7D5A,#2A5740)",
              "linear-gradient(140deg,#3D5A8F,#1B2A4A)",
              "linear-gradient(140deg,#8E6FA3,#5A3A6E)",
              "linear-gradient(140deg,#C2683F,#7E3A24)"];
  function corDaEmpresa(nome) {
    var n = 0;
    for (var i = 0; i < (nome || "").length; i++) n += nome.charCodeAt(i);
    return TONS[n % TONS.length];
  }

  function telaPainel(d) {
    var wrap = document.createElement("div");
    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Grupo B3 Sales</div>' +
      '<h1 class="serif">Visão geral da <em class="grifo">carteira</em></h1>' +
      '<p class="muted small" style="margin-top:6px">O que já foi implantado, ' +
      'onde a operação está e quem precisa de atenção agora.</p></div></div>'));

    /* faixa de números */
    wrap.appendChild(el('<div class="kpis">' +
      '<div class="kpi"><b>' + d.total + '</b><span>Clientes ativos</span></div>' +
      '<div class="kpi"><b>' + d.diagnosticos_enviados + '</b><span>Diagnósticos respondidos</span></div>' +
      '<div class="kpi"><b>' + d.acoes.concluidas + '<i class="de">/' + d.acoes.total +
        '</i></b><span>Processos implantados</span></div>' +
      '<div class="kpi"><b>' + d.documentos + '</b><span>Documentos recebidos</span></div>' +
      '<div class="kpi"><b>' + d.paginas + '</b><span>Materiais criados</span></div>' +
      '<div class="kpi' + (d.nao_lidos ? ' kpi-alerta' : '') + '"><b>' +
        (d.nao_lidos || 0) + '</b><span>Mensagens novas</span></div>' +
      '</div>'));

    /* fale conosco: o que os clientes escreveram, com atalho para o cartão dele */
    var fc = el('<div class="card card-pad" style="margin-bottom:18px">' +
      '<div class="eyebrow">Fale conosco</div>' +
      '<h2 class="serif tit-card" style="margin-bottom:4px">O que os clientes ' +
      '<em class="grifo">mandaram</em></h2>' +
      '<p class="small muted" style="margin:0 0 14px">Chega por dentro do sistema, ' +
      'pelo acompanhamento de cada um. Clique para abrir o cliente e responder.</p></div>');
    if (!(d.fale_conosco || []).length) {
      fc.appendChild(el('<p class="small muted">Nenhuma mensagem por enquanto.</p>'));
    }
    (d.fale_conosco || []).forEach(function (m) {
      var it = el('<div class="fc-i' + (m.lido ? '' : ' novo') + '">' +
        '<div class="fc-foto" style="' +
        estiloLogo({ logo_midia_id: m.logo_midia_id, logo_ajuste: m.logo_ajuste,
                     empresa: m.empresa }, 38) + '">' +
        (m.logo_midia_id ? '' : esc((m.empresa || "?").slice(0, 1).toUpperCase())) + '</div>' +
        '<div class="fc-t"><strong>' + esc(m.empresa) + '</strong>' +
        (m.assunto ? '<span class="fc-as">' + esc(m.assunto) + '</span>' : '') +
        '<p>' + esc(String(m.texto || "").slice(0, 160)) + '</p></div>' +
        '<div class="fc-d">' + dataBr(m.criado_em) +
        (m.lido ? '' : '<span class="fc-tag">novo</span>') + '</div></div>');
      it.onclick = function () { abrirCliente(m.cliente_id); };
      fc.appendChild(it);
    });
    wrap.appendChild(fc);

    var grade = el('<div class="grade-painel"></div>');

    /* rosca: onde os clientes estão na jornada */
    var dadosCiclo = d.ciclos.map(function (c, i) {
      return { rotulo: c, valor: d.por_ciclo[c] || 0, cor: CORES_CICLO[i % CORES_CICLO.length] };
    });
    var cRosca = el('<div class="card card-pad">' +
      '<div class="eyebrow">Onde cada cliente está</div>' +
      '<h2 class="serif tit-card">A jornada dos <em class="grifo">180 dias</em></h2>' +
      '<div class="rosca-linha"><div class="rosca-svg">' + rosca(dadosCiclo, 168) + '</div>' +
      '<div class="rosca-leg"></div></div></div>');
    var leg = cRosca.querySelector(".rosca-leg");
    dadosCiclo.forEach(function (x) {
      if (!x.valor) return;
      leg.appendChild(el('<div class="leg-item"><i style="background:' + x.cor + '"></i>' +
        '<span>' + esc(x.rotulo) + '</span><b>' + x.valor + '</b></div>'));
    });
    if (!leg.children.length) leg.appendChild(el('<p class="small muted">Nenhum ciclo em andamento.</p>'));
    grade.appendChild(cRosca);

    /* barras: maturidade por pilar */
    grade.appendChild(el('<div class="card card-pad">' +
      '<div class="eyebrow">Maturidade média da carteira</div>' +
      '<h2 class="serif tit-card">Os três pilares do <em class="grifo">ECO</em></h2>' +
      '<div class="pilares-graf">' + barrasPilar(d.pilares) + '</div>' +
      '<div class="score-linha"><span>Score médio</span><b>' + d.score_medio + '<i>/100</i></b></div>' +
      '</div>'));

    /* execução do plano */
    var pct = d.acoes.pct;
    grade.appendChild(el('<div class="card card-pad">' +
      '<div class="eyebrow">Execução do plano</div>' +
      '<h2 class="serif tit-card">O que saiu do <em class="grifo">papel</em></h2>' +
      '<div class="anel-exec">' +
      rosca([{ rotulo: "Concluídas", valor: d.acoes.concluidas, cor: "var(--ouro-600)" },
             { rotulo: "Em aberto", valor: d.acoes.total - d.acoes.concluidas, cor: "#EDE0D6" }],
            140, d.acoes.pct + "%", "CONCLUÍDO") +
      '</div>' +
      '<p class="small muted center" style="margin-top:10px">' + pct +
      '% das ações combinadas já foram concluídas</p></div>'));

    wrap.appendChild(grade);

    /* quem precisa de atenção */
    var atencao = el('<div class="grade-painel dois"></div>');
    var cAtr = el('<div class="card card-pad"><div class="eyebrow">Precisam de atenção</div>' +
      '<h2 class="serif tit-card">Ciclos <em class="grifo">parados</em></h2></div>');
    if (!d.atrasados.length) cAtr.appendChild(el('<p class="small muted">Nenhum ciclo parado. Carteira em dia.</p>'));
    d.atrasados.forEach(function (x) {
      var linha = el('<div class="alerta"><div><strong>' + esc(x.empresa) + '</strong>' +
        '<div class="small muted">' + esc(x.ciclo) + ' sem envio</div></div>' +
        '<span class="selo selo-critico">' + x.dias + ' dias</span></div>');
      linha.onclick = function () { abrirCliente(x.id); };
      cAtr.appendChild(linha);
    });
    atencao.appendChild(cAtr);

    var cSem = el('<div class="card card-pad"><div class="eyebrow">Sem contato</div>' +
      '<h2 class="serif tit-card">Há mais de <em class="grifo">7 dias</em></h2></div>');
    if (!d.sem_contato.length) cSem.appendChild(el('<p class="small muted">Todo mundo acessou nos últimos dias.</p>'));
    d.sem_contato.forEach(function (x) {
      var linha = el('<div class="alerta"><div><strong>' + esc(x.empresa) + '</strong></div>' +
        '<span class="selo selo-atencao">' + x.dias + ' dias</span></div>');
      linha.onclick = function () { abrirCliente(x.id); };
      cSem.appendChild(linha);
    });
    atencao.appendChild(cSem);
    wrap.appendChild(atencao);

    /* carteira em cartões, agrupada pelo ciclo */
    wrap.appendChild(el('<div class="p-sec" style="margin:34px 0 14px">' +
      '<div class="eyebrow">Carteira</div>' +
      '<h2 class="serif tit-card" style="margin-bottom:0">Cada cliente, ' +
      '<em class="grifo">um cartão</em></h2></div>'));

    if (!d.jornada.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:44px 24px">' +
        '<p class="muted small">Nenhum cliente ativo ainda.</p></div>'));
      return wrap;
    }

    var colunas = el('<div class="kanban"></div>');
    d.ciclos.forEach(function (ciclo) {
      var doCiclo = d.jornada.filter(function (j) { return j.ciclo === ciclo; });
      if (!doCiclo.length) return;
      var col = el('<div class="kan-col"><div class="kan-cab">' +
        '<span class="kan-t">' + esc(ciclo) + '</span>' +
        '<span class="kan-n">' + doCiclo.length + '</span></div>' +
        '<div class="kan-lista"></div></div>');
      var lista = col.querySelector(".kan-lista");
      doCiclo.forEach(function (j) {
        var pct = j.acoes ? Math.round(j.acoes_feitas / j.acoes * 100) : 0;
        var avisos = "";
        if (j.dias_sem_contato != null && j.dias_sem_contato > 7) {
          avisos += '<span class="kan-alerta">' + j.dias_sem_contato + ' dias sem falar</span>';
        }
        if (j.dias_contrato != null) {
          var cls = j.dias_contrato < 0 ? "kan-venceu"
                  : j.dias_contrato <= 30 ? "kan-alerta" : "kan-prazo";
          avisos += '<span class="' + cls + '">' +
            (j.dias_contrato < 0 ? "contrato vencido"
              : j.dias_contrato + " dias de contrato") + '</span>';
        }
        var c = el('<div class="kan-card">' +
          '<div class="kan-topo"><span class="kan-ini" style="' +
          estiloLogo(j, 32) + '">' +
          (j.logo_midia_id ? '' : esc((j.empresa || "?").slice(0, 1).toUpperCase())) +
          '</span>' +
          '<div class="kan-nome"><strong>' + esc(j.empresa) + '</strong>' +
          (j.tipo_servico ? '<span class="small muted">' + esc(j.tipo_servico) + '</span>'
            : '<span class="small muted">' + esc(j.segmento || "Sem segmento") + '</span>') +
          '</div></div>' +
          (j.entrada ? '<span class="selo selo-entrada" style="margin-top:10px;display:inline-block">' +
            esc(j.entrada) + '</span>' : '') +
          '<div class="kan-linha"><span>Diagnóstico</span>' +
          '<div class="mini-barra"><i style="width:' + (j.progresso || 0) + '%"></i></div>' +
          '<b>' + (j.progresso || 0) + '%</b></div>' +
          '<div class="kan-linha"><span>Implantação</span>' +
          '<div class="mini-barra"><i style="width:' + pct + '%;background:var(--terracota-500)"></i></div>' +
          '<b>' + j.acoes_feitas + '/' + j.acoes + '</b></div>' +
          '<div class="kan-pe"><span>' + (j.documentos + j.paginas) + ' materiais</span>' +
          '<span class="kan-avisos">' + avisos + '</span></div>');
        c.onclick = function () { abrirCliente(j.id); };
        lista.appendChild(c);
      });
      colunas.appendChild(col);
    });
    wrap.appendChild(colunas);
    return wrap;
  }

  function abrirPainel() {
    api("/api/admin/painel").then(function (d) {
      if (d.erro) return telaLogin();
      S.rota = "painel";
      try { shell(telaPainel(d)); }
      catch (e) { console.error("Falha ao montar a visão geral:", e); }
    });
  }

  /* ----------------------------------------------------------- lista */
  var CAPA_LISTA = {
    estrategia: "linear-gradient(135deg,#241030,#5A3A6E 62%,#8E6FA3)",
    conducao: "linear-gradient(135deg,#472B60,#A8803F 68%,#E6CB98)",
    operacao: "linear-gradient(135deg,#7E3A24,#C2683F 60%,#E2A183)",
    ouro: "linear-gradient(135deg,#8A6530,#CFA467 58%,#F5E9D2)",
    ameixa: "linear-gradient(135deg,#241030,#472B60 70%,#C9B4D6)",
    creme: "linear-gradient(135deg,#EDE0D6,#FAF3EC 60%,#FFFCF9)"
  };

  function telaLista(d) {
    var cs = d.clientes;
    var wrap = document.createElement("div");
    var enviados = cs.filter(function (c) { return c.ja_enviou; }).length;
    var andamento = cs.filter(function (c) { return c.status === "Em preenchimento"; }).length;
    var anexos = cs.reduce(function (a, c) { return a + c.anexos; }, 0);

    var topo = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Grupo B3 Sales</div>' +
      '<h1 class="serif">Diagnósticos <em class="grifo">' +
      (S.arquivados ? 'arquivados' : 'em carteira') + '</em></h1></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"></div></div>');
    var bArq = el('<button class="btn btn-linha">' +
      (S.arquivados ? "← Clientes ativos" : "Ver arquivados") + '</button>');
    bArq.onclick = function () { S.arquivados = !S.arquivados; carregar(); };
    topo.lastChild.appendChild(bArq);
    var bn = el('<button class="btn btn-ouro">+ Novo cliente</button>');
    bn.onclick = modalNovoCliente;
    topo.lastChild.appendChild(bn);
    wrap.appendChild(topo);

    wrap.appendChild(el('<div class="kpis">' +
      '<div class="kpi"><b>' + cs.length + '</b><span>Clientes</span></div>' +
      '<div class="kpi"><b>' + andamento + '</b><span>Preenchendo</span></div>' +
      '<div class="kpi"><b>' + enviados + '</b><span>Enviados</span></div>' +
      '<div class="kpi"><b>' + anexos + '</b><span>Anexos recebidos</span></div>' +
      '</div>'));

    if (!cs.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:60px 24px">' +
        '<h2 class="serif" style="font-size:28px;color:var(--ameixa-900)">Nenhum cliente cadastrado ainda</h2>' +
        '<p class="muted" style="margin:10px 0 22px">Cadastre a primeira empresa para gerar o link individual do diagnóstico.</p>' +
        '</div>'));
      var b2 = el('<button class="btn btn-ouro">+ Cadastrar primeiro cliente</button>');
      b2.onclick = modalNovoCliente;
      wrap.lastChild.appendChild(b2);
      return wrap;
    }

    var grade = el('<div class="cli-grade"></div>');
    cs.forEach(function (c) {
      var ativo = (c.links || []).filter(function (l) { return l.ativo; }).slice(-1)[0];
      var dias = null;
      if (c.contrato_fim) {
        var dt = new Date(c.contrato_fim);
        if (!isNaN(dt)) dias = Math.round((dt - new Date()) / 86400000);
      }
      var capa = (c.capa && CAPA_LISTA[c.capa]) ||
        "linear-gradient(135deg,#241030,#5A3A6E 62%,#8E6FA3)";
      if (c.capa_midia_id) {
        var aj = {};
        try { aj = JSON.parse(c.capa_ajuste || "{}") || {}; } catch (e) { aj = {}; }
        capa = "url(/api/midia/" + esc(c.capa_midia_id) + ") " +
          (aj.x == null ? 50 : aj.x) + "% " + (aj.y == null ? 50 : aj.y) + "%/" +
          (aj.zoom && aj.zoom !== 100 ? aj.zoom + "% auto" : "cover") +
          " no-repeat, " + capa;
      }
      var cartao = el('<div class="cli-c">' +
        '<div class="cli-c-capa" style="background:' + capa + '"></div>' +
        '<div class="cli-c-in">' +
        '<div class="cli-c-foto" style="' + estiloLogo(c, 56) + '">' +
        (c.logo_midia_id ? '' : esc((c.empresa || "?").slice(0, 1).toUpperCase())) +
        '</div>' +
        '<div class="cli-c-nome"><strong>' + esc(c.empresa) + '</strong>' +
        '<span>' + esc(c.tipo_servico || c.segmento || "Sem segmento") + '</span></div>' +
        '<div class="cli-c-linha">' +
        '<span class="selo ' + seloClasse(c.status) + '">' + esc(stTexto(c.status)) + '</span>' +
        '<span class="cli-c-ciclo">' + esc(c.ciclo_atual) + '</span></div>' +
        '<div class="cli-c-barra"><i style="width:' + (c.progresso || 0) + '%"></i></div>' +
        '<div class="cli-c-info">' +
        '<span>' + (c.progresso || 0) + '% preenchido</span>' +
        '<span>' + (c.responsavel ? esc(c.responsavel) : "sem responsável") + '</span>' +
        '</div>' +
        '<div class="cli-c-pe">' +
        '<span>' + c.anexos + (c.anexos === 1 ? " anexo" : " anexos") + '</span>' +
        (c.recados_novos
          ? '<span class="selo-fala">✉ ' + c.recados_novos +
            (c.recados_novos === 1 ? " mensagem" : " mensagens") + '</span>'
          : '') +
        (dias != null
          ? '<span class="' + (dias < 0 ? "kan-venceu" : dias <= 30 ? "kan-alerta" : "kan-prazo") +
            '">' + (dias < 0 ? "vencido" : dias + " dias") + '</span>'
          : '') +
        '</div></div></div>');
      cartao.onclick = function () { abrirCliente(c.id); };

      var acoes = el('<div class="cli-c-acoes"></div>');
      if (ativo) {
        var bl = el('<button class="cli-c-b" title="Copiar o link do cliente">⧉</button>');
        bl.onclick = function (e) { e.stopPropagation(); copiar(linkDe(ativo.token), "Link copiado"); };
        acoes.appendChild(bl);
      }
      var bo = el('<button class="cli-c-b" title="Abrir">→</button>');
      bo.onclick = function (e) { e.stopPropagation(); abrirCliente(c.id); };
      acoes.appendChild(bo);
      cartao.querySelector(".cli-c-capa").appendChild(acoes);
      grade.appendChild(cartao);
    });
    wrap.appendChild(grade);
    return wrap;
  }

