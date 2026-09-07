  /* ------------------------------------------- painel do cliente */
  var COR_FRENTE = {
    diagnostico: "var(--azul-500)", jornada: "var(--ameixa-600)",
    rota: "var(--terracota-500)", materiais: "var(--ouro-600)",
    treinamento: "var(--verde-500)", arquivos: "var(--azul-800)"
  };

  function anel(pct, cor, tamanho) {
    var R = tamanho / 2, r = R * 0.66, cx = R, cy = R;
    var meio = '<text x="' + cx + '" y="' + (cy + R * 0.14) + '" text-anchor="middle" ' +
      'style="font-family:var(--serif);font-size:' + (R * 0.62) +
      'px;fill:var(--ameixa-900);font-variant-numeric:lining-nums tabular-nums;' +
      'font-feature-settings:\'lnum\' 1,\'tnum\' 1">' + pct + '</text>';
    if (pct <= 0) {
      return '<svg viewBox="0 0 ' + tamanho + ' ' + tamanho + '" width="' + tamanho +
        '" height="' + tamanho + '"><circle cx="' + cx + '" cy="' + cy + '" r="' +
        ((R + r) / 2) + '" fill="none" stroke="var(--creme-3)" stroke-width="' +
        (R - r) + '"/>' + meio + '</svg>';
    }
    var fundo = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) +
      '" fill="none" stroke="var(--creme-3)" stroke-width="' + (R - r) + '"/>';
    if (pct >= 100) {
      return '<svg viewBox="0 0 ' + tamanho + ' ' + tamanho + '" width="' + tamanho +
        '" height="' + tamanho + '">' + fundo + '<circle cx="' + cx + '" cy="' + cy +
        '" r="' + ((R + r) / 2) + '" fill="none" stroke="' + cor + '" stroke-width="' +
        (R - r) + '"/>' + meio + '</svg>';
    }
    var ang = -Math.PI / 2, fim = ang + pct / 100 * Math.PI * 2;
    var grande = pct > 50 ? 1 : 0;
    var x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
    var x2 = cx + R * Math.cos(fim), y2 = cy + R * Math.sin(fim);
    var x3 = cx + r * Math.cos(fim), y3 = cy + r * Math.sin(fim);
    var x4 = cx + r * Math.cos(ang), y4 = cy + r * Math.sin(ang);
    return '<svg viewBox="0 0 ' + tamanho + ' ' + tamanho + '" width="' + tamanho +
      '" height="' + tamanho + '">' + fundo +
      '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + grande + ' 1 ' +
      x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 ' + grande + ' 0 ' +
      x4 + ' ' + y4 + ' Z" fill="' + cor + '"/>' + meio + '</svg>';
  }


  /* A foto do cliente segue sempre o mesmo enquadramento, como uma foto de
     perfil: quadrada, preenchendo o espaço. O ajuste guarda zoom e posição. */
  function ajusteLogo(c) {
    try { return JSON.parse(c.logo_ajuste || "{}") || {}; }
    catch (e) { return {}; }
  }

  function estiloLogo(c, tam) {
    if (!c.logo_midia_id) {
      return "background:" + corDaEmpresa(c.empresa);
    }
    var a = ajusteLogo(c);
    var z = a.zoom || 100, x = a.x == null ? 50 : a.x, y = a.y == null ? 50 : a.y;
    return "background-image:url(/api/midia/" + esc(c.logo_midia_id) + ");" +
      "background-size:" + z + "% auto;background-position:" + x + "% " + y + "%;" +
      "background-repeat:no-repeat;background-color:#fff";
  }

  function modalEnquadrar(c) {
    var a = ajusteLogo(c);
    var z = a.zoom || 100, x = a.x == null ? 50 : a.x, y = a.y == null ? 50 : a.y;
    var corpo = el('<div>' +
      '<p class="small muted" style="margin:0 0 16px;line-height:1.7">Ajuste até a ' +
      'foto ficar do jeito que você quer. Ela vai aparecer sempre neste enquadramento, ' +
      'em todas as telas.</p>' +
      '<div class="enq-previas"></div>' +
      '<div class="enq-ctrl"></div></div>');

    var previas = corpo.querySelector(".enq-previas");
    var pGrande = el('<div class="enq-grande"></div>');
    var pMedia = el('<div class="enq-media"></div>');
    var pPeq = el('<div class="enq-peq"></div>');
    previas.appendChild(el('<div class="enq-um"><span class="small muted">Na ficha</span></div>'));
    previas.lastChild.appendChild(pGrande);
    previas.appendChild(el('<div class="enq-um"><span class="small muted">Na carteira</span></div>'));
    previas.lastChild.appendChild(pMedia);
    previas.appendChild(el('<div class="enq-um"><span class="small muted">Miniatura</span></div>'));
    previas.lastChild.appendChild(pPeq);

    function pintar() {
      var est = "background-image:url(/api/midia/" + esc(c.logo_midia_id) + ");" +
        "background-size:" + z + "% auto;background-position:" + x + "% " + y + "%;" +
        "background-repeat:no-repeat;background-color:#fff";
      pGrande.style.cssText = est; pMedia.style.cssText = est; pPeq.style.cssText = est;
    }
    pintar();

    var ctrl = corpo.querySelector(".enq-ctrl");
    function faixa(rot, valor, min, max, aplicar) {
      var l = el('<div class="enq-linha"><span class="small">' + rot + '</span></div>');
      var i = document.createElement("input");
      i.type = "range"; i.min = min; i.max = max; i.value = valor;
      i.oninput = function () { aplicar(parseInt(i.value, 10)); pintar(); };
      l.appendChild(i);
      ctrl.appendChild(l);
      return i;
    }
    faixa("Zoom", z, 60, 300, function (v) { z = v; });
    faixa("Horizontal", x, 0, 100, function (v) { x = v; });
    faixa("Vertical", y, 0, 100, function (v) { y = v; });

    var bC = el('<button class="btn btn-fantasma btn-sm">Centralizar</button>');
    bC.onclick = function () {
      z = 100; x = 50; y = 50; pintar();
      ctrl.querySelectorAll("input").forEach(function (i, k) {
        i.value = [100, 50, 50][k];
      });
    };
    ctrl.appendChild(bC);

    var bs = el('<button class="btn btn-ouro">Salvar enquadramento</button>');
    var f = modal("Enquadrar a imagem", esc(c.empresa), corpo, [bs]);
    bs.onclick = function () {
      api("/api/admin/cliente-editar", { id: c.id,
        logo_ajuste: JSON.stringify({ zoom: z, x: x, y: y }) })
        .then(function () {
          f.remove(); toast("Enquadramento salvo"); abrirCliente(c.id, S.ciclo);
        });
    };
  }

  /* Quem do time do cliente enxerga cada página. Nome e email obrigatórios:
     é o que garante que a página de um cliente nunca chega a outro. */
  function modalAcessoEquipe(cid, paginas) {
    var cx = el('<div><p style="margin-top:0">Escolha o que este cliente pode ver e ' +
      'para quem do time dele. Tudo que você liberar vale <strong>só para ele</strong>.</p>' +
      '<div id="ae_corpo" style="margin-top:16px"><p class="small muted">Carregando…</p></div>' +
      '</div>');
    modal("Acesso da equipe", "Só para este cliente", cx);
    var corpo = cx.querySelector("#ae_corpo");

    function pintar() {
      Promise.all([
        api("/api/admin/cliente-painel/" + cid),
        api("/api/admin/acessos-pessoa?cliente=" + encodeURIComponent(cid))
      ]).then(function (r) {
        var equipe = r[0].equipe_lista || [];
        var acessos = (r[1].acessos || []).filter(function (a) { return a.tipo === "pagina"; });
        corpo.innerHTML = "";

        var todas = el('<label class="ws-vis" style="margin-bottom:12px">' +
          '<input type="checkbox" id="ae_todas"> ' +
          '<span>Liberar todas as páginas deste cliente para ele ver</span></label>');
        var marcadas = paginas.filter(function (p) { return p.visivel_cliente; }).length;
        todas.querySelector("input").checked = marcadas === paginas.length && paginas.length > 0;
        todas.querySelector("input").onchange = function (e) {
          var v = e.target.checked ? 1 : 0;
          Promise.all(paginas.map(function (p) {
            return api("/api/admin/ws-pagina", { id: p.id, visivel_cliente: v });
          })).then(function () {
            toast(v ? "Todas liberadas" : "Todas fechadas");
            abrirMateriais(cid);
          });
        };
        corpo.appendChild(todas);

        paginas.forEach(function (pg) {
          var bloco = el('<div class="ae-pg"></div>');
          var lin = el('<label class="ws-vis"><input type="checkbox"' +
            (pg.visivel_cliente ? " checked" : "") + '> <span><strong>' +
            esc(pg.titulo) + '</strong></span></label>');
          lin.querySelector("input").onchange = function (e) {
            api("/api/admin/ws-pagina",
                { id: pg.id, visivel_cliente: e.target.checked ? 1 : 0 })
              .then(function () { pg.visivel_cliente = e.target.checked ? 1 : 0; pintar(); });
          };
          bloco.appendChild(lin);

          var desta = acessos.filter(function (a) { return a.alvo_id === pg.id; });
          desta.forEach(function (a) {
            var i = el('<div class="ae-p"><span>' + esc(a.nome) +
              ' <span class="small muted">' + esc(a.email) + '</span></span></div>');
            var bx = el('<button class="btn btn-fantasma btn-sm">Tirar</button>');
            bx.onclick = function () {
              api("/api/admin/acesso-pessoa", { cliente_id: cid, tipo: "pagina",
                alvo_id: pg.id, id: a.id, remover: true })
                .then(function () { toast("Acesso retirado"); pintar(); });
            };
            i.appendChild(bx);
            bloco.appendChild(i);
          });
          var b = el('<button class="ae-mais">+ liberar para alguém do time</button>');
          b.onclick = function () {
            modalLiberarPessoa(cid, "pagina", pg.id, pg.titulo, equipe, pintar);
          };
          bloco.appendChild(b);
          corpo.appendChild(bloco);
        });
      });
    }
    pintar();
  }

  /* Os cursos daquele cliente: quais ele tem, quais faltam e quem do time
     dele pode assistir. Espelha a página de cursos, mas fechada nele. */
  function abrirCursosCliente(cid) {
    S.rota = "cursos-cliente"; S.cid = cid;
    Promise.all([
      api("/api/admin/cursos"),
      api("/api/admin/cliente-painel/" + cid),
      api("/api/admin/acessos-pessoa?cliente=" + encodeURIComponent(cid))
    ]).then(function (r) {
      shell(telaCursosCliente(cid, r[0], r[1], r[2].acessos || []));
    });
  }

  function telaCursosCliente(cid, d, painel, acessos) {
    var c = painel.cliente || { id: cid, empresa: "Cliente" };
    var cursos = d.cursos || [];
    var meus = cursos.filter(function (x) { return (x.clientes || []).indexOf(cid) >= 0; });
    var outros = cursos.filter(function (x) { return (x.clientes || []).indexOf(cid) < 0; });
    var wrap = document.createElement("div");

    var topo = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Cursos do cliente</div>' +
      '<h1 class="serif">O que <em class="grifo">' + esc(c.empresa) + '</em> pode assistir</h1>' +
      '<p class="muted small" style="margin-top:6px">Só os cursos liberados aqui aparecem ' +
      'no acompanhamento dele. Nada de outro cliente chega junto.</p></div>' +
      '<div style="display:flex;gap:10px"></div></div>');
    var volta = el('<button class="btn btn-fantasma btn-sm">← Voltar para o cliente</button>');
    volta.onclick = function () { abrirCliente(cid, S.ciclo); };
    topo.lastChild.appendChild(volta);
    wrap.appendChild(topo);

    var corpo = el('<div class="ws"></div>');

    /* menu da esquerda: acrescentar e remover curso */
    var lado = el('<div class="ws-lado"><div class="eyebrow">Cursos</div></div>');
    var listaL = el('<div class="ws-paginas"></div>');
    if (!meus.length) {
      listaL.appendChild(el('<p class="small muted" style="padding:8px 2px">' +
        'Nenhum curso liberado ainda.</p>'));
    }
    meus.forEach(function (x) {
      var it = el('<div class="ws-pg at"><span class="ws-pg-t">' + esc(x.titulo) + '</span>' +
        '<button class="ws-pg-x" title="Remover deste cliente">×</button></div>');
      it.querySelector("button").onclick = function (e) {
        e.stopPropagation();
        if (!confirm("Remover " + x.titulo + " do acesso de " + c.empresa + "?")) return;
        var novos = (x.clientes || []).filter(function (y) { return y !== cid; });
        api("/api/admin/curso-acesso", { curso_id: x.id, clientes: novos })
          .then(function () { toast("Curso removido"); abrirCursosCliente(cid); });
      };
      listaL.appendChild(it);
    });
    lado.appendChild(listaL);

    var bAdd = el('<button class="btn btn-linha btn-sm" style="width:100%;margin-top:12px">' +
      '+ Acrescentar curso</button>');
    bAdd.onclick = function () {
      if (!outros.length) return toast("Este cliente já tem todos os cursos.");
      var cx = el('<div><p style="margin-top:0">Escolha o que liberar para ' +
        esc(c.empresa) + '.</p><div id="ac_lista"></div></div>');
      var lst = cx.querySelector("#ac_lista");
      outros.forEach(function (x) {
        var l = el('<label class="ws-vis" style="margin:6px 0"><input type="checkbox" value="' +
          esc(x.id) + '"> <span>' + esc(x.titulo) +
          (x.trilha ? ' <span class="small muted">· ' + esc(x.trilha) + '</span>' : '') +
          '</span></label>');
        lst.appendChild(l);
      });
      var bs = el('<button class="btn btn-ouro">Liberar</button>');
      var f = modal("Acrescentar curso", "Acesso do cliente", cx, [bs]);
      bs.onclick = function () {
        var ids = [].slice.call(lst.querySelectorAll("input:checked"))
          .map(function (i) { return i.value; });
        if (!ids.length) return toast("Escolha ao menos um curso.");
        Promise.all(ids.map(function (id) {
          var cur = cursos.filter(function (y) { return y.id === id; })[0];
          return api("/api/admin/curso-acesso",
                     { curso_id: id, clientes: (cur.clientes || []).concat([cid]) });
        })).then(function () {
          f.remove(); toast("Liberado"); abrirCursosCliente(cid);
        });
      };
    };
    lado.appendChild(bAdd);
    corpo.appendChild(lado);

    /* corpo: cada curso liberado, com módulos e quem do time pode ver */
    var col = el('<div class="ws-col"></div>');
    if (!meus.length) {
      col.appendChild(el('<div class="card card-pad"><p class="muted">' +
        'Use o botão à esquerda para liberar o primeiro curso.</p></div>'));
    }
    var equipe = painel.equipe_lista || [];
    meus.forEach(function (x) {
      var fundo = x.capa_midia_id
        ? "#241030 url(/api/midia/" + esc(x.capa_midia_id) + ") center/cover"
        : (CAPA_CSS[x.capa] || "var(--creme-3)");
      var card = el('<div class="card" style="margin-bottom:16px;overflow:hidden">' +
        '<div style="height:110px;background:' + fundo + '"></div>' +
        '<div class="card-pad"><h3 class="serif" style="font-size:23px;' +
        'color:var(--ameixa-900);margin:0 0 4px">' + esc(x.titulo) + '</h3>' +
        '<p class="small muted" style="margin:0 0 12px">' + x.aulas +
        (x.aulas === 1 ? " aula" : " aulas") +
        (x.trilha ? "  ·  " + esc(x.trilha) : "") + '</p></div>');
      var pad = card.querySelector(".card-pad");

      var bAb = el('<button class="btn btn-linha btn-sm">Abrir o curso</button>');
      bAb.onclick = function () { abrirCurso(x.id); };
      pad.appendChild(bAb);

      /* quem do time dele pode assistir */
      var doCurso = acessos.filter(function (a) {
        return a.tipo === "curso" && a.alvo_id === x.id;
      });
      var pes = el('<div style="margin-top:16px;border-top:1px solid var(--linha-2);' +
        'padding-top:12px"><div class="eyebrow">Quem do time dele pode assistir</div></div>');
      if (!doCurso.length) {
        pes.appendChild(el('<p class="small muted" style="margin:8px 0 0">' +
          'Ninguém liberado individualmente. O curso aparece para a empresa toda.</p>'));
      }
      doCurso.forEach(function (a) {
        var i = el('<div class="ind"><div><strong>' + esc(a.nome) + '</strong>' +
          '<div class="small muted">' + esc(a.email) + '</div></div></div>');
        var bx = el('<button class="btn btn-fantasma btn-sm">Tirar</button>');
        bx.onclick = function () {
          api("/api/admin/acesso-pessoa", { cliente_id: cid, tipo: "curso",
            alvo_id: x.id, id: a.id, remover: true })
            .then(function () { toast("Acesso retirado"); abrirCursosCliente(cid); });
        };
        i.appendChild(bx);
        pes.appendChild(i);
      });
      var bLib = el('<button class="btn btn-ouro btn-sm" style="margin-top:10px">' +
        '+ Liberar para alguém</button>');
      bLib.onclick = function () {
        modalLiberarPessoa(cid, "curso", x.id, x.titulo, equipe,
                           function () { abrirCursosCliente(cid); });
      };
      pes.appendChild(bLib);
      pad.appendChild(pes);
      col.appendChild(card);
    });
    corpo.appendChild(col);
    wrap.appendChild(corpo);
    return wrap;
  }

  /* O acesso só sai com nome e email. É isso que impede o material de um
     cliente de escorregar para outro. */
  function modalLiberarPessoa(cid, tipo, alvoId, titulo, equipe, aoTerminar) {
    var cx = el('<div><p style="margin-top:0">Liberar <strong>' + esc(titulo) +
      '</strong> para uma pessoa. O acesso só vale com o nome e o email ' +
      'confirmados.</p>' +
      '<label class="small" style="color:var(--ameixa-700);margin:14px 0 5px;display:block">' +
      'Pessoa do time</label><select id="lp_eq"><option value="">Escrever outro nome</option>' +
      '</select>' +
      campoTexto("lp_nome", "Nome completo", "Como está no contrato") +
      campoTexto("lp_mail", "Email", "nome@empresa.com.br") + '</div>');
    var sel = cx.querySelector("#lp_eq");
    equipe.forEach(function (p) {
      sel.appendChild(el('<option value="' + esc(p.nome) + '">' + esc(p.nome) +
        (p.funcao ? " · " + esc(p.funcao) : "") + '</option>'));
    });
    sel.onchange = function () {
      if (sel.value) cx.querySelector("#lp_nome").value = sel.value;
    };
    var bs = el('<button class="btn btn-ouro">Liberar acesso</button>');
    var f = modal("Liberar acesso", "Time do cliente", cx, [bs]);
    bs.onclick = function () {
      api("/api/admin/acesso-pessoa", {
        cliente_id: cid, tipo: tipo, alvo_id: alvoId,
        nome: cx.querySelector("#lp_nome").value,
        email: cx.querySelector("#lp_mail").value
      }).then(function (r) {
        if (r.erro) return toast(r.erro);
        f.remove(); toast("Acesso liberado"); aoTerminar();
      });
    };
  }

  /* No painel, a conversa entra só como resumo. O lugar de conversar é a
     página própria, com largura para ler e responder. */
  function cartaoFala(c, msgs, aoMudar) {
    var novos = msgs.filter(function (m) { return m.de === "cliente" && !m.lido; });
    var card = el('<div class="q-card q-fala"><div class="q-cab">' +
      '<div><div class="eyebrow">Fale conosco</div>' +
      '<h3 class="q-t">Conversa com <em class="grifo">' + esc(c.empresa) + '</em></h3></div>' +
      (novos.length ? '<span class="q-conta q-conta-alerta">' + novos.length +
        (novos.length === 1 ? " nova" : " novas") + '</span>' : '') + '</div></div>');
    var ultima = msgs[0];
    if (!ultima) {
      card.appendChild(el('<p class="small muted">Nenhuma mensagem ainda. ' +
        'O que você escrever aqui aparece no acompanhamento dele.</p>'));
    } else {
      card.appendChild(el('<div class="fala-resumo">' +
        '<span class="fala-quem">' +
        (ultima.de === "b3sales" ? "Você" : esc(ultima.autor || c.empresa)) +
        '<i>' + dataBr(ultima.criado_em) + '</i></span>' +
        '<p>' + esc(String(ultima.texto || "").slice(0, 130)) + '</p></div>'));
    }
    var b = el('<button class="btn btn-ameixa btn-sm" style="margin-top:14px;width:100%">' +
      'Abrir a conversa</button>');
    b.onclick = function () { abrirConversa(c.id); };
    card.appendChild(b);
    return card;
  }

  /* A conversa em página própria: histórico largo, resposta embaixo,
     arquivo e link nos dois sentidos. */
  function abrirConversa(cid) {
    S.rota = "conversa"; S.cid = cid;
    Promise.all([
      api("/api/admin/cliente-painel/" + cid),
      api("/api/admin/recado-lido", { cliente_id: cid })
    ]).then(function (r) { shell(telaConversa(r[0])); });
  }

  function telaConversa(d) {
    var c = d.cliente, msgs = d.recados || [];
    var wrap = document.createElement("div");
    var topo = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Fale conosco</div>' +
      '<h1 class="serif">Conversa com <em class="grifo">' + esc(c.empresa) + '</em></h1>' +
      '<p class="muted small" style="margin-top:6px">O que você escreve aqui aparece ' +
      'no acompanhamento dele. Ele não vê nada do resto do sistema.</p></div>' +
      '<div style="display:flex;gap:10px"></div></div>');
    var volta = el('<button class="btn btn-fantasma btn-sm">← Voltar para o cliente</button>');
    volta.onclick = function () { abrirCliente(cid_de(c), S.ciclo); };
    topo.lastChild.appendChild(volta);
    wrap.appendChild(topo);

    var caixa = el('<div class="conversa"></div>');
    var fio = el('<div class="conversa-fio"></div>');
    if (!msgs.length) {
      fio.appendChild(el('<p class="muted" style="text-align:center;padding:40px 0">' +
        'Nenhuma mensagem ainda. Escreva a primeira aqui embaixo.</p>'));
    }
    msgs.slice().reverse().forEach(function (m) {
      var meu = m.de === "b3sales";
      var bal = el('<div class="conv-linha ' + (meu ? "meu" : "dele") + '"></div>');
      var bol = el('<div class="conv-bolha"></div>');
      bol.appendChild(el('<div class="conv-cab"><b>' +
        (meu ? "Grupo B3 Sales" : esc(m.autor || c.empresa)) + '</b>' +
        '<span>' + dataBr(m.criado_em) + '</span></div>'));
      if (m.assunto) bol.appendChild(el('<div class="conv-as">' + esc(m.assunto) + '</div>'));
      if (m.texto) bol.appendChild(el('<p class="conv-tx">' + esc(m.texto) + '</p>'));
      if (m.link) {
        bol.appendChild(el('<a class="conv-lk" href="' + esc(m.link) +
          '" target="_blank" rel="noopener">' + esc(m.link) + '</a>'));
      }
      (m.anexos || []).forEach(function (a) {
        bol.appendChild(el('<a class="conv-lk" href="/api/midia/' + esc(a.id) +
          '" target="_blank" rel="noopener">⇩ ' + esc(a.nome) + '</a>'));
      });
      var bx = el('<button class="conv-x" title="Apagar">×</button>');
      bx.onclick = function () {
        api("/api/admin/recado-apagar", { id: m.id })
          .then(function () { abrirConversa(cid_de(c)); });
      };
      bol.appendChild(bx);
      bal.appendChild(bol);
      fio.appendChild(bal);
    });
    caixa.appendChild(fio);

    var nova = el('<div class="conv-nova">' +
      '<input type="text" class="conv-as-in" placeholder="Assunto (opcional)">' +
      '<textarea class="conv-tx-in" placeholder="Escreva para ' +
      esc(c.responsavel || c.empresa) + '"></textarea>' +
      '<input type="text" class="conv-lk-in" placeholder="Colar um link (opcional)">' +
      '</div>');
    var anexados = [], listaAx = el('<div class="fala-ax-lista"></div>');
    function pintarAx() {
      listaAx.innerHTML = "";
      anexados.forEach(function (a, i) {
        var t = el('<span class="fala-ax-t">' + esc(a.nome) + ' <button>×</button></span>');
        t.querySelector("button").onclick = function () { anexados.splice(i, 1); pintarAx(); };
        listaAx.appendChild(t);
      });
    }
    var linha = el('<div class="conv-acoes"></div>');
    linha.appendChild(botaoEnviar("↑ Anexar arquivo", cid_de(c), "recado", function (r) {
      anexados.push({ id: r.id, nome: r.nome }); pintarAx();
    }));
    var bEnv = el('<button class="btn btn-ameixa">Enviar para o cliente</button>');
    bEnv.onclick = function () {
      bEnv.disabled = true;
      api("/api/admin/recado", {
        cliente_id: cid_de(c), ciclo: S.ciclo || "",
        assunto: nova.querySelector(".conv-as-in").value,
        texto: nova.querySelector(".conv-tx-in").value,
        link: nova.querySelector(".conv-lk-in").value,
        midia_ids: anexados.map(function (a) { return a.id; })
      }).then(function (r) {
        bEnv.disabled = false;
        if (r.erro) return toast(r.erro);
        toast("Mensagem enviada"); abrirConversa(cid_de(c));
      });
    };
    linha.appendChild(bEnv);
    nova.appendChild(listaAx); nova.appendChild(linha);
    caixa.appendChild(nova);
    wrap.appendChild(caixa);
    return wrap;
  }

  function cid_de(c) { return c && c.id; }

  function telaCliente(d) {
    var c = d.cliente;
    var wrap = document.createElement("div");
    CAPA_CSS = {};
    (d.capas || []).forEach(function (x) { CAPA_CSS[x.id] = x.css; });

    var volta = el('<button class="p-voltar" style="margin-bottom:14px">← Todos os clientes</button>');
    volta.onclick = function () { abrirCliente(c.id, d.ciclo); };
    wrap.appendChild(volta);

    /* capa do cliente: cor da casa ou imagem enviada */
    var fundo = CAPA_CSS[c.capa] || "linear-gradient(135deg,#241030,#5A3A6E 62%,#8E6FA3)";
    if (c.capa_midia_id) {
      var ajC = {};
      try { ajC = JSON.parse(c.capa_ajuste || "{}") || {}; } catch (e) { ajC = {}; }
      fundo = "url(/api/midia/" + esc(c.capa_midia_id) + ") " +
        (ajC.x == null ? 50 : ajC.x) + "% " + (ajC.y == null ? 50 : ajC.y) + "%/" +
        (ajC.zoom && ajC.zoom !== 100 ? ajC.zoom + "% auto" : "cover") +
        " no-repeat, " + fundo;
    }
    var capa = el('<div class="cli-capa" style="' +
      (c.capa_midia_id ? fundoImagem(c.capa_midia_id, c.capa_ajuste)
                       : "background:" + fundo) + '"></div>');

    var barraCapa = el('<div class="cli-capa-barra"></div>');
    var envCapaCli = botaoEnviar(c.capa_midia_id ? "↑ Trocar a capa" : "↑ Imagem de capa",
      c.id, "capa", function (r) {
        api("/api/admin/cliente-editar", { id: c.id, capa_midia_id: r.id, capa_ajuste: "" })
          .then(function () { abrirCliente(c.id, S.ciclo); });
      }, "image/*");
    envCapaCli.classList.add("cli-capa-env");
    envCapaCli.title = "Capa do cliente: 1600 × 400 px";
    barraCapa.appendChild(envCapaCli);

    if (c.capa_midia_id) {
      var bEnqCapa = el('<button type="button" class="cli-capa-b" title="Enquadrar a capa">⛶</button>');
      bEnqCapa.onclick = function () {
        modalMoldura("Capa de " + c.empresa, "capa_cliente", c.capa_midia_id,
          c.capa_ajuste, function (aj) {
            api("/api/admin/cliente-editar", { id: c.id, capa_ajuste: aj })
              .then(function () { toast("Capa enquadrada"); abrirCliente(c.id, S.ciclo); });
          });
      };
      barraCapa.appendChild(bEnqCapa);
      var bLimpa = el('<button type="button" class="cli-capa-b" title="Voltar para a cor">×</button>');
      bLimpa.onclick = function () {
        api("/api/admin/cliente-editar", { id: c.id, capa_midia_id: "", capa_ajuste: "" })
          .then(function () { abrirCliente(c.id, S.ciclo); });
      };
      barraCapa.appendChild(bLimpa);
    }

    var trocaCapa = el('<div class="cli-capa-cores"></div>');
    (d.capas || []).forEach(function (cp) {
      var b = el('<button type="button" title="' + esc(cp.nome) + '" style="background:' +
        cp.css + '"' + (!c.capa_midia_id && c.capa === cp.id ? ' class="on"' : '') + '></button>');
      b.onclick = function () {
        api("/api/admin/cliente-editar", { id: c.id, capa: cp.id, capa_midia_id: "" })
          .then(function () { abrirCliente(c.id, S.ciclo); });
      };
      trocaCapa.appendChild(b);
    });
    barraCapa.appendChild(trocaCapa);
    capa.appendChild(barraCapa);
    wrap.appendChild(capa);

    /* cabeçalho com logo, nome e o que importa de relance */
    var cab = el('<div class="cli-cab"></div>');
    var colFoto = el('<div class="cli-foto-col"></div>');
    var logo = el('<div class="cli-logo" style="' + estiloLogo(c, 82) + '">' +
      (c.logo_midia_id ? '' : esc((c.empresa || "?").slice(0, 1).toUpperCase())) + '</div>');
    colFoto.appendChild(logo);
    var acoesLogo = el('<div class="cli-logo-env"></div>');
    var envLogo = botaoEnviar(c.logo_midia_id ? "↑ Trocar" : "↑ Foto ou logo", c.id, "logo",
      function (r) {
        api("/api/admin/cliente-editar", { id: c.id, logo_midia_id: r.id,
          logo_ajuste: "" }).then(function () { abrirCliente(c.id, S.ciclo); });
      }, "image/*");
    envLogo.title = "Foto ou logo: 400 × 400 px, quadrada";
    acoesLogo.appendChild(envLogo);
    if (c.logo_midia_id) {
      var bAj = el('<button class="btn btn-linha btn-sm">Enquadrar</button>');
      bAj.onclick = function () {
        modalMoldura("Foto de " + c.empresa, "logo_cliente", c.logo_midia_id,
          c.logo_ajuste, function (aj) {
            api("/api/admin/cliente-editar", { id: c.id, logo_ajuste: aj })
              .then(function () { toast("Enquadramento salvo"); abrirCliente(c.id, S.ciclo); });
          });
      };
      acoesLogo.appendChild(bAj);
    }
    colFoto.appendChild(acoesLogo);
    cab.appendChild(colFoto);

    var selos = "";
    if (d.dias_contrato != null) {
      var cls = d.dias_contrato < 0 ? "kan-venceu"
              : d.dias_contrato <= 30 ? "kan-alerta" : "kan-prazo";
      selos += '<span class="' + cls + '">' + (d.dias_contrato < 0
        ? "contrato vencido" : d.dias_contrato + " dias de contrato") + '</span>';
    }
    if (d.dias_contato != null && d.dias_contato > 7) {
      selos += '<span class="kan-alerta">' + d.dias_contato + ' dias sem falar</span>';
    }
    if (d.score) {
      selos += '<span class="selo selo-entrada">entrada: ' + esc(d.score.entrada_nome) + '</span>';
    }
    cab.appendChild(el('<div class="cli-id">' +
      '<div class="eyebrow">' + esc(c.tipo_servico || c.segmento || "Cliente") + '</div>' +
      '<h1 class="serif cli-nome">' + esc(c.empresa) + '</h1>' +
      '<p class="cli-sub">' + esc([c.responsavel, c.cargo, c.contato, c.email]
        .filter(Boolean).join("  ·  ")) + '</p>' +
      '<div class="cli-selos">' + selos + '</div></div>'));
    wrap.appendChild(cab);

    /* ações principais e o resto num canto */
    var acoes = el('<div class="cli-acoes"></div>');
    var bMat = el('<button class="btn btn-ouro btn-sm">Materiais e metodologia</button>');
    bMat.onclick = function () { abrirMateriais(c.id); };
    var bPortal = el('<button class="btn btn-linha btn-sm">' +
      (c.portal_ativo ? "Link do cliente" : "Abrir acompanhamento") + '</button>');
    bPortal.onclick = function () { modalPortal(c); };
    var bEd = el('<button class="btn btn-linha btn-sm">Editar dados</button>');
    bEd.onclick = function () { modalEditar(c); };
    var bCiclo = el('<button class="btn btn-ameixa btn-sm">+ Novo ciclo</button>');
    bCiclo.onclick = function () { modalNovoCiclo(S.det); };
    var bCur = el('<button class="btn btn-linha btn-sm">Cursos do cliente</button>');
    bCur.onclick = function () { abrirCursosCliente(c.id); };
    acoes.appendChild(bMat); acoes.appendChild(bCur);
    acoes.appendChild(bEd); acoes.appendChild(bCiclo); acoes.appendChild(bPortal);

    var mais = el('<div class="cli-mais"><button class="btn btn-fantasma btn-sm">⋯</button>' +
      '<div class="cli-menu"></div></div>');
    var menu = mais.querySelector(".cli-menu");
    menu.appendChild(el('<a href="/api/admin/exportar/' + c.id + '">Exportar JSON</a>'));
    menu.appendChild(el('<a href="/api/admin/exportar-csv/' + c.id + '">Exportar CSV</a>'));
    var bArq = el('<a href="#">' + (c.arquivado ? "Reativar" : "Arquivar") + '</a>');
    bArq.onclick = function (e) {
      e.preventDefault();
      api("/api/admin/cliente-editar", { id: c.id, arquivado: !c.arquivado })
        .then(function () {
          toast(c.arquivado ? "Cliente reativado" : "Cliente arquivado");
          S.arquivados = false; S.rota = "lista"; carregar();
        });
    };
    var bDel = el('<a href="#" class="perigo">Excluir</a>');
    bDel.onclick = function (e) { e.preventDefault(); modalExcluir(c); };
    menu.appendChild(bArq); menu.appendChild(bDel);
    mais.querySelector("button").onclick = function () { mais.classList.toggle("on"); };
    acoes.appendChild(mais);
    wrap.appendChild(acoes);

    /* ponto de alerta */
    var alerta = el('<div class="cli-alerta"><div class="eyebrow">Ponto de atenção</div>' +
      '<textarea placeholder="O que preocupa nesta operação agora"></textarea></div>');
    var ta = alerta.querySelector("textarea");
    ta.value = c.alerta || "";
    ta.oninput = function () {
      clearTimeout(ta._t);
      ta._t = setTimeout(function () {
        api("/api/admin/cliente-editar", { id: c.id, alerta: ta.value })
          .then(function () { toast("Anotado"); });
      }, 900);
    };
    if (c.alerta) alerta.classList.add("on");
    wrap.appendChild(alerta);

    var destinos = {
      diagnostico: function () { S.aba = "respostas"; abrirDetalhe(c.id); },
      jornada: function () { S.aba = "respostas"; abrirDetalhe(c.id); },
      rota: function () { S.aba = "rota"; abrirDetalhe(c.id); },
      materiais: function () { abrirMateriais(c.id); },
      treinamento: function () { abrirCursosCliente(c.id); },
      arquivos: function () { S.aba = "respostas"; abrirDetalhe(c.id); }
    };

    /* ---- o quadro do cliente: cartões de tamanhos diferentes ---- */
    var geral = Math.round(d.frentes.reduce(function (a, f) { return a + f.pct; }, 0) /
      (d.frentes.length || 1));

    /* faixa de números, no alto */
    var pills = el('<div class="q-pills"></div>');
    d.frentes.forEach(function (f) {
      var cor = COR_FRENTE[f.chave] || "var(--ouro-600)";
      var pill = el('<div class="q-pill"><span class="q-pill-i" style="background:' + cor +
        '"></span><span class="q-pill-n">' + esc(f.nome) + '</span>' +
        '<b>' + f.pct + '%</b></div>');
      pill.onclick = (destinos[f.chave] || function () {});
      pills.appendChild(pill);
    });
    wrap.appendChild(pills);

    var q = el('<div class="quadro"></div>');

    /* 1. identidade, o cartão grande com a marca do cliente */
    var idc = el('<div class="q-card q-ident" style="background:' + fundo + '">' +
      '<div class="q-ident-fundo"></div>' +
      '<div class="q-ident-in">' +
      '<div class="q-ident-foto" style="' + estiloLogo(c, 64) + '">' +
      (c.logo_midia_id ? '' : esc((c.empresa || "?").slice(0, 1).toUpperCase())) +
      '</div>' +
      '<div class="q-ident-t"><strong>' + esc(c.empresa) + '</strong>' +
      '<span>' + esc(c.tipo_servico || c.segmento || "Cliente da carteira") + '</span></div>' +
      '<div class="q-ident-pe">' +
      '<div><b>' + (d.equipe || 0) + '</b><span>pessoas</span></div>' +
      '<div><b>' + (d.ciclos || []).length + '</b><span>ciclos</span></div>' +
      '<div><b>' + (d.dias_contrato != null ? d.dias_contrato : "—") + '</b>' +
      '<span>dias de contrato</span></div></div></div></div>');
    var novos = (d.recados || []).filter(function (m) {
      return m.de === "cliente" && !m.lido;
    }).length;
    var bFala = el('<button class="q-fala-b' + (novos ? " tem" : "") + '">✉ Fale conosco' +
      (novos ? '<span class="q-fala-n">' + novos + '</span>' : '') + '</button>');
    bFala.onclick = function () {
      var alvo = document.querySelector(".q-fala");
      if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    idc.querySelector(".q-ident-in").appendChild(bFala);
    q.appendChild(idc);

    /* 1b. a conversa com o cliente, por dentro do sistema */
    q.appendChild(cartaoFala(c, d.recados || [], function () { abrirCliente(c.id, S.ciclo); }));

    /* 2. o anel grande do progresso geral */
    var ger = el('<div class="q-card q-geral">' +
      '<div class="eyebrow">Implementação</div>' +
      '<div class="q-anel">' + anel(geral, "var(--ouro-600)", 132) + '</div>' +
      '<p class="small muted center">média das seis frentes</p></div>');
    q.appendChild(ger);

    /* 3. os três pilares em barras */
    var pil = el('<div class="q-card"><div class="eyebrow">Método ECO</div>' +
      '<h3 class="q-t">Os três <em class="grifo">pilares</em></h3>' +
      '<div class="pilares-graf" id="q_pil"></div></div>');
    var gp = pil.querySelector("#q_pil");
    if (d.score) {
      [["E", "Estratégia", "var(--azul-500)"], ["C", "Condução", "var(--ouro-600)"],
       ["O", "Operação", "var(--terracota-500)"]].forEach(function (x) {
        var v = d.score.pilares[x[0]].score;
        gp.appendChild(el('<div class="pil-linha"><span class="pil-k">' + x[0] + '</span>' +
          '<span class="pil-n">' + x[1] + '</span>' +
          '<span class="pil-t"><i style="width:' + Math.max(v, 2) + '%;background:' +
          x[2] + '"></i></span><span class="pil-v">' + v + '</span></div>'));
      });
      gp.appendChild(el('<div class="score-linha"><span>Porta de entrada</span>' +
        '<b style="font-size:19px">' + esc(d.score.entrada_nome) + '</b></div>'));
    } else {
      gp.appendChild(el('<p class="small muted">Os pilares aparecem quando o Dia 0 ' +
        'for respondido.</p>'));
    }
    q.appendChild(pil);

    /* 4. próximas ações, em lista de tarefa */
    var tar = el('<div class="q-card q-tarefas"><div class="q-cab">' +
      '<div><div class="eyebrow">Rota</div>' +
      '<h3 class="q-t">O que vem <em class="grifo">agora</em></h3></div>' +
      '<span class="q-conta">' + d.frentes[2].feito + '/' + d.frentes[2].total + '</span>' +
      '</div><div class="q-lista"></div></div>');
    var lt = tar.querySelector(".q-lista");
    if (!(d.proximas || []).length) {
      lt.appendChild(el('<p class="small muted">Nenhuma ação em aberto. ' +
        'Gere a rota pelo diagnóstico.</p>'));
    }
    (d.proximas || []).forEach(function (a) {
      var cor = ({ E: "var(--azul-500)", C: "var(--ouro-600)",
                   O: "var(--terracota-500)" })[a.pilar] || "var(--muted)";
      lt.appendChild(el('<div class="q-tar"><span class="q-tar-p" style="background:' +
        cor + '"></span><div><strong>' + esc(a.titulo) + '</strong>' +
        (a.responsavel ? '<span class="small muted">' + esc(a.responsavel) + '</span>' : '') +
        '</div><span class="q-tar-s">' + esc(a.status) + '</span></div>'));
    });
    var bR = el('<button class="btn btn-linha btn-sm" style="margin-top:12px">Abrir a rota</button>');
    bR.onclick = function () { S.aba = "rota"; abrirDetalhe(c.id); };
    tar.appendChild(bR);
    q.appendChild(tar);

    /* 5. a jornada dos ciclos, em trilha */
    var trilha = el('<div class="q-card q-trilha"><div class="eyebrow">Jornada</div>' +
      '<h3 class="q-t">Os <em class="grifo">180 dias</em></h3>' +
      '<div class="q-passos"></div></div>');
    var qp = trilha.querySelector(".q-passos");
    var porCiclo = {};
    (d.ciclos || []).forEach(function (x) { porCiclo[x.ciclo] = x; });
    ["Dia 0", "Dia 30", "Dia 60", "Dia 90", "Dia 120", "Dia 150", "Dia 180"]
      .forEach(function (nome) {
        var x = porCiclo[nome];
        var st = !x ? "" : (x.enviado_em ? "ok" : "andando");
        var p = el('<div class="q-passo ' + st + '"><span class="q-bola">' +
          (st === "ok" ? "✓" : "") + '</span><span class="q-passo-n">' +
          nome.replace("Dia ", "") + '</span></div>');
        if (x) {
          p.onclick = function () { S.aba = "respostas"; abrirDetalhe(c.id, nome); };
        }
        qp.appendChild(p);
      });
    trilha.appendChild(el('<p class="small muted" style="margin-top:12px">' +
      d.frentes[1].feito + ' de 7 ciclos respondidos</p>'));
    q.appendChild(trilha);

    /* 6. o que já foi entregue */
    var ent = el('<div class="q-card"><div class="eyebrow">Entregue</div>' +
      '<h3 class="q-t">O que já <em class="grifo">instalamos</em></h3>' +
      '<div class="q-feitos"></div></div>');
    var lf = ent.querySelector(".q-feitos");
    if (!(d.feitas_recentes || []).length) {
      lf.appendChild(el('<p class="small muted">Nada concluído ainda.</p>'));
    }
    (d.feitas_recentes || []).forEach(function (a) {
      lf.appendChild(el('<div class="q-feito"><span class="q-ok">✓</span>' +
        '<span>' + esc(a.titulo) + '</span></div>'));
    });
    q.appendChild(ent);

    /* 7. o que já foi compartilhado com ele, e o que ele mandou de volta */
    var cp = d.compartilhado || {};
    var tre = d.frentes[4];
    var troca = el('<div class="q-card q-troca"><div class="eyebrow">A troca</div>' +
      '<h3 class="q-t">O que já <em class="grifo">passou entre vocês</em></h3>' +
      '<div class="q-troca-grade"></div></div>');
    var tg = troca.querySelector(".q-troca-grade");
    [["▤", "Páginas de material", cp.paginas || 0,
      (cp.paginas_liberadas || 0) + " liberadas para ele", "var(--ouro-600)", destinos.materiais],
     ["▶", "Módulos de curso", cp.modulos || 0,
      (cp.cursos || 0) + " cursos com acesso", "var(--verde-500)", destinos.treinamento],
     ["♪", "Aulas assistidas", tre.feito + "/" + tre.total,
      "pela equipe dele", "var(--azul-500)", destinos.treinamento],
     ["↑", "Arquivos que enviamos", cp.arquivos_nossos || 0,
      "materiais, contratos, provas", "var(--ameixa-600)", null],
     ["↓", "Arquivos que ele mandou", cp.arquivos_dele || 0,
      "anexos do diagnóstico", "var(--terracota-500)", null],
     ["★", "Provas sociais dele", cp.provas || 0,
      "guardadas no arsenal", "var(--ouro-800)", function () { PROVA_CLI = c.id; abrirProvas(); }]
    ].forEach(function (x) {
      var it = el('<div class="q-troca-i"' + (x[5] ? ' style="cursor:pointer"' : '') + '>' +
        '<span class="q-troca-ic" style="background:' + x[4] + '">' + x[0] + '</span>' +
        '<div><b>' + x[2] + '</b><strong>' + esc(x[1]) + '</strong>' +
        '<span class="small muted">' + esc(x[3]) + '</span></div></div>');
      if (x[5]) it.onclick = x[5];
      tg.appendChild(it);
    });
    q.appendChild(troca);

    /* 8. quem é quem */
    if ((d.equipe_lista || []).length) {
      var eq = el('<div class="q-card q-equipe"><div class="eyebrow">Time do cliente</div>' +
        '<h3 class="q-t">Quem é <em class="grifo">quem</em></h3>' +
        '<div class="q-pessoas"></div></div>');
      var lp = eq.querySelector(".q-pessoas");
      d.equipe_lista.forEach(function (pe) {
        lp.appendChild(el('<div class="q-pessoa"><span class="q-av" style="background:' +
          corDaEmpresa(pe.nome) + '">' +
          esc((pe.nome || "?").slice(0, 1).toUpperCase()) + '</span>' +
          '<div><strong>' + esc(pe.nome) + '</strong>' +
          (pe.funcao ? '<span class="small muted">' + esc(pe.funcao) + '</span>' : '') +
          '</div></div>'));
      });
      var bE2 = el('<button class="btn btn-linha btn-sm" style="margin-top:12px">Ver a equipe</button>');
      bE2.onclick = function () { S.aba = "equipe"; abrirDetalhe(c.id); };
      eq.appendChild(bE2);
      q.appendChild(eq);
    }

    wrap.appendChild(q);

    /* as frentes de trabalho, no mesmo padrão dos cartões de cima */
    wrap.appendChild(el('<div class="p-sec" style="margin:30px 0 14px">' +
      '<div class="eyebrow">Onde você trabalha</div>' +
      '<h2 class="serif tit-card" style="margin-bottom:0">As frentes de ' +
      '<em class="grifo">trabalho</em></h2></div>'));
    var abas = el('<div class="cli-abas"></div>');
    [["respostas", "Respostas do diagnóstico", "◍", "var(--azul-500)",
      "O que o cliente respondeu, bloco a bloco"],
     ["rota", "Rota do ciclo", "◆", "var(--terracota-500)",
      "As ações combinadas e o status de cada uma"],
     ["equipe", "Equipe do cliente", "◐", "var(--ameixa-600)",
      "Nome, função e contato de cada pessoa"],
     ["diagnostico", "Diagnóstico interno", "▦", "var(--ouro-600)",
      "Score, indicadores e gargalos. Só você vê"],
     ["notas", "Análise da B3 Sales", "✎", "var(--verde-500)",
      "As suas observações sobre este ciclo"],
     ["historico", "Histórico", "◷", "var(--azul-800)",
      "Tudo que mudou, com data e hora"]].forEach(function (t) {
      var b = el('<div class="cli-aba">' +
        '<span class="cli-aba-i" style="background:' + t[3] + '">' + t[2] + '</span>' +
        '<div><strong>' + esc(t[1]) + '</strong>' +
        '<span class="small muted">' + esc(t[4]) + '</span></div></div>');
      b.onclick = function () { S.aba = t[0]; abrirDetalhe(c.id); };
      abas.appendChild(b);
    });
    wrap.appendChild(abas);
    return wrap;
  }

  function abrirCliente(cid, ciclo) {
    api("/api/admin/cliente-painel/" + cid).then(function (d) {
      if (d.erro) return toast(d.erro);
      S.cid = cid; S.ciclo = ciclo || null; S.rota = "cliente";
      api("/api/admin/cliente/" + cid + (ciclo ? "?ciclo=" + encodeURIComponent(ciclo) : ""))
        .then(function (det) { S.det = det; S.ciclo = det.ciclo; shell(telaCliente(d)); });
    });
  }

