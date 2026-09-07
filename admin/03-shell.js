  function shell(conteudo) {
    app.innerHTML = "";
    var barra = el('<div class="barra"><div class="barra-in">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
      marcaHtml() +
      '<div class="barra-tag">Diagnóstico ECO · Área interna</div></div>' +
      '<div class="barra-menu"><div class="sino-wrap">' +
      '<button class="sino" type="button" title="Pendências">🔔</button>' +
      '</div></div></div></div>');
    montarSino(barra.querySelector(".sino-wrap"));
    var dir = barra.querySelector(".barra-menu");
    var bv = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "painel" ? " at" : "") + '">Visão geral</button>');
    bv.onclick = function () { abrirPainel(); };
    dir.appendChild(bv);
    var bp = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "lista" ? " at" : "") + '">Clientes</button>');
    bp.onclick = function () { S.rota = "lista"; carregar(); };
    dir.appendChild(bp);
    var bmet = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "metodologia" ? " at" : "") + '">Metodologia</button>');
    bmet.onclick = function () { abrirMetodologia(); };
    dir.appendChild(bmet);
    var bcur = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "cursos" ? " at" : "") + '">Cursos</button>');
    bcur.onclick = function () { abrirCursos(); };
    dir.appendChild(bcur);
    var bpr = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "provas" ? " at" : "") + '">Prova social</button>');
    bpr.onclick = function () { abrirProvas(); };
    dir.appendChild(bpr);
    var bu = el('<button class="btn btn-fantasma btn-sm">Acessos</button>');
    bu.onclick = modalUsuarios;
    dir.appendChild(bu);
    var bca = el('<button class="btn btn-fantasma btn-sm' +
      (S.rota === "central" ? " at" : "") + '">Central de Ação</button>');
    bca.onclick = function () { abrirCentral(); };
    dir.appendChild(bca);
    var bmc = el('<button class="btn btn-fantasma btn-sm">Modo cliente</button>');
    bmc.onclick = modalModoCliente;
    dir.appendChild(bmc);
    var bc = el('<button class="btn btn-fantasma btn-sm">Configurações</button>');
    bc.onclick = modalConfig;
    var bs = el('<button class="btn btn-fantasma btn-sm">Sair</button>');
    bs.onclick = function () { api("/api/admin/sair", {}).then(function () { telaLogin(); }); };
    dir.appendChild(bc); dir.appendChild(bs);
    app.appendChild(barra);
    var palco = el('<div class="palco"></div>');
    palco.appendChild(conteudo);
    app.appendChild(palco);
  }

  /* O sininho: fica no ar enquanto a área interna está aberta, sozinho
     conferindo se tem mensagem nova ou tarefa atrasada. Não precisa
     clicar em nada pra saber. */
  var SINO = { mensagens: 0, atrasados: 0 };

  function pintarSino(wrap) {
    var b = wrap.querySelector(".sino");
    var velho = wrap.querySelector(".sino-selo");
    if (velho) velho.remove();
    var total = SINO.mensagens + SINO.atrasados;
    if (total > 0) {
      b.appendChild(el('<span class="sino-selo">' + (total > 99 ? "99+" : total) + '</span>'));
    }
  }

  function abrirSino(wrap) {
    var velho = wrap.querySelector(".sino-drop");
    if (velho) { velho.remove(); return; }
    var drop = el('<div class="sino-drop"></div>');
    if (!SINO.mensagens && !SINO.atrasados) {
      drop.appendChild(el('<div class="sino-vazio">Nenhuma pendência agora.</div>'));
    }
    if (SINO.mensagens) {
      var m = el('<button class="sino-item" type="button"><b>' + SINO.mensagens +
        (SINO.mensagens === 1 ? " mensagem nova</b>" : " mensagens novas</b>") +
        '<br>Ver em Visão geral, Fale conosco</button>');
      m.onclick = function () { drop.remove(); abrirPainel(); };
      drop.appendChild(m);
    }
    if (SINO.atrasados) {
      var t = el('<button class="sino-item" type="button"><b>' + SINO.atrasados +
        (SINO.atrasados === 1 ? " tarefa atrasada</b>" : " tarefas atrasadas</b>") +
        '<br>Ver na Central de Ação</button>');
      t.onclick = function () { drop.remove(); CF = { aberto: "1" }; abrirCentral(); };
      drop.appendChild(t);
    }
    wrap.appendChild(drop);
    setTimeout(function () {
      document.addEventListener("click", function fechar(e) {
        if (!wrap.contains(e.target)) { drop.remove(); document.removeEventListener("click", fechar); }
      });
    }, 0);
  }

  function conferirSino(wrap) {
    api("/api/admin/notificacoes").then(function (r) {
      if (r.erro) return;
      SINO.mensagens = r.mensagens || 0; SINO.atrasados = r.atrasados || 0;
      if (wrap && document.body.contains(wrap)) pintarSino(wrap);
    });
  }

  function montarSino(wrap) {
    wrap.querySelector(".sino").onclick = function () { abrirSino(wrap); };
    pintarSino(wrap);
    conferirSino(wrap);
    if (!S._sinoRelogio) {
      S._sinoRelogio = setInterval(function () {
        var atual = document.querySelector(".sino-wrap");
        if (atual) conferirSino(atual);
      }, 60000);
    }
  }





