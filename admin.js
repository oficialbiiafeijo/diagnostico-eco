/* Diagnostico Comercial ECO - area interna do Grupo B3 Sales */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast"), toastTxt = document.getElementById("toastTxt");
  var S = { rota: "lista", cid: null, ciclo: null, det: null, lista: null,
            aba: "respostas", arquivados: false };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(h) {
    // <template> parseia corretamente <tr>, <td>, <option> e <tbody>,
    // que um <div> descartaria silenciosamente.
    var t = document.createElement("template");
    t.innerHTML = String(h).trim();
    return t.content.firstChild;
  }
  var tt;
  function toast(m) {
    toastTxt.textContent = m; toastEl.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
  }
  function api(url, body, metodo) {
    var o = body || metodo ? { method: metodo || "POST", headers: { "Content-Type": "application/json" } } : {};
    if (body) o.body = JSON.stringify(body);
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function dataBr(s) { return s ? s.replace("T", " · ").slice(0, 16) : "—"; }
  function linkDe(t) { return location.origin + "/d/" + t; }
  function copiar(txt, msg) {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(function () { toast(msg || "Link copiado"); })
      .catch(function () { window.prompt("Copie o link:", txt); });
  }
  function seloClasse(st) {
    return { "Não iniciado": "s-nao", "Em preenchimento": "s-preenchendo",
      "Aguardando conclusão": "s-aguardando", "Enviado pelo cliente": "s-enviado",
      "Em análise pela B3 Sales": "s-analise", "Diagnóstico concluído": "s-concluido" }[st] || "s-nao";
  }
  function stTexto(st) {
    return { "Em análise pela B3 Sales": "Em análise",
      "Diagnóstico concluído": "Concluído" }[st] || st;
  }
  function tamanho(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  /* --------------------------------------------------------------- login */
  function telaLogin(erro) {
    app.innerHTML = "";
    var box = el('<div style="min-height:100vh;display:grid;place-items:center;padding:24px">' +
      '<div class="card card-pad" style="width:min(430px,100%)">' +
      '<div class="marca" style="margin-bottom:26px"><div class="marca-b">B</div>' +
      '<div><div class="marca-txt">Sales</div><div class="marca-sub">Group</div></div></div>' +
      '<div class="eyebrow">Diagnóstico Comercial ECO</div>' +
      '<h1 class="serif" style="font-size:34px;color:var(--ameixa-900);margin:10px 0 6px">Área interna</h1>' +
      '<p class="small muted" style="margin-bottom:22px">Acesso restrito à equipe do Grupo B3 Sales.</p>' +
      (erro ? '<div class="aviso erro" style="margin-bottom:16px">' + esc(erro) + '</div>' : '') +
      '<div class="campo"><label class="small muted">Usuário</label>' +
      '<input type="text" id="u" autocomplete="username"></div>' +
      '<div class="campo" style="margin-top:12px"><label class="small muted">Senha</label>' +
      '<input type="password" id="s" autocomplete="current-password"></div>' +
      '<button class="btn btn-ouro" id="entrar" style="width:100%;margin-top:20px">Entrar no painel →</button>' +
      '<p class="small muted center" style="margin-top:16px">Conexão protegida · sessão de 12 horas</p>' +
      '</div></div>');
    app.appendChild(box);
    function tentar() {
      var b = document.getElementById("entrar");
      b.disabled = true; b.textContent = "Entrando…";
      api("/api/admin/login", { usuario: document.getElementById("u").value, senha: document.getElementById("s").value })
        .then(function (r) { if (r.ok) { S.rota = "lista"; carregar(); } else telaLogin(r.erro || "Falha no acesso."); });
    }
    document.getElementById("entrar").onclick = tentar;
    ["u", "s"].forEach(function (i) {
      document.getElementById(i).onkeydown = function (e) { if (e.key === "Enter") tentar(); };
    });
    document.getElementById("u").focus();
  }

  /* ---------------------------------------------------------------- shell */
  function shell(conteudo) {
    app.innerHTML = "";
    var barra = el('<div class="barra"><div class="barra-in">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
      '<div class="marca"><div class="marca-b">B</div><div><div class="marca-txt">Sales</div>' +
      '<div class="marca-sub">Group</div></div></div>' +
      '<div class="barra-tag">Diagnóstico ECO · Área interna</div></div>' +
      '<div style="display:flex;gap:6px"></div></div></div>');
    var dir = barra.querySelector(".barra-in > div:last-child");
    var bp = el('<button class="btn btn-fantasma btn-sm">Painel</button>');
    bp.onclick = function () { S.rota = "lista"; carregar(); };
    var bc = el('<button class="btn btn-fantasma btn-sm">Configurações</button>');
    bc.onclick = modalConfig;
    var bs = el('<button class="btn btn-fantasma btn-sm">Sair</button>');
    bs.onclick = function () { api("/api/admin/sair", {}).then(function () { telaLogin(); }); };
    dir.appendChild(bp); dir.appendChild(bc); dir.appendChild(bs);
    app.appendChild(barra);
    var palco = el('<div class="palco"></div>');
    palco.appendChild(conteudo);
    app.appendChild(palco);
  }

  /* ----------------------------------------------------------- lista */
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

    var card = el('<div class="card" style="overflow:hidden"><div style="overflow-x:auto">' +
      '<table class="lista"><thead><tr><th>Empresa</th><th>Responsável</th><th>Ciclo</th>' +
      '<th>Status</th><th>Progresso</th><th>Último acesso</th><th>Link do cliente</th><th></th>' +
      '</tr></thead><tbody></tbody></table></div></div>');
    var tb = card.querySelector("tbody");
    cs.forEach(function (c) {
      var ativo = (c.links || []).filter(function (l) { return l.ativo; }).slice(-1)[0];
      var tr = el('<tr>' +
        '<td><span class="emp">' + esc(c.empresa) + '</span><div class="small muted">' +
        esc(c.segmento || "—") + '</div></td>' +
        '<td>' + esc(c.responsavel || "—") + '<div class="small muted">' + esc(c.cargo || "") + '</div></td>' +
        '<td>' + esc(c.ciclo_atual) + '</td>' +
        '<td><span class="selo ' + seloClasse(c.status) + '">' + esc(stTexto(c.status)) + '</span></td>' +
        '<td><span class="mini-prog"><i style="width:' + c.progresso + '%"></i></span>' + c.progresso + '%</td>' +
        '<td class="small muted">' + dataBr(ativo && ativo.ultimo_acesso) + '</td>' +
        '<td></td><td style="text-align:right"></td></tr>');
      var tdLink = tr.children[6];
      if (ativo) {
        var lc = el('<div class="link-cel"><code>/d/' + esc(ativo.token.slice(0, 12)) + '…</code></div>');
        var bcp = el('<button class="btn btn-fantasma btn-sm" title="Copiar link">Copiar</button>');
        bcp.onclick = function (e) { e.stopPropagation(); copiar(linkDe(ativo.token)); };
        lc.appendChild(bcp);
        tdLink.appendChild(lc);
      } else tdLink.appendChild(el('<span class="small muted">sem link ativo</span>'));
      var ver = el('<button class="btn btn-linha btn-sm">Abrir</button>');
      ver.onclick = function () { abrirCliente(c.id); };
      tr.children[7].appendChild(ver);
      tr.querySelector(".emp").onclick = function () { abrirCliente(c.id); };
      tb.appendChild(tr);
    });
    wrap.appendChild(card);
    return wrap;
  }

  /* -------------------------------------------------------- detalhe */
  function abrirCliente(cid, ciclo) {
    S.cid = cid; S.ciclo = ciclo || null;
    api("/api/admin/cliente/" + cid + (ciclo ? "?ciclo=" + encodeURIComponent(ciclo) : ""))
      .then(function (d) {
        if (d.erro) return toast(d.erro);
        S.det = d; S.ciclo = d.ciclo; S.rota = "detalhe";
        shell(telaDetalhe(d));
      });
  }

  function telaDetalhe(d) {
    var c = d.cliente;
    var wrap = document.createElement("div");

    var volta = el('<button class="btn btn-fantasma btn-sm" style="margin-bottom:14px">← Todos os clientes</button>');
    volta.onclick = function () { S.rota = "lista"; carregar(); };
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
    acoes.appendChild(bEd); acoes.appendChild(bJson); acoes.appendChild(bCsv);
    acoes.appendChild(bArq2); acoes.appendChild(bDel); acoes.appendChild(bCiclo);
    wrap.appendChild(cab);

    /* abas de ciclo */
    var ab = el('<div class="abas"></div>');
    d.ciclos.forEach(function (x) {
      var b = el('<button class="' + (x.ciclo === d.ciclo ? "at" : "") + '">' + esc(x.ciclo) +
        ' · ' + x.progresso + '%</button>');
      b.onclick = function () { abrirCliente(c.id, x.ciclo); };
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
    var sCard = el('<div class="score-cartao">' +
      '<div class="eyebrow" style="color:var(--ouro-300)">Score ECO · interno</div>' +
      '<div class="score-geral">' + sc.geral + '<span style="font-size:22px;opacity:.6">/100</span></div>' +
      '<p style="font-size:12.5px;color:rgba(255,255,255,.75);margin:6px 0 16px">' +
      esc(sc.classificacao) + '</p></div>');
    ["E", "C", "O"].forEach(function (k) {
      var p = sc.pilares[k];
      sCard.appendChild(el('<div class="score-pil"><span class="l">' + k + '</span>' +
        '<span class="n">' + esc(p.nome) + '</span><span class="t"><i style="width:' + p.score + '%"></i></span>' +
        '<span class="p">' + p.score + '</span></div>'));
    });
    sCard.appendChild(el('<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16);' +
      'font-size:12.5px;color:rgba(255,255,255,.8)">Porta de entrada sugerida: ' +
      '<strong style="color:var(--ouro-300)">' + esc(sc.entrada_nome) + '</strong></div>'));
    col2.appendChild(sCard);

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
    var navAbas = el('<div class="abas" style="margin-bottom:18px"></div>');
    [["respostas", "Respostas"], ["diagnostico", "Diagnóstico interno"], ["notas", "Análise da B3 Sales"],
     ["historico", "Histórico"]].forEach(function (t) {
      var b = el('<button class="' + (S.aba === t[0] ? "at" : "") + '">' + t[1] + '</button>');
      b.onclick = function () { S.aba = t[0]; shell(telaDetalhe(d)); };
      navAbas.appendChild(b);
    });
    col1.appendChild(navAbas);

    if (S.aba === "respostas") col1.appendChild(painelRespostas(d));
    else if (S.aba === "diagnostico") col1.appendChild(painelDiagnostico(d));
    else if (S.aba === "notas") col1.appendChild(painelNotas(d));
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
    if (!d.score.gargalos.length) g.appendChild(el('<p class="muted small">Nenhum gargalo estrutural identificado pelas regras do método.</p>'));
    d.score.gargalos.forEach(function (x) {
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
    salvar.onclick = function () {
      var body = { cliente_id: d.cliente.id, ciclo: d.ciclo };
      campos.forEach(function (c) { body[c[0]] = refs[c[0]].value; });
      api("/api/admin/analise", body).then(function () { toast("Análise salva"); });
    };
    card.appendChild(salvar);
    if (a.atualizado_em) card.appendChild(el('<p class="small muted" style="margin-top:10px">Última atualização: ' + dataBr(a.atualizado_em) + '</p>'));
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
    return card;
  }

  /* --------------------------------------------------------- modais */
  function modal(titulo, sub, corpo, acoes) {
    var f = el('<div class="modal-fundo"><div class="modal">' +
      '<div class="modal-cab"><div class="eyebrow">' + esc(sub || "Grupo B3 Sales") + '</div>' +
      '<h2 class="serif" style="font-size:30px;color:var(--ameixa-900);margin:6px 0 0">' +
      titulo + '</h2></div>' +
      '<div class="modal-corpo"></div><div class="modal-pe"></div></div></div>');
    f.querySelector(".modal-corpo").appendChild(corpo);
    var pe = f.querySelector(".modal-pe");
    var fechar = el('<button class="btn btn-fantasma">Cancelar</button>');
    fechar.onclick = function () { f.remove(); };
    pe.appendChild(fechar);
    (acoes || []).forEach(function (b) { pe.appendChild(b); });
    f.onclick = function (e) { if (e.target === f) f.remove(); };
    document.body.appendChild(f);
    var i = f.querySelector("input"); if (i) i.focus();
    return f;
  }

  function campoTexto(id, rot, ph, valor) {
    return '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">' + rot + '</label>' +
      '<input type="text" id="' + id + '" placeholder="' + esc(ph || "") + '" value="' +
      esc(valor || "") + '"></div>';
  }

  function modalNovoCliente() {
    var corpo = el('<div>' +
      campoTexto("m_empresa", "Nome da empresa *", "Razão social ou nome fantasia") +
      campoTexto("m_resp", "Responsável pelo preenchimento", "Nome completo") +
      campoTexto("m_cargo", "Função", "Proprietária, gestora comercial…") +
      campoTexto("m_seg", "Segmento", "Estética e beleza, saúde, serviços…") +
      campoTexto("m_contato", "WhatsApp", "(00) 00000-0000") +
      campoTexto("m_email", "E-mail", "nome@empresa.com.br") +
      '<div class="campo" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Ciclo inicial</label>' +
      '<select id="m_ciclo"></select></div>' +
      '<div><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Validade do link</label>' +
      '<select id="m_val"><option value="0">Sem prazo</option><option value="7">7 dias</option>' +
      '<option value="15">15 dias</option><option value="30">30 dias</option>' +
      '<option value="60">60 dias</option></select></div></div>' +
      '<p class="small muted" style="margin-top:14px">Ao cadastrar, o sistema gera um link individual ' +
      'e exclusivo para esta empresa. O cliente abre o link no navegador e responde sem precisar criar senha.</p>' +
      '</div>');
    var selc = corpo.querySelector("#m_ciclo");
    (S.lista ? S.lista.ciclos : ["Dia 0"]).forEach(function (c) {
      selc.appendChild(el('<option>' + esc(c) + '</option>'));
    });
    var criar = el('<button class="btn btn-ouro">Cadastrar e gerar link</button>');
    var f = modal('Novo <em class="grifo">cliente</em>', "Cadastro", corpo, [criar]);
    criar.onclick = function () {
      var empresa = corpo.querySelector("#m_empresa").value.trim();
      if (!empresa) return toast("Informe o nome da empresa.");
      criar.disabled = true; criar.textContent = "Criando…";
      api("/api/admin/cliente-novo", {
        empresa: empresa,
        responsavel: corpo.querySelector("#m_resp").value,
        cargo: corpo.querySelector("#m_cargo").value,
        segmento: corpo.querySelector("#m_seg").value,
        contato: corpo.querySelector("#m_contato").value,
        email: corpo.querySelector("#m_email").value,
        ciclo: selc.value,
        validade_dias: corpo.querySelector("#m_val").value,
      }).then(function (r) {
        if (r.erro) { criar.disabled = false; criar.textContent = "Cadastrar e gerar link"; return toast(r.erro); }
        f.remove();
        modalLinkPronto(empresa, r.token);
      });
    };
  }

  function modalLinkPronto(empresa, token) {
    var url = linkDe(token);
    var corpo = el('<div>' +
      '<p style="margin-top:0">O link individual de <strong>' + esc(empresa) + '</strong> está pronto. ' +
      'Envie exatamente este endereço para a pessoa responsável.</p>' +
      '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
      'padding:14px;word-break:break-all;font-size:13px;margin:16px 0">' + esc(url) + '</div>' +
      '<div class="aviso small">Este link é exclusivo desta empresa. As respostas salvam sozinhas ' +
      'e a pessoa pode voltar quantas vezes precisar até enviar o diagnóstico.</div></div>');
    var bcopia = el('<button class="btn btn-linha">Copiar link</button>');
    bcopia.onclick = function () { copiar(url); };
    var bzap = el('<a class="btn btn-ouro" target="_blank" rel="noopener" href="https://wa.me/?text=' +
      encodeURIComponent("Olá! Este é o link do seu Diagnóstico Comercial ECO com o Grupo B3 Sales:\n\n" +
        url + "\n\nAs respostas salvam automaticamente, você pode responder com calma e voltar depois pelo mesmo link.") +
      '">Enviar por WhatsApp</a>');
    var bok = el('<button class="btn btn-ameixa">Concluir</button>');
    var f = modal('Link <em class="grifo">gerado</em>', "Pronto para enviar", corpo, [bcopia, bzap, bok]);
    bok.onclick = function () { f.remove(); carregar(); };
    f.querySelector(".modal-pe .btn-fantasma").remove();
  }

  function modalEditar(c) {
    var corpo = el('<div>' +
      campoTexto("e_empresa", "Nome da empresa", "", c.empresa) +
      campoTexto("e_resp", "Responsável", "", c.responsavel) +
      campoTexto("e_cargo", "Função", "", c.cargo) +
      campoTexto("e_seg", "Segmento", "", c.segmento) +
      campoTexto("e_contato", "WhatsApp", "", c.contato) +
      campoTexto("e_email", "E-mail", "", c.email) +
      '<label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">' +
      'Observações internas sobre o cliente</label><textarea id="e_obs"></textarea></div>');
    corpo.querySelector("#e_obs").value = c.obs_internas || "";
    var salvar = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal('Editar <em class="grifo">cadastro</em>', "Dados do cliente", corpo, [salvar]);
    salvar.onclick = function () {
      api("/api/admin/cliente-editar", {
        id: c.id, empresa: corpo.querySelector("#e_empresa").value,
        responsavel: corpo.querySelector("#e_resp").value,
        cargo: corpo.querySelector("#e_cargo").value,
        segmento: corpo.querySelector("#e_seg").value,
        contato: corpo.querySelector("#e_contato").value,
        email: corpo.querySelector("#e_email").value,
        obs_internas: corpo.querySelector("#e_obs").value,
      }).then(function () { f.remove(); toast("Cadastro atualizado"); abrirCliente(c.id, S.ciclo); });
    };
  }

  function modalExcluir(c) {
    var corpo = el('<div>' +
      '<div class="aviso erro"><strong>Esta ação não pode ser desfeita.</strong><br>' +
      'Serão apagados definitivamente: todos os ciclos, todas as respostas, o histórico ' +
      'de preenchimento, a análise interna e todos os arquivos enviados por este cliente.</div>' +
      '<p style="margin:18px 0 6px">Se você só quer tirar o cliente da lista principal, ' +
      'use <strong>Arquivar</strong> em vez de excluir.</p>' +
      '<p class="small muted" style="margin:18px 0 6px">Para confirmar, digite o nome da empresa ' +
      'exatamente como está cadastrado:</p>' +
      '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:8px;' +
      'padding:9px 12px;margin-bottom:10px;font-size:13px">' + esc(c.empresa) + '</div>' +
      '<input type="text" id="ex_nome" placeholder="Nome da empresa"></div>');
    var bx = el('<button class="btn btn-perigo">Excluir definitivamente</button>');
    var f = modal('Excluir <em class="grifo">cliente</em>', "Ação irreversível", corpo, [bx]);
    bx.onclick = function () {
      api("/api/admin/cliente-excluir",
          { id: c.id, confirmacao: corpo.querySelector("#ex_nome").value })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Cliente excluído"); S.rota = "lista"; carregar();
        });
    };
  }

  function modalNovoCiclo(d) {
    var jaTem = d.ciclos.map(function (x) { return x.ciclo; });
    var disp = d.ciclos_possiveis.filter(function (c) { return jaTem.indexOf(c) < 0; });
    if (!disp.length) return toast("Todos os ciclos já foram criados para este cliente.");
    var corpo = el('<div><p style="margin-top:0">Cada ciclo guarda um retrato independente da empresa. ' +
      'Os ciclos anteriores <strong>nunca são apagados</strong>.</p>' +
      '<label class="small" style="color:var(--ameixa-700);margin:14px 0 5px;display:block">Novo ciclo</label>' +
      '<select id="nc_ciclo"></select>' +
      '<label class="small" style="color:var(--ameixa-700);margin:16px 0 5px;display:block">Partir das respostas de</label>' +
      '<select id="nc_copiar"><option value="">Começar em branco</option></select>' +
      '<p class="small muted" style="margin-top:10px">Copiar as respostas anteriores faz o cliente apenas ' +
      'atualizar o que mudou, em vez de responder tudo de novo.</p></div>');
    disp.forEach(function (c) { corpo.querySelector("#nc_ciclo").appendChild(el('<option>' + esc(c) + '</option>')); });
    jaTem.forEach(function (c) { corpo.querySelector("#nc_copiar").appendChild(el('<option>' + esc(c) + '</option>')); });
    var criar = el('<button class="btn btn-ouro">Criar ciclo e gerar link</button>');
    var f = modal('Novo <em class="grifo">ciclo</em>', "Acompanhamento de 180 dias", corpo, [criar]);
    criar.onclick = function () {
      api("/api/admin/ciclo-novo", {
        cliente_id: d.cliente.id, ciclo: corpo.querySelector("#nc_ciclo").value,
        copiar_de: corpo.querySelector("#nc_copiar").value,
      }).then(function (r) {
        if (r.erro) return toast(r.erro);
        f.remove(); modalLinkPronto(d.cliente.empresa, r.token);
      });
    };
  }

  function modalComparar(d) {
    var cs = d.ciclos.map(function (x) { return x.ciclo; });
    var corpo = el('<div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label class="small" style="color:var(--ameixa-700)">De</label><select id="cp_a"></select></div>' +
      '<div><label class="small" style="color:var(--ameixa-700)">Para</label><select id="cp_b"></select></div>' +
      '</div><div id="cp_res" style="margin-top:20px"></div></div>');
    cs.forEach(function (c) {
      corpo.querySelector("#cp_a").appendChild(el('<option>' + esc(c) + '</option>'));
      corpo.querySelector("#cp_b").appendChild(el('<option>' + esc(c) + '</option>'));
    });
    corpo.querySelector("#cp_b").value = cs[cs.length - 1];
    function rodar() {
      var a = corpo.querySelector("#cp_a").value, b = corpo.querySelector("#cp_b").value;
      var res = corpo.querySelector("#cp_res");
      res.innerHTML = '<p class="small muted">Calculando…</p>';
      api("/api/admin/comparar/" + d.cliente.id + "?a=" + encodeURIComponent(a) + "&b=" + encodeURIComponent(b))
        .then(function (r) {
          res.innerHTML = "";
          res.appendChild(el('<div class="ind"><div><strong>Score ECO geral</strong></div>' +
            '<div class="v">' + r.score_a.geral + ' → ' + r.score_b.geral +
            ' <span class="' + (r.score_b.geral >= r.score_a.geral ? "sobe" : "desce") + '">(' +
            (r.score_b.geral - r.score_a.geral >= 0 ? "+" : "") + (r.score_b.geral - r.score_a.geral) +
            ')</span></div></div>'));
          ["E", "C", "O"].forEach(function (k) {
            var x = r.score_a.pilares[k].score, y = r.score_b.pilares[k].score;
            res.appendChild(el('<div class="ind"><div>' + esc(r.score_a.pilares[k].nome) + '</div>' +
              '<div class="v" style="font-size:16px">' + x + ' → ' + y + ' <span class="' +
              (y >= x ? "sobe" : "desce") + '">(' + (y - x >= 0 ? "+" : "") + (y - x) + ')</span></div></div>'));
          });
          if (!r.linhas.length) { res.appendChild(el('<p class="small muted" style="margin-top:14px">Sem indicadores numéricos comparáveis entre estes ciclos.</p>')); return; }
          var t = el('<table class="cmp" style="margin-top:18px"><thead><tr><th>Indicador</th>' +
            '<th style="text-align:right">' + esc(a) + '</th><th style="text-align:right">' + esc(b) +
            '</th><th style="text-align:right">Evolução</th></tr></thead><tbody></tbody></table>');
          var tb = t.querySelector("tbody");
          r.linhas.forEach(function (l) {
            var ev = l.pct === null || l.pct === undefined ? "—"
              : (l.pct >= 0 ? "+" : "") + l.pct.toFixed(0) + "%";
            tb.appendChild(el('<tr><td>' + esc(l.label) + '</td>' +
              '<td class="num">' + esc(l.a == null ? "—" : l.a) + '</td>' +
              '<td class="num">' + esc(l.b == null ? "—" : l.b) + '</td>' +
              '<td class="num ' + (l.dif > 0 ? "sobe" : l.dif < 0 ? "desce" : "") + '">' + ev + '</td></tr>'));
          });
          res.appendChild(t);
        });
    }
    corpo.querySelector("#cp_a").onchange = rodar;
    corpo.querySelector("#cp_b").onchange = rodar;
    modal('Comparativo entre <em class="grifo">ciclos</em>', "Evolução de 180 dias", corpo, []);
    rodar();
  }

  function modalConfig() {
    api("/api/admin/config").then(function (cfg) {
      var base = location.origin;
      var corpo = el('<div>' +
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:6px">Acesso da equipe</h3>' +
        campoTexto("cf_user", "Usuário", "", cfg.usuario) +
        '<div class="campo" style="margin-bottom:14px"><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Senha atual</label>' +
        '<input type="password" id="cf_atual"></div>' +
        '<div class="campo"><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Nova senha (mínimo 8 caracteres)</label>' +
        '<input type="password" id="cf_nova"></div>' +
        '<hr class="filete">' +
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:6px">Chave de leitura dos dados</h3>' +
        '<p class="small muted">Use esta chave quando quiser que a análise seja feita a partir dos dados ' +
        'do sistema. Ela dá acesso somente de leitura. Trate como uma senha.</p>' +
        '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
        'padding:12px;word-break:break-all;font-size:12px;margin:12px 0"><strong>' + esc(cfg.api_key) + '</strong></div>' +
        '<p class="small muted">Endereço completo:</p>' +
        '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
        'padding:12px;word-break:break-all;font-size:11.5px">' + esc(base) + '/api/dados?chave=' + esc(cfg.api_key) + '</div>' +
        '</div>');
      var bch = el('<button class="btn btn-linha">Copiar endereço</button>');
      bch.onclick = function () { copiar(base + "/api/dados?chave=" + cfg.api_key, "Endereço copiado"); };
      var bsv = el('<button class="btn btn-ouro">Salvar senha</button>');
      var f = modal('Configurações', "Sistema", corpo, [bch, bsv]);
      bsv.onclick = function () {
        api("/api/admin/senha", {
          usuario: corpo.querySelector("#cf_user").value,
          atual: corpo.querySelector("#cf_atual").value,
          nova: corpo.querySelector("#cf_nova").value,
        }).then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Senha atualizada");
        });
      };
    });
  }

  /* ----------------------------------------------------------- boot */
  function carregar() {
    api("/api/admin/clientes" + (S.arquivados ? "?arquivados=1" : "")).then(function (d) {
      if (d.erro) return telaLogin();
      S.lista = d; S.rota = "lista";
      try { shell(telaLista(d)); }
      catch (e) { console.error("Falha ao montar o painel:", e); telaLogin("Falha ao montar o painel: " + e.message); }
    }).catch(function (e) {
      console.error(e);
      telaLogin("Não foi possível conectar ao servidor.");
    });
  }
  api("/api/admin/sessao").then(function (s) { s.logado ? carregar() : telaLogin(); })
    .catch(function () { telaLogin("Não foi possível conectar ao servidor."); });
})();
