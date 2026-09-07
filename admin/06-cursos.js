  /* ------------------------------------------------------------ cursos */
  function telaCursos(d, cursoAberto) {
    var wrap = document.createElement("div");
    CAPA_CSS = {};
    (d.capas || []).forEach(function (c) { CAPA_CSS[c.id] = c.css; });

    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Treinamento</div>' +
      '<h1 class="serif">Os seus <em class="grifo">cursos</em></h1>' +
      '<p class="muted small" style="margin-top:6px">Trilhas de aula para a equipe do ' +
      'cliente assistir. Você escolhe quem vê cada curso.</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"></div></div>'));
    var bNovo = el('<button class="btn btn-ouro btn-sm">+ Novo curso</button>');
    bNovo.onclick = function () { modalCurso(null, d); };
    wrap.querySelector(".painel-topo > div:last-child").appendChild(bNovo);

    if (!d.cursos.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:52px 24px">' +
        '<h2 class="serif" style="font-size:26px;color:var(--ameixa-900)">Nenhum curso ainda</h2>' +
        '<p class="muted small" style="margin-top:8px">Crie a primeira trilha. ' +
        'Aula longa entra por link do Panda, YouTube ou Vimeo.</p></div>'));
      return wrap;
    }

    /* agrupado por trilha */
    var trilhas = {};
    d.cursos.forEach(function (c) {
      var t = c.trilha || "Sem trilha";
      (trilhas[t] = trilhas[t] || []).push(c);
    });
    Object.keys(trilhas).forEach(function (t) {
      wrap.appendChild(el('<div class="p-sec" style="margin:30px 0 12px">' +
        '<div class="eyebrow">Trilha</div>' +
        '<h2 class="serif tit-card" style="margin-bottom:0">' + esc(t) + '</h2></div>'));
      var grade = el('<div class="cur-grade"></div>');
      trilhas[t].forEach(function (c) {
        var fundo = c.capa_midia_id
          ? "#241030 url(/api/midia/" + esc(c.capa_midia_id) + ") center/cover"
          : (CAPA_CSS[c.capa] || "var(--creme-3)");
        var card = el('<div class="cur-card" style="background:' + fundo + '">' +
          '<div class="cur-veu"></div>' +
          '<div class="cur-topo">' +
          '<span class="' + (c.clientes.length ? "cur-lib" : "cur-fech") + '">' +
          (c.clientes.length ? c.clientes.length + " com acesso" : "ninguém vê") +
          '</span></div>' +
          '<div class="cur-in">' +
          '<div class="cur-trilha">' + esc(c.trilha || "Treinamento") + '</div>' +
          '<strong class="cur-nome">' + esc(c.titulo) + '</strong>' +
          '<div class="cur-pe"><span class="cur-play">▶</span>' +
          '<span>' + c.aulas + (c.aulas === 1 ? " aula" : " aulas") + '</span></div>' +
          '</div></div>');
        card.onclick = function () { abrirCurso(c.id); };
        grade.appendChild(card);
      });
      /* o botão de capa dentro do próprio cartão, para editar sem entrar */
      trilhas[t].forEach(function (c, i) {
        var env = botaoEnviar("↑ Capa", null, "curso", function (r) {
          api("/api/admin/curso-salvar", { id: c.id, titulo: c.titulo, trilha: c.trilha,
            descricao: c.descricao, capa: c.capa, capa_midia_id: r.id,
            banner_midia_id: c.banner_midia_id || "", publicado: c.publicado })
            .then(function () { abrirCursos(); });
        }, "image/*");
        env.classList.add("cur-capa-env");
        env.title = "Capa do curso: 600 × 800 px";
        env.onclick = function (e) { e.stopPropagation(); };
        grade.children[i].appendChild(env);
      });
      wrap.appendChild(grade);
    });
    return wrap;
  }

  function modalCurso(c, d) {
    c = c || {};
    var corpo = el('<div>' +
      campoTexto("cu_tit", "Nome do curso", "Ex: Treinamento de SDR", c.titulo) +
      campoTexto("cu_tri", "Trilha", "Ex: Funil de vendas", c.trilha) +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Sobre o curso</label>' +
      '<textarea id="cu_desc" style="min-height:70px">' + esc(c.descricao || "") + '</textarea></div>' +
      '<label class="small" style="color:var(--ameixa-700);margin-bottom:7px;display:block">Capa</label>' +
      '<div class="capa-esc" id="cu_capas"></div></div>');
    var capaEsc = c.capa || "ouro";
    var cx = corpo.querySelector("#cu_capas");
    (d.capas || []).forEach(function (cp) {
      var b = el('<button type="button" title="' + esc(cp.nome) + '" style="background:' +
        cp.css + '"' + (capaEsc === cp.id ? ' class="on"' : '') + '></button>');
      b.onclick = function () {
        capaEsc = cp.id;
        cx.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      };
      cx.appendChild(b);
    });
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(c.id ? "Editar curso" : "Novo curso", "Treinamento", corpo, [bs]);
    bs.onclick = function () {
      var t = f.querySelector("#cu_tit").value.trim();
      if (!t) return toast("Dê um nome ao curso");
      api("/api/admin/curso-salvar", { id: c.id, titulo: t,
        trilha: f.querySelector("#cu_tri").value,
        descricao: f.querySelector("#cu_desc").value, capa: capaEsc })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Curso salvo"); abrirCurso(r.id);
        });
    };
  }

  function telaCurso(c) {
    var wrap = document.createElement("div");
    CAPA_CSS = {};
    (c.capas || []).forEach(function (x) { CAPA_CSS[x.id] = x.css; });

    var volta = el('<button class="btn btn-linha btn-sm">← Todos os cursos</button>');
    volta.onclick = function () { abrirCursos(); };
    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">' + esc(c.trilha || "Treinamento") + '</div>' +
      '<h1 class="serif">' + esc(c.titulo) + '</h1>' +
      (c.descricao ? '<p class="muted small" style="margin-top:6px">' +
        esc(c.descricao) + '</p>' : '') +
      '</div><div style="display:flex;gap:10px;align-items:center"></div></div>'));
    var topo = wrap.querySelector(".painel-topo > div:last-child");
    var bEd = el('<button class="btn btn-linha btn-sm">Editar curso</button>');
    bEd.onclick = function () { modalCurso(c, c); };
    var bAc = el('<button class="btn btn-ouro btn-sm">Quem pode ver</button>');
    bAc.onclick = function () { modalAcesso(c); };
    topo.appendChild(bEd); topo.appendChild(bAc); topo.appendChild(volta);

    /* banner grande do curso, como na capa de uma escola */
    var fundo = c.banner_midia_id
      ? "#241030 url(/api/midia/" + esc(c.banner_midia_id) + ") center/cover"
      : (CAPA_CSS[c.capa] || "var(--creme-3)");
    var banner = el('<div class="cur-banner" style="background:' + fundo + '"></div>');
    var envB = botaoEnviar("↑ Imagem de fundo", null, "curso", function (r) {
      api("/api/admin/curso-salvar", { id: c.id, titulo: c.titulo, trilha: c.trilha,
        descricao: c.descricao, capa: c.capa, capa_midia_id: c.capa_midia_id || "",
        banner_midia_id: r.id, publicado: c.publicado })
        .then(function () { abrirCurso(c.id); });
    }, "image/*");
    envB.classList.add("cur-banner-env");
    envB.title = "Banner do curso: 1600 × 500 px";
    banner.appendChild(envB);
    wrap.appendChild(banner);

    function linhaAula(a, i) {
      var linha = el('<div class="aula">' +
        '<span class="aula-n">' + (i + 1) + '</span>' +
        '<div class="aula-capa" style="background:' +
        (a.capa_midia_id ? "#000 url(/api/midia/" + esc(a.capa_midia_id) +
          ") center/cover" : "var(--creme-3)") + '"></div>' +
        '<div class="aula-d"><strong>' + esc(a.titulo) + '</strong>' +
        '<div class="small muted">' +
        (a.duracao ? esc(a.duracao) + "  ·  " : "") +
        (a.midia_id ? "vídeo no sistema" : a.url ? "por link" : "sem vídeo ainda") +
        '</div>' +
        (a.descricao ? '<div class="small muted">' + esc(a.descricao) + '</div>' : '') +
        '</div></div>');
      var acoes = el('<div class="aula-x"></div>');
      [["↑", "cima"], ["↓", "baixo"]].forEach(function (m) {
        var b = el('<button class="acao-x" title="Mover">' + m[0] + '</button>');
        b.onclick = function () {
          api("/api/admin/aula-mover", { id: a.id, direcao: m[1] })
            .then(function () { abrirCurso(c.id); });
        };
        acoes.appendChild(b);
      });
      var be = el('<button class="acao-x" title="Editar">✎</button>');
      be.onclick = function () { modalAula(c, a); };
      var bx = el('<button class="acao-x" title="Remover">×</button>');
      bx.onclick = function () {
        if (!confirm('Remover a aula "' + a.titulo + '"?')) return;
        api("/api/admin/aula-excluir", { id: a.id }).then(function () { abrirCurso(c.id); });
      };
      acoes.appendChild(be); acoes.appendChild(bx);
      linha.appendChild(acoes);
      return linha;
    }

    var lista = el('<div></div>');
    lista.appendChild(el('<div class="eyebrow" style="margin:22px 0 4px">' +
      c.aulas.length + (c.aulas.length === 1 ? " aula" : " aulas") +
      ' em ' + c.modulos.length +
      (c.modulos.length === 1 ? " módulo" : " módulos") + '</div>'));

    (c.modulos || []).forEach(function (m, mi) {
      var bloco = el('<div class="card card-pad" style="margin-bottom:14px">' +
        '<div class="mod-cab"><div><div class="eyebrow">Módulo ' + (mi + 1) + '</div>' +
        '<h3 class="serif mod-t">' + esc(m.titulo) + '</h3>' +
        (m.descricao ? '<p class="small muted" style="margin:4px 0 0">' +
          esc(m.descricao) + '</p>' : '') + '</div></div></div>');
      var cab = bloco.querySelector(".mod-cab");
      var ax = el('<div class="aula-x"></div>');
      [["↑", "cima"], ["↓", "baixo"]].forEach(function (d) {
        var b = el('<button class="acao-x" title="Mover">' + d[0] + '</button>');
        b.onclick = function () {
          api("/api/admin/modulo-mover", { id: m.id, direcao: d[1] })
            .then(function () { abrirCurso(c.id); });
        };
        ax.appendChild(b);
      });
      var bem = el('<button class="acao-x" title="Editar">✎</button>');
      bem.onclick = function () { modalModulo(c, m); };
      var bxm = el('<button class="acao-x" title="Remover">×</button>');
      bxm.onclick = function () {
        if (!confirm('Remover o módulo "' + m.titulo + '"?\nAs aulas dele não se perdem, ' +
          'voltam para fora dos módulos.')) return;
        api("/api/admin/modulo-excluir", { id: m.id }).then(function () { abrirCurso(c.id); });
      };
      ax.appendChild(bem); ax.appendChild(bxm);
      cab.appendChild(ax);
      if (!m.aulas.length) {
        bloco.appendChild(el('<p class="small muted" style="margin-top:12px">Módulo vazio.</p>'));
      }
      m.aulas.forEach(function (a, i) { bloco.appendChild(linhaAula(a, i)); });
      var bna = el('<button class="btn btn-linha btn-sm" style="margin-top:14px">+ Aula neste módulo</button>');
      bna.onclick = function () { modalAula(c, null, m.id); };
      bloco.appendChild(bna);
      lista.appendChild(bloco);
    });

    if ((c.soltas || []).length) {
      var fora = el('<div class="card card-pad" style="margin-bottom:14px">' +
        '<div class="eyebrow">Fora de módulo</div></div>');
      c.soltas.forEach(function (a, i) { fora.appendChild(linhaAula(a, i)); });
      lista.appendChild(fora);
    }

    if (!c.modulos.length && !(c.soltas || []).length) {
      lista.appendChild(el('<div class="card card-pad center" style="padding:38px 24px">' +
        '<p class="muted small">Curso vazio. Crie o primeiro módulo e depois as aulas dele.</p>' +
        '</div>'));
    }

    var acoesL = el('<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:6px"></div>');
    var bMod = el('<button class="btn btn-ouro btn-sm">+ Novo módulo</button>');
    bMod.onclick = function () { modalModulo(c, null); };
    var bNova = el('<button class="btn btn-linha btn-sm">+ Aula avulsa</button>');
    bNova.onclick = function () { modalAula(c, null, ""); };
    acoesL.appendChild(bMod); acoesL.appendChild(bNova);
    lista.appendChild(acoesL);
    wrap.appendChild(lista);

    var bDel = el('<button class="btn btn-linha btn-sm" style="margin-top:20px">Excluir este curso</button>');
    bDel.onclick = function () {
      if (!confirm('Excluir "' + c.titulo + '" e todas as aulas?')) return;
      api("/api/admin/curso-excluir", { id: c.id }).then(function () {
        toast("Curso excluído"); abrirCursos();
      });
    };
    wrap.appendChild(bDel);
    return wrap;
  }


  function modalModulo(c, m) {
    m = m || {};
    var corpo = el('<div>' +
      campoTexto("mo_tit", "Nome do módulo", "Ex: Comece por aqui", m.titulo) +
      '<div class="campo"><label class="small" style="color:var(--ameixa-700);' +
      'margin-bottom:5px;display:block">Sobre o módulo</label>' +
      '<textarea id="mo_desc" style="min-height:70px">' + esc(m.descricao || "") +
      '</textarea></div></div>');
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(m.id ? "Editar módulo" : "Novo módulo", esc(c.titulo), corpo, [bs]);
    bs.onclick = function () {
      var t = f.querySelector("#mo_tit").value.trim();
      if (!t) return toast("Dê um nome ao módulo");
      api("/api/admin/modulo-salvar", { id: m.id, curso_id: c.id, titulo: t,
        descricao: f.querySelector("#mo_desc").value })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Módulo salvo"); abrirCurso(c.id);
        });
    };
  }

  function modalAula(c, a, moduloId) {
    a = a || {};
    var corpo = el('<div>' +
      campoTexto("au_tit", "Nome da aula", "Ex: Como abrir a ligação", a.titulo) +
      campoTexto("au_dur", "Duração", "Ex: 42 min", a.duracao) +
      campoTexto("au_url", "Link do vídeo", "Panda, YouTube, Vimeo ou Meet", a.url) +
      '<div id="au_video" style="margin:-8px 0 16px"></div>' +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Sobre a aula</label>' +
      '<textarea id="au_desc" style="min-height:70px">' + esc(a.descricao || "") + '</textarea></div>' +
      '<div id="au_capa" style="margin-bottom:14px"></div>' +
      '<div id="au_mat"></div></div>');

    var capaId = a.capa_midia_id || "";
    var matId = a.material_midia_id || "";
    var videoId = a.midia_id || "";

    var areaVid = corpo.querySelector("#au_video");
    function pintarVideo() {
      areaVid.innerHTML = "";
      areaVid.appendChild(el('<p class="small muted" style="margin:0 0 8px">Ou envie o ' +
        'arquivo da aula. Sobe em pedaços, então gravação longa passa.</p>'));
      if (videoId) {
        areaVid.appendChild(el('<video controls style="width:100%;border-radius:var(--r-sm);' +
          'background:#000;margin-bottom:8px" src="/api/midia/' + esc(videoId) + '"></video>'));
      }
      areaVid.appendChild(botaoEnviar(videoId ? "↑ Trocar o vídeo" : "↑ Enviar o vídeo da aula",
        null, "aula", function (r) { videoId = r.id; pintarVideo(); }, "video/*"));
    }
    pintarVideo();

    var areaCapa = corpo.querySelector("#au_capa");
    function pintarCapa() {
      areaCapa.innerHTML = "";
      areaCapa.appendChild(el('<label class="small" style="color:var(--ameixa-700);' +
        'margin-bottom:6px;display:block">Capa da aula</label>'));
      if (capaId) {
        areaCapa.appendChild(el('<img src="/api/midia/' + esc(capaId) + '" ' +
          'style="max-height:78px;border-radius:var(--r-sm);margin-bottom:8px;display:block">'));
      }
      areaCapa.appendChild(botaoEnviar(capaId ? "↑ Trocar a capa" : "↑ Enviar uma capa",
        null, "curso", function (r) { capaId = r.id; pintarCapa(); }, "image/*", "capa_aula"));
    }
    pintarCapa();

    var areaMat = corpo.querySelector("#au_mat");
    function pintarMat() {
      areaMat.innerHTML = "";
      areaMat.appendChild(el('<label class="small" style="color:var(--ameixa-700);' +
        'margin-bottom:6px;display:block">Material de apoio</label>'));
      if (matId) {
        areaMat.appendChild(el('<a class="ws-arq" style="margin-bottom:8px" href="/api/midia/' +
          esc(matId) + '" target="_blank"><span class="ws-arq-i">⇩</span>' +
          '<span>Abrir o material</span></a>'));
      }
      areaMat.appendChild(botaoEnviar(matId ? "↑ Trocar o material" : "↑ Anexar material",
        null, "curso", function (r) { matId = r.id; pintarMat(); }));
    }
    pintarMat();

    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(a.id ? "Editar aula" : "Nova aula", esc(c.titulo), corpo, [bs]);
    bs.onclick = function () {
      var t = f.querySelector("#au_tit").value.trim();
      if (!t) return toast("Dê um nome à aula");
      api("/api/admin/aula-salvar", { id: a.id, curso_id: c.id, titulo: t,
        duracao: f.querySelector("#au_dur").value, url: f.querySelector("#au_url").value,
        descricao: f.querySelector("#au_desc").value, midia_id: videoId,
        modulo_id: moduloId !== undefined ? moduloId : (a.modulo_id || ""),
        capa_midia_id: capaId, material_midia_id: matId })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Aula salva"); abrirCurso(c.id);
        });
    };
  }

  /* Quem enxerga este curso: primeiro a empresa, depois quem do time dela,
     e para o curso inteiro ou só um módulo ou uma aula. */
  function modalAcesso(c) {
    var corpo = el('<div><p class="small muted" style="margin:0 0 14px;line-height:1.7">' +
      'Marque as empresas que enxergam este curso. Depois, se quiser, escolha quem ' +
      'do time de cada uma pode ver, e até qual módulo ou aula.</p>' +
      '<div id="ac_corpo"></div></div>');
    var bs = el('<button class="btn btn-ouro">Salvar as empresas</button>');
    var f = modal("Quem pode ver", esc(c.titulo), corpo, [bs]);
    var alvo = corpo.querySelector("#ac_corpo");
    var escolhidos = (c.acesso || []).slice();

    function pintar() {
      alvo.innerHTML = "";
      if (!(c.clientes || []).length) {
        alvo.appendChild(el('<p class="small muted">Nenhum cliente ativo ainda.</p>'));
        return;
      }
      c.clientes.forEach(function (cli) {
        var tem = escolhidos.indexOf(cli.id) >= 0;
        var bloco = el('<div class="ae-pg"></div>');
        var it = el('<div class="pessoa esc' + (tem ? " on" : "") +
          '" style="cursor:pointer;margin:0"><span class="esc-n">' +
          (tem ? "✓" : "") + '</span>' +
          '<div class="pessoa-d"><strong>' + esc(cli.empresa) + '</strong></div></div>');
        it.onclick = function () {
          var i = escolhidos.indexOf(cli.id);
          if (i >= 0) escolhidos.splice(i, 1); else escolhidos.push(cli.id);
          pintar();
        };
        bloco.appendChild(it);

        if (tem) {
          var pes = el('<div class="ae-pessoas"></div>');
          pes.appendChild(el('<p class="small muted" style="margin:8px 0 4px 26px">' +
            'Carregando o time…</p>'));
          bloco.appendChild(pes);
          Promise.all([
            api("/api/admin/cliente-painel/" + cli.id),
            api("/api/admin/acessos-pessoa?cliente=" + encodeURIComponent(cli.id))
          ]).then(function (rr) {
            var equipe = rr[0].equipe_lista || [];
            var meus = (rr[1].acessos || []).filter(function (a) {
              return (a.tipo === "curso" && a.alvo_id === c.id) ||
                     (a.tipo === "modulo" && alvosDoCurso().indexOf(a.alvo_id) >= 0) ||
                     (a.tipo === "aula" && alvosDoCurso().indexOf(a.alvo_id) >= 0);
            });
            pes.innerHTML = "";
            if (!meus.length) {
              pes.appendChild(el('<p class="small muted" style="margin:6px 0 0 26px">' +
                'Todo o time dela enxerga este curso.</p>'));
            }
            meus.forEach(function (a) {
              var i2 = el('<div class="ae-p"><span>' + esc(a.nome) +
                ' <span class="small muted">' + esc(a.email) + '</span>' +
                ' <span class="ca-tag">' + esc(nomeDoAlvo(a)) + '</span></span></div>');
              var bx = el('<button class="btn btn-fantasma btn-sm">Tirar</button>');
              bx.onclick = function () {
                api("/api/admin/acesso-pessoa", { cliente_id: cli.id, tipo: a.tipo,
                  alvo_id: a.alvo_id, id: a.id, remover: true })
                  .then(function () { toast("Acesso retirado"); pintar(); });
              };
              i2.appendChild(bx);
              pes.appendChild(i2);
            });
            var bMais = el('<button class="ae-mais">+ liberar para alguém do time dela' +
              '</button>');
            bMais.onclick = function () { modalLiberarCurso(c, cli, equipe, pintar); };
            pes.appendChild(bMais);
          });
        }
        alvo.appendChild(bloco);
      });
    }

    function alvosDoCurso() {
      var ids = [];
      (c.modulos || []).forEach(function (m) {
        ids.push(m.id);
        (m.aulas || []).forEach(function (a) { ids.push(a.id); });
      });
      return ids;
    }

    function nomeDoAlvo(a) {
      if (a.tipo === "curso") return "curso inteiro";
      var achado = "";
      (c.modulos || []).forEach(function (m) {
        if (m.id === a.alvo_id) achado = "módulo " + m.titulo;
        (m.aulas || []).forEach(function (x) {
          if (x.id === a.alvo_id) achado = "aula " + x.titulo;
        });
      });
      return achado || a.tipo;
    }

    pintar();
    bs.onclick = function () {
      api("/api/admin/curso-acesso", { curso_id: c.id, clientes: escolhidos })
        .then(function () { f.remove(); toast("Acesso atualizado"); abrirCurso(c.id); });
    };
  }

  /* Libera o curso, um módulo ou uma aula para uma pessoa do time do cliente. */
  function modalLiberarCurso(c, cli, equipe, aoTerminar) {
    var cx = el('<div><p style="margin-top:0">Liberar para alguém de <strong>' +
      esc(cli.empresa) + '</strong>. O acesso só vale com o nome e o email ' +
      'confirmados, e vale <strong>só para esta empresa</strong>.</p>' +
      '<label class="small ca-lb">O que vai ser liberado</label>' +
      '<select id="lc_alvo"></select>' +
      '<label class="small ca-lb">Pessoa do time</label>' +
      '<select id="lc_eq"><option value="">Escrever outro nome</option></select>' +
      campoTexto("lc_nome", "Nome completo", "Como está no contrato") +
      campoTexto("lc_mail", "Email", "nome@empresa.com.br") + '</div>');

    var sa = cx.querySelector("#lc_alvo");
    sa.appendChild(el('<option value="curso:' + esc(c.id) + '">O curso inteiro</option>'));
    (c.modulos || []).forEach(function (m) {
      sa.appendChild(el('<option value="modulo:' + esc(m.id) + '">Módulo · ' +
        esc(m.titulo) + '</option>'));
      (m.aulas || []).forEach(function (a) {
        sa.appendChild(el('<option value="aula:' + esc(a.id) + '">    Aula · ' +
          esc(a.titulo) + '</option>'));
      });
    });

    var se = cx.querySelector("#lc_eq");
    equipe.forEach(function (p2) {
      se.appendChild(el('<option value="' + esc(p2.nome) + '">' + esc(p2.nome) +
        (p2.funcao ? " · " + esc(p2.funcao) : "") + '</option>'));
    });
    se.onchange = function () {
      if (se.value) cx.querySelector("#lc_nome").value = se.value;
    };

    var bs = el('<button class="btn btn-ouro">Liberar acesso</button>');
    var f = modal("Liberar acesso", esc(cli.empresa), cx, [bs]);
    bs.onclick = function () {
      var partes = sa.value.split(":");
      api("/api/admin/acesso-pessoa", {
        cliente_id: cli.id, tipo: partes[0], alvo_id: partes[1],
        nome: cx.querySelector("#lc_nome").value,
        email: cx.querySelector("#lc_mail").value
      }).then(function (r) {
        if (r.erro) return toast(r.erro);
        f.remove(); toast("Acesso liberado"); aoTerminar();
      });
    };
  }

  function abrirCursos() {
    api("/api/admin/cursos").then(function (d) {
      if (d.erro) return toast(d.erro);
      S.rota = "cursos";
      shell(telaCursos(d));
    });
  }

  function abrirCurso(id) {
    api("/api/admin/curso/" + id).then(function (c) {
      if (c.erro) return toast(c.erro);
      S.rota = "cursos";
      shell(telaCurso(c));
    });
  }


