  /* --------------------------------------------- espaço de materiais */
  var CAPA_CSS = {};

  function autoAltura(t) {
    t.style.height = "auto";
    t.style.height = Math.max(t.scrollHeight, 38) + "px";
  }

  function salvarBloco(b) {
    clearTimeout(b._t);
    b._t = setTimeout(function () {
      api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo })
        .then(function () { pisca("Salvo"); });
    }, 800);
  }

  var _piscaT;
  function pisca(txt) {
    var e = document.getElementById("ws_salvo");
    if (!e) return toast(txt);
    e.textContent = txt; e.classList.add("on");
    clearTimeout(_piscaT);
    _piscaT = setTimeout(function () { e.classList.remove("on"); }, 1400);
  }

  /* A formatacao e escrita no proprio texto, com marcas simples.
     Assim o conteudo continua sendo texto puro: nada de HTML colado sujo,
     e o portal do cliente sabe desenhar do mesmo jeito. */
  function envolver(t, b, abre, fecha) {
    var i = t.selectionStart, f = t.selectionEnd;
    var sel = t.value.slice(i, f) || "texto";
    t.value = t.value.slice(0, i) + abre + sel + (fecha || abre) + t.value.slice(f);
    b.conteudo.texto = t.value;
    salvarBloco(b);
    t.focus();
    t.setSelectionRange(i + abre.length, i + abre.length + sel.length);
    autoAltura(t);
  }

  function barraFormato(t, b, equipe) {
    var barra = el('<div class="fmt"></div>');
    [["N", "negrito", "**"], ["I", "itálico", "__"], ["A", "destacar em vermelho", "!!"]]
      .forEach(function (x) {
        var bt = el('<button type="button" title="' + x[1] + '" class="fmt-b fmt-' +
          x[0].toLowerCase() + '">' + x[0] + '</button>');
        bt.onmousedown = function (e) { e.preventDefault(); };
        bt.onclick = function () { envolver(t, b, x[2]); };
        barra.appendChild(bt);
      });
    if ((equipe || []).length) {
      var sel = document.createElement("select");
      sel.className = "fmt-men";
      sel.appendChild(el('<option value="">@ marcar alguém</option>'));
      equipe.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.nome; o.textContent = p.nome;
        sel.appendChild(o);
      });
      sel.onchange = function () {
        if (!sel.value) return;
        var i = t.selectionStart;
        t.value = t.value.slice(0, i) + "@[" + sel.value + "] " + t.value.slice(i);
        b.conteudo.texto = t.value; salvarBloco(b); autoAltura(t);
        sel.value = ""; t.focus();
      };
      barra.appendChild(sel);
    }
    return barra;
  }

  function blocoTexto(b, tag, place, equipe) {
    var cx = document.createElement("div");
    var t = document.createElement("textarea");
    t.className = "ws-t " + tag;
    t.rows = 1;
    t.placeholder = place;
    t.value = b.conteudo.texto || "";
    t.oninput = function () { b.conteudo.texto = t.value; autoAltura(t); salvarBloco(b); };
    setTimeout(function () { autoAltura(t); }, 0);
    var barra = barraFormato(t, b, equipe);
    barra.style.display = "none";
    t.onfocus = function () { barra.style.display = "flex"; };
    t.onblur = function () { setTimeout(function () { barra.style.display = "none"; }, 200); };
    cx.appendChild(barra);
    cx.appendChild(t);
    return cx;
  }


  function embutirVideo(ct) {
    if (ct.midia_id) {
      return el('<video controls class="ws-video" src="/api/midia/' + esc(ct.midia_id) + '"></video>');
    }
    var u = (ct.url || "").trim();
    if (!u) return null;
    var yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return el('<div class="ws-emb"><iframe src="https://www.youtube.com/embed/' +
      esc(yt[1]) + '" allowfullscreen loading="lazy"></iframe></div>');
    var vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return el('<div class="ws-emb"><iframe src="https://player.vimeo.com/video/' +
      esc(vm[1]) + '" allowfullscreen loading="lazy"></iframe></div>');
    /* Panda e outros players entregam a propria url de embed */
    if (/^https?:\/\//.test(u)) {
      return el('<div class="ws-emb"><iframe src="' + esc(u) +
        '" allowfullscreen loading="lazy"></iframe></div>');
    }
    return null;
  }

  function desenharBloco(b, pag, redesenhar) {
    var box = el('<div class="ws-bloco" data-id="' + b.id + '"></div>');
    var corpo = el('<div class="ws-corpo"></div>');

    var equipe = pag._equipe || [];
    if (b.tipo === "titulo") {
      corpo.appendChild(blocoTexto(b, "ws-titulo", "Título da seção", equipe));

    } else if (b.tipo === "texto") {
      corpo.appendChild(blocoTexto(b, "", "Escreva aqui", equipe));

    } else if (b.tipo === "destaque") {
      var d = el('<div class="ws-destaque"></div>');
      d.appendChild(blocoTexto(b, "", "O que não pode ser esquecido", equipe));
      corpo.appendChild(d);

    } else if (b.tipo === "divisor") {
      corpo.appendChild(el('<hr class="ws-hr">'));

    } else if (b.tipo === "lista") {
      var itens = b.conteudo.itens || [""];
      var ul = el('<div class="ws-lista"></div>');
      function pintaLista() {
        ul.innerHTML = "";
        itens.forEach(function (txt, i) {
          var li = el('<div class="ws-li"><span class="ws-ponto"></span></div>');
          var inp = document.createElement("input");
          inp.type = "text"; inp.value = txt; inp.placeholder = "Item da lista";
          inp.oninput = function () { itens[i] = inp.value; b.conteudo.itens = itens; salvarBloco(b); };
          inp.onkeydown = function (e) {
            if (e.key === "Enter") { e.preventDefault(); itens.splice(i + 1, 0, ""); b.conteudo.itens = itens; salvarBloco(b); pintaLista(); }
            if (e.key === "Backspace" && !inp.value && itens.length > 1) {
              e.preventDefault(); itens.splice(i, 1); b.conteudo.itens = itens; salvarBloco(b); pintaLista();
            }
          };
          li.appendChild(inp);
          ul.appendChild(li);
        });
      }
      pintaLista();
      corpo.appendChild(ul);

    } else if (b.tipo === "tabela") {
      var cols = b.conteudo.colunas || ["", ""];
      var lins = b.conteudo.linhas || [["", ""]];
      var tw = el('<div class="ws-tabela-wrap"></div>');
      function pintaTabela() {
        tw.innerHTML = "";
        var tab = el('<table class="ws-tabela"><thead><tr></tr></thead><tbody></tbody></table>');
        var trh = tab.querySelector("thead tr");
        cols.forEach(function (c, ci) {
          var th = document.createElement("th");
          var i = document.createElement("input");
          i.type = "text"; i.value = c; i.placeholder = "Coluna";
          i.oninput = function () { cols[ci] = i.value; b.conteudo.colunas = cols; salvarBloco(b); };
          th.appendChild(i); trh.appendChild(th);
        });
        var tbb = tab.querySelector("tbody");
        lins.forEach(function (linha, li) {
          var tr = document.createElement("tr");
          cols.forEach(function (_, ci) {
            var td = document.createElement("td");
            var i = document.createElement("input");
            i.type = "text"; i.value = linha[ci] || "";
            i.oninput = function () { linha[ci] = i.value; b.conteudo.linhas = lins; salvarBloco(b); };
            td.appendChild(i); tr.appendChild(td);
          });
          var tdx = document.createElement("td");
          tdx.className = "ws-td-x";
          var bx = el('<button type="button" class="acao-x" title="Remover linha">×</button>');
          bx.onclick = function () { lins.splice(li, 1); b.conteudo.linhas = lins; salvarBloco(b); pintaTabela(); };
          tdx.appendChild(bx); tr.appendChild(tdx);
          tbb.appendChild(tr);
        });
        tw.appendChild(tab);
        var acoes = el('<div class="ws-tab-acoes"></div>');
        var bl = el('<button type="button" class="acao-add">+ Linha</button>');
        bl.onclick = function () { lins.push(cols.map(function () { return ""; })); b.conteudo.linhas = lins; salvarBloco(b); pintaTabela(); };
        var bc = el('<button type="button" class="acao-add">+ Coluna</button>');
        bc.onclick = function () {
          cols.push(""); lins.forEach(function (l) { l.push(""); });
          b.conteudo.colunas = cols; b.conteudo.linhas = lins; salvarBloco(b); pintaTabela();
        };
        acoes.appendChild(bl); acoes.appendChild(bc);
        tw.appendChild(acoes);
      }
      pintaTabela();
      corpo.appendChild(tw);

    } else if (b.tipo === "imagem" || b.tipo === "arquivo") {
      var ehImg = b.tipo === "imagem";
      var cx = el('<div class="ws-anexo"></div>');
      var ref = b.conteudo.midia_id || b.conteudo.anexo_id;
      var base = b.conteudo.midia_id ? "/api/midia/" : "/api/anexo/";
      if (ref && ehImg) {
        var fig = el('<div class="ws-img-cx"></div>');
        fig.appendChild(el('<img class="ws-img" src="' + base + esc(ref) + '" alt="">'));
        fig.appendChild(el('<a class="ws-img-abrir" href="' + base + esc(ref) +
          '" target="_blank" rel="noopener">Abrir em tamanho real ↗</a>'));
        cx.appendChild(fig);
      } else if (ref) {
        cx.appendChild(el('<a class="ws-arq" href="' + base + esc(ref) + '" target="_blank">' +
          '<span class="ws-arq-i">⇩</span><span>' +
          esc(b.conteudo.titulo || "Abrir arquivo") + '</span></a>'));
      }
      cx.appendChild(botaoEnviar(
        ehImg ? "↑ Enviar imagem do computador" : "↑ Enviar arquivo do computador",
        pag.cliente_id, ehImg ? "imagem" : "arquivo",
        function (r) {
          b.conteudo.midia_id = r.id; b.conteudo.anexo_id = "";
          if (!b.conteudo.titulo) b.conteudo.titulo = r.nome;
          api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo }).then(redesenhar);
        }, ehImg ? "image/*" : TIPOS_ACEITOS));
      var sel = document.createElement("select");
      sel.appendChild(el('<option value="">Ou escolher um arquivo já no sistema</option>'));
      (pag.arquivos || []).forEach(function (a) {
        if (ehImg && !/^image\//.test(a.tipo || "")) return;
        var o = document.createElement("option");
        o.value = (a.origem_tabela === "anexos" ? "a:" : "m:") + a.id;
        o.textContent = a.nome + (a.tamanho ? "  ·  " + tamanhoBonito(a.tamanho) : "");
        if (a.id === ref) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = function () {
        var v = sel.value;
        b.conteudo.midia_id = v.indexOf("m:") === 0 ? v.slice(2) : "";
        b.conteudo.anexo_id = v.indexOf("a:") === 0 ? v.slice(2) : "";
        api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo }).then(redesenhar);
      };
      cx.appendChild(sel);
      var leg = document.createElement("input");
      leg.type = "text";
      leg.placeholder = ehImg ? "Legenda da imagem" : "Como chamar este arquivo";
      leg.value = ehImg ? (b.conteudo.legenda || "") : (b.conteudo.titulo || "");
      leg.oninput = function () {
        if (ehImg) b.conteudo.legenda = leg.value; else b.conteudo.titulo = leg.value;
        salvarBloco(b);
      };
      cx.appendChild(leg);
      corpo.appendChild(cx);

    } else if (b.tipo === "video") {
      var vx = el('<div class="ws-anexo"></div>');
      var emb = embutirVideo(b.conteudo);
      if (emb) vx.appendChild(emb);
      var uv = document.createElement("input");
      uv.type = "text"; uv.placeholder = "Link do Panda, YouTube ou Vimeo";
      uv.value = b.conteudo.url || "";
      uv.oninput = function () { b.conteudo.url = uv.value; salvarBloco(b); };
      uv.onblur = function () { if (uv.value) redesenhar(); };
      vx.appendChild(uv);
      vx.appendChild(el('<p class="small muted" style="margin:2px 0 0">Link do Meet, ' +
        'Panda, YouTube ou Vimeo. Ou envie o arquivo abaixo, de qualquer tamanho.</p>'));
      vx.appendChild(botaoEnviar("↑ Enviar o vídeo", pag.cliente_id, "video",
        function (r) {
          b.conteudo.midia_id = r.id; b.conteudo.url = "";
          if (!b.conteudo.titulo) b.conteudo.titulo = r.nome;
          api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo }).then(redesenhar);
        }, "video/*"));
      ["titulo", "descricao", "duracao"].forEach(function (campo) {
        var i = document.createElement("input");
        i.type = "text";
        i.placeholder = campo === "titulo" ? "Nome da aula" :
          campo === "duracao" ? "Duração, ex: 42 min" : "Sobre o que é";
        i.value = b.conteudo[campo] || "";
        i.oninput = function () { b.conteudo[campo] = i.value; salvarBloco(b); };
        vx.appendChild(i);
      });
      corpo.appendChild(vx);

    } else if (b.tipo === "audio") {
      var ax = el('<div class="ws-anexo"></div>');
      if (b.conteudo.midia_id) {
        ax.appendChild(el('<audio controls style="width:100%" src="/api/midia/' +
          esc(b.conteudo.midia_id) + '"></audio>'));
      }
      ax.appendChild(botaoEnviar("↑ Enviar áudio", pag.cliente_id, "audio", function (r) {
        b.conteudo.midia_id = r.id;
        if (!b.conteudo.titulo) b.conteudo.titulo = r.nome;
        api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo }).then(redesenhar);
      }, "audio/*"));
      var at = document.createElement("input");
      at.type = "text"; at.placeholder = "Nome do áudio"; at.value = b.conteudo.titulo || "";
      at.oninput = function () { b.conteudo.titulo = at.value; salvarBloco(b); };
      ax.appendChild(at);
      corpo.appendChild(ax);

    } else if (b.tipo === "subpagina") {
      var sx = el('<div class="ws-anexo"></div>');
      if (b.conteudo.pagina_id) {
        var ir = el('<button type="button" class="ws-sub">⤷ ' +
          esc(b.conteudo.titulo || "Abrir subpágina") + '</button>');
        ir.onclick = function () {
          pag.cliente_id ? abrirMateriais(pag.cliente_id, b.conteudo.pagina_id)
                         : abrirMetodologia(b.conteudo.pagina_id);
        };
        sx.appendChild(ir);
      } else {
        var criar = el('<button type="button" class="acao-add">+ Criar a subpágina</button>');
        criar.onclick = function () {
          var t = prompt("Nome da subpágina:", "Nova subpágina");
          if (t === null) return;
          api("/api/admin/ws-pagina", { cliente_id: pag.cliente_id || null,
            titulo: t || "Nova subpágina", pai_id: pag.id })
            .then(function (r) {
              b.conteudo.pagina_id = r.id; b.conteudo.titulo = t || "Nova subpágina";
              api("/api/admin/ws-bloco", { id: b.id, conteudo: b.conteudo }).then(redesenhar);
            });
        };
        sx.appendChild(criar);
      }
      corpo.appendChild(sx);

    } else if (b.tipo === "link") {
      var lk = el('<div class="ws-link-edit"></div>');
      ["titulo", "url", "descricao"].forEach(function (campo) {
        var i = document.createElement("input");
        i.type = "text";
        i.placeholder = campo === "url" ? "https://..." :
          campo === "titulo" ? "Nome do link" : "Para que serve";
        i.value = b.conteudo[campo] || "";
        i.oninput = function () { b.conteudo[campo] = i.value; salvarBloco(b); };
        lk.appendChild(i);
      });
      if (b.conteudo.url) {
        lk.appendChild(el('<a class="ws-link-ver" href="' + esc(b.conteudo.url) +
          '" target="_blank" rel="noopener">Abrir o link ↗</a>'));
      }
      corpo.appendChild(lk);
    }

    box.appendChild(corpo);

    var lado = el('<div class="ws-lado"></div>');
    var bcima = el('<button type="button" title="Subir">↑</button>');
    bcima.onclick = function () { api("/api/admin/ws-bloco-mover", { id: b.id, direcao: "cima" }).then(redesenhar); };
    var bbaixo = el('<button type="button" title="Descer">↓</button>');
    bbaixo.onclick = function () { api("/api/admin/ws-bloco-mover", { id: b.id, direcao: "baixo" }).then(redesenhar); };
    var bx2 = el('<button type="button" title="Remover">×</button>');
    bx2.onclick = function () {
      if (!confirm("Remover este bloco?")) return;
      api("/api/admin/ws-bloco-excluir", { id: b.id }).then(redesenhar);
    };
    lado.appendChild(bcima); lado.appendChild(bbaixo); lado.appendChild(bx2);
    box.appendChild(lado);
    return box;
  }

  function menuBlocos(tipos, aoEscolher) {
    var m = el('<div class="ws-menu"></div>');
    tipos.forEach(function (t) {
      var b = el('<button type="button" class="ws-menu-b">' +
        '<span class="ws-menu-i">' + esc(t.icone) + '</span>' +
        '<span>' + esc(t.nome) + '</span></button>');
      b.onclick = function () { aoEscolher(t.id); };
      m.appendChild(b);
    });
    return m;
  }

  function telaMateriais(cid, dados, paginaId) {
    var daCasa = !cid;                      /* sem cliente = metodologia da B3 Sales */
    var wrap = document.createElement("div");
    CAPA_CSS = {};
    dados.capas.forEach(function (c) { CAPA_CSS[c.id] = c.css; });

    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">' + (daCasa ? "A base de tudo" : "Materiais e metodologia") + '</div>' +
      (daCasa
        ? '<h1 class="serif">A metodologia <em class="grifo">da casa</em></h1>' +
          '<p class="muted small" style="margin-top:6px">O que vale para qualquer cliente. ' +
          'Daqui você leva uma página pronta para dentro de uma empresa e adapta.</p>'
        : '<h1 class="serif">O que já <em class="grifo">entregamos</em></h1>') +
      '</div><div style="display:flex;gap:10px;align-items:center"></div></div>'));

    if (daCasa && dados.resumo) {
      var rs = dados.resumo;
      wrap.appendChild(el('<div class="kpis" style="margin-bottom:20px">' +
        '<div class="kpi"><b>' + rs.paginas + '</b><span>Páginas</span></div>' +
        '<div class="kpi"><b>' + rs.subpaginas + '</b><span>Subpáginas</span></div>' +
        '<div class="kpi"><b>' + (rs.palavras > 999
          ? (rs.palavras / 1000).toFixed(1).replace(".", ",") + "k" : rs.palavras) +
        '</b><span>Palavras</span></div>' +
        '<div class="kpi"><b>' + rs.arquivos + '</b><span>Arquivos</span></div>' +
        '<div class="kpi"><b>' + rs.cursos + '</b><span>Cursos</span></div>' +
        '<div class="kpi"><b>' + rs.aulas + '</b><span>Aulas</span></div>' +
        '</div>'));
    }
    var acoesTopo = wrap.querySelector(".painel-topo > div:last-child");
    acoesTopo.appendChild(el('<span id="ws_salvo" class="ws-salvo">Salvo</span>'));
    if (!daCasa) {
      var volta = el('<button class="btn btn-linha btn-sm">← Voltar ao cliente</button>');
      volta.onclick = function () { abrirCliente(cid); };
      acoesTopo.appendChild(volta);
    }

    var grade = el('<div class="ws-grade"></div>');

    /* coluna das páginas */
    var lat = el('<div class="ws-lateral"><div class="eyebrow" style="margin-bottom:10px">Páginas</div></div>');
    dados.paginas.forEach(function (pg) {
      var it = el('<div class="ws-pag' + (pg.id === paginaId ? " at" : "") + '">' +
        '<span class="ws-pag-capa" style="background:' + (CAPA_CSS[pg.capa] || "var(--creme-3)") + '"></span>' +
        '<span class="ws-pag-t">' + esc(pg.titulo) + '</span>' +
        (pg.visivel_cliente ? '<span class="ws-olho" title="O cliente vê esta página">◉</span>' : '') +
        '</div>');
      it.onclick = function () {
        daCasa ? abrirMetodologia(pg.id) : abrirMateriais(cid, pg.id);
      };
      lat.appendChild(it);
    });
    if (!dados.paginas.length) {
      lat.appendChild(el('<p class="small muted">Nenhuma página ainda.</p>'));
      var bm = el('<button class="btn btn-ouro btn-sm" style="width:100%;margin-top:10px">Criar a estrutura sugerida</button>');
      bm.onclick = function () {
        api(daCasa ? "/api/admin/metodologia-modelo" : "/api/admin/ws-modelo",
            daCasa ? {} : { cliente_id: cid })
          .then(function () {
            toast("Estrutura criada");
            daCasa ? abrirMetodologia() : abrirMateriais(cid);
          });
      };
      lat.appendChild(bm);
    }
    var bnova = el('<button class="btn btn-linha btn-sm" style="width:100%;margin-top:10px">+ Nova página</button>');
    bnova.onclick = function () {
      var t = prompt("Nome da página:", "Nova página");
      if (t === null) return;
      api("/api/admin/ws-pagina", { cliente_id: cid || null, titulo: t || "Nova página" })
        .then(function (r) { daCasa ? abrirMetodologia(r.id) : abrirMateriais(cid, r.id); });
    };
    lat.appendChild(bnova);
    if (!daCasa) {
      var bTraz = el('<button class="btn btn-ouro btn-sm" style="width:100%;margin-top:8px">↓ Trazer da metodologia</button>');
      bTraz.onclick = function () { modalTrazer(cid); };
      lat.appendChild(bTraz);
      var bEq = el('<button class="btn btn-linha btn-sm" style="width:100%;margin-top:8px">' +
        '⚙ Acesso da equipe</button>');
      bEq.onclick = function () { modalAcessoEquipe(cid, dados.paginas || []); };
      lat.appendChild(bEq);
    }
    grade.appendChild(lat);

    /* a página aberta */
    var col = el('<div class="ws-conteudo"></div>');
    if (!paginaId) {
      col.appendChild(el('<div class="card card-pad center" style="padding:56px 24px">' +
        '<h2 class="serif" style="font-size:26px;color:var(--ameixa-900)">Escolha uma página ao lado</h2>' +
        '<p class="muted small" style="margin-top:8px">Ou crie a estrutura sugerida para começar ' +
        'com as seis páginas do método já montadas.</p></div>'));
      grade.appendChild(col);
      wrap.appendChild(grade);
      return wrap;
    }
    col.appendChild(el('<p class="small muted">Carregando…</p>'));
    grade.appendChild(col);
    wrap.appendChild(grade);

    api("/api/admin/ws-pagina/" + paginaId).then(function (pag) {
      col.innerHTML = "";
      function redesenhar() {
        daCasa ? abrirMetodologia(paginaId) : abrirMateriais(cid, paginaId);
      }

      /* voltar, quando está dentro de uma subpágina */
      if (pag.pai_id) {
        var volt = el('<button class="ws-voltar">← Voltar para a página anterior</button>');
        volt.onclick = function () {
          daCasa ? abrirMetodologia(pag.pai_id) : abrirMateriais(cid, pag.pai_id);
        };
        col.appendChild(volt);
      }

      /* capa: cor da casa ou imagem enviada */
      var capa = el('<div class="ws-capa" style="' +
        (pag.capa_midia_id
          ? fundoImagem(pag.capa_midia_id, pag.capa_ajuste)
          : "background:" + (CAPA_CSS[pag.capa] || "var(--creme-3)")) + '"></div>');
      var trocar = el('<div class="ws-capa-troca"></div>');
      dados.capas.forEach(function (c) {
        var b = el('<button type="button" title="' + esc(c.nome) + '" style="background:' + c.css + '"></button>');
        b.onclick = function () {
          api("/api/admin/ws-pagina", { id: paginaId, capa: c.id }).then(redesenhar);
        };
        trocar.appendChild(b);
      });
      var envCapa = botaoEnviar("↑ Imagem de capa", pag.cliente_id, "capa", function (r) {
        api("/api/admin/ws-pagina", { id: paginaId, capa_midia_id: r.id, capa_ajuste: "" })
          .then(redesenhar);
      }, "image/*");
      envCapa.classList.add("ws-capa-env");
      envCapa.title = "Capa: 1600 × 400 px";
      trocar.appendChild(envCapa);
      if (pag.capa_midia_id) {
        var bMol = el('<button type="button" class="ws-capa-lim" title="Enquadrar">⛶</button>');
        bMol.onclick = function () {
          modalMoldura("Capa da página", "capa_pagina", pag.capa_midia_id,
            pag.capa_ajuste, function (aj) {
              api("/api/admin/ws-pagina", { id: paginaId, capa_ajuste: aj }).then(redesenhar);
            });
        };
        trocar.appendChild(bMol);
      }
      if (pag.capa_midia_id) {
        var limpar = el('<button type="button" class="ws-capa-lim" title="Tirar a imagem">×</button>');
        limpar.onclick = function () {
          api("/api/admin/ws-pagina", { id: paginaId, capa_midia_id: "" }).then(redesenhar);
        };
        trocar.appendChild(limpar);
      }
      capa.appendChild(trocar);
      col.appendChild(capa);

      /* título e visibilidade */
      var cab = el('<div class="ws-cab"></div>');
      var ti = document.createElement("input");
      ti.type = "text"; ti.className = "ws-titulo-pag"; ti.value = pag.titulo;
      ti.oninput = function () {
        clearTimeout(ti._t);
        ti._t = setTimeout(function () {
          api("/api/admin/ws-pagina", { id: paginaId, titulo: ti.value }).then(function () { pisca("Salvo"); });
        }, 800);
      };
      cab.appendChild(ti);

      /* ficha da página: status, prioridade, quem faz, setor e prazo */
      var ficha = el('<div class="ficha"></div>');
      function prop(rot, icone, campo, opcoes, tipo) {
        var linha = el('<div class="ficha-l"><span class="ficha-r">' + icone + ' ' +
          rot + '</span></div>');
        var ctrl;
        if (tipo === "data") {
          ctrl = document.createElement("input");
          ctrl.type = "date"; ctrl.value = pag[campo] || "";
        } else {
          ctrl = document.createElement("select");
          ctrl.appendChild(el('<option value="">Vazio</option>'));
          (opcoes || []).forEach(function (o) {
            var op = document.createElement("option");
            op.value = o; op.textContent = o;
            if ((pag[campo] || "") === o) op.selected = true;
            ctrl.appendChild(op);
          });
          if (pag[campo] && (opcoes || []).indexOf(pag[campo]) < 0) {
            var ex = document.createElement("option");
            ex.value = pag[campo]; ex.textContent = pag[campo]; ex.selected = true;
            ctrl.appendChild(ex);
          }
        }
        ctrl.className = "ficha-c" + (campo === "status" ? " st-" + cor(pag.status) : "");
        var salva = function () {
          var corpo = { id: paginaId };
          corpo[campo] = ctrl.value;
          api("/api/admin/ws-pagina", corpo).then(function () {
            pisca("Salvo");
            if (campo === "status") ctrl.className = "ficha-c st-" + cor(ctrl.value);
          });
          pag[campo] = ctrl.value;
        };
        ctrl.onchange = salva;
        linha.appendChild(ctrl);
        ficha.appendChild(linha);
      }
      function cor(st) {
        return ({ "A fazer": "muted", "Em andamento": "ouro", "Em revisão": "ameixa",
                  "Aguardando cliente": "terracota", "Concluído": "ok",
                  "Pausado": "muted" })[st] || "muted";
      }
      var nomesEquipe = (dados.equipe_cliente || []).map(function (p) { return p.nome; });
      prop("Status", "◍", "status", dados.status);
      prop("Prioridade", "◆", "prioridade", dados.prioridades);
      prop("Responsável", "◐", "responsavel",
           nomesEquipe.concat(["Equipe B3 Sales"]));
      prop("Setor", "▤", "setor", dados.setores);
      prop("Prazo", "▣", "prazo", null, "data");
      cab.appendChild(ficha);

      var vis = el('<label class="ws-vis"><input type="checkbox"' +
        (pag.visivel_cliente ? " checked" : "") + '> <span>' +
        (daCasa ? "Liberar esta página da metodologia para os clientes"
                : "O cliente pode ver esta página") + '</span></label>');
      vis.querySelector("input").onchange = function (e) {
        api("/api/admin/ws-pagina", { id: paginaId, visivel_cliente: e.target.checked ? 1 : 0 })
          .then(function () {
            pisca(e.target.checked
              ? (daCasa ? "Liberada no portal dos clientes" : "Visível ao cliente")
              : "Só interno");
          });
      };
      cab.appendChild(vis);
      col.appendChild(cab);

      /* blocos */
      var lista = el('<div class="ws-blocos"></div>');
      pag._equipe = dados.equipe_cliente || [];
      pag.blocos.forEach(function (b) { lista.appendChild(desenharBloco(b, pag, redesenhar)); });
      if (!pag.blocos.length) {
        lista.appendChild(el('<p class="small muted" style="padding:8px 0">Página em branco. ' +
          'Escolha abaixo o que quer acrescentar.</p>'));
      }
      col.appendChild(lista);

      col.appendChild(el('<div class="eyebrow" style="margin:22px 0 10px">Acrescentar</div>'));
      col.appendChild(menuBlocos(dados.tipos, function (tipo) {
        api("/api/admin/ws-bloco-novo", { pagina_id: paginaId, tipo: tipo }).then(redesenhar);
      }));

      var bex = el('<button class="btn btn-linha btn-sm" style="margin-top:26px">Excluir esta página</button>');
      bex.onclick = function () {
        if (!confirm('Excluir a página "' + pag.titulo + '" e tudo que está nela?')) return;
        api("/api/admin/ws-pagina-excluir", { id: paginaId }).then(function () {
          toast("Página excluída");
          daCasa ? abrirMetodologia() : abrirMateriais(cid);
        });
      };
      col.appendChild(bex);
    });
    return wrap;
  }

  function abrirMetodologia(paginaId) {
    api("/api/admin/metodologia").then(function (d) {
      if (d.erro) return toast(d.erro);
      S.rota = "metodologia"; S.cid = null;
      var pid = paginaId || (d.paginas[0] && d.paginas[0].id) || null;
      shell(telaMateriais(null, d, pid));
    });
  }

  function modalTrazer(cid) {
    api("/api/admin/metodologia").then(function (d) {
      var corpo = el('<div></div>');
      if (!d.paginas.length) {
        corpo.appendChild(el('<p class="small muted">A sua metodologia ainda está vazia. ' +
          'Monte ela em <strong>Metodologia</strong>, na barra de cima, e depois traga ' +
          'as páginas para os clientes.</p>'));
        modal("Trazer da metodologia", "Base da casa", corpo);
        return;
      }
      corpo.appendChild(el('<p class="small muted" style="margin:0 0 14px;line-height:1.7">' +
        'A página vem como cópia. Você adapta para esta empresa sem mexer na ' +
        'metodologia original.</p>'));
      var escolhidas = [];
      d.paginas.forEach(function (pg) {
        var it = el('<div class="pessoa esc" style="cursor:pointer">' +
          '<span class="esc-n"></span>' +
          '<span class="ws-pag-capa" style="background:' +
          (CAPA_CSS[pg.capa] || "var(--creme-3)") + '"></span>' +
          '<div class="pessoa-d" style="margin-left:4px"><strong>' + esc(pg.titulo) + '</strong>' +
          '<div class="small muted">' + pg.blocos +
          (pg.blocos === 1 ? " bloco" : " blocos") + '</div></div></div>');
        it.onclick = function () {
          var i = escolhidas.indexOf(pg.id);
          if (i >= 0) escolhidas.splice(i, 1); else escolhidas.push(pg.id);
          corpo.querySelectorAll(".esc").forEach(function (x, idx) {
            var pos = escolhidas.indexOf(d.paginas[idx].id);
            x.classList.toggle("on", pos >= 0);
            x.querySelector(".esc-n").textContent = pos >= 0 ? (pos + 1) : "";
          });
          bLevar.textContent = escolhidas.length
            ? "Levar " + escolhidas.length + (escolhidas.length === 1 ? " página" : " páginas")
            : "Escolha ao menos uma";
          bLevar.disabled = !escolhidas.length;
        };
        corpo.appendChild(it);
      });
      corpo.appendChild(el('<p class="small muted" style="margin:14px 0 0">A ordem do ' +
        'número é a ordem em que elas vão entrar no cliente.</p>'));
      var bLevar = el('<button class="btn btn-ouro">Escolha ao menos uma</button>');
      bLevar.disabled = true;
      bLevar.onclick = function () {
        api("/api/admin/ws-copiar", { cliente_id: cid, paginas: escolhidas })
          .then(function (r) {
            if (r.erro) return toast(r.erro);
            var m = document.querySelector(".modal-fundo"); if (m) m.remove();
            toast(r.criadas + (r.criadas === 1 ? " página trazida" : " páginas trazidas"));
            abrirMateriais(cid, r.id);
          });
      };
      modal("Trazer da metodologia", "Base da casa", corpo, [bLevar]);
    });
  }

  function abrirMateriais(cid, paginaId) {
    api("/api/admin/ws/" + cid).then(function (d) {
      if (d.erro) return toast(d.erro);
      S.rota = "materiais"; S.cid = cid;
      var pid = paginaId || (d.paginas[0] && d.paginas[0].id) || null;
      shell(telaMateriais(cid, d, pid));
    });
  }


