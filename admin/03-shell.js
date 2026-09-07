  function shell(conteudo) {
    app.innerHTML = "";
    var barra = el('<div class="barra"><div class="barra-in">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
      marcaHtml() +
      '<div class="barra-tag">Diagnóstico ECO · Área interna</div></div>' +
      '<div style="display:flex;gap:6px"></div></div></div>');
    var dir = barra.querySelector(".barra-in > div:last-child");
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





