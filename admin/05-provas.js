  /* ------------------------------------------------------ prova social */
  var PROVA_CAT = null, PROVA_ORDEM = "recente", PROVA_CLI = "";

  function telaProvas(d) {
    var wrap = document.createElement("div");
    var mapa = {};
    d.categorias.forEach(function (c) { mapa[c.id] = c; });

    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Arsenal comercial</div>' +
      '<h1 class="serif">Prova <em class="grifo">social</em></h1>' +
      '<p class="muted small" style="margin-top:6px">O que você mostra quando precisa ' +
      'convencer. Número primeiro, transformação depois, processo por último.</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"></div></div>'));
    var bNova = el('<button class="btn btn-ouro btn-sm">+ Nova prova</button>');
    bNova.onclick = function () { modalProva(null, d); };
    wrap.querySelector(".painel-topo > div:last-child").appendChild(bNova);

    /* quem já autorizou virar caso, vindo do Dia 180 */
    if ((d.autorizados || []).length) {
      var aut = el('<div class="pr-aut"><span class="pr-aut-i">★</span>' +
        '<div><strong>' + d.autorizados.length +
        (d.autorizados.length === 1 ? ' cliente já autorizou' : ' clientes já autorizaram') +
        ' virar estudo de caso</strong>' +
        '<div class="small muted">' + d.autorizados.map(function (a) {
          return esc(a.empresa) + (a.como.indexOf("anonimiz") > 0 ? " (anonimizado)" : "");
        }).join("  ·  ") + '</div></div></div>');
      wrap.appendChild(aut);
    }

    /* as pastas */
    var pastas = el('<div class="pr-pastas"></div>');
    var todas = el('<div class="pr-pasta' + (!PROVA_CAT ? " on" : "") + '" ' +
      'style="--c:var(--ameixa-700)"><span class="pr-i">◆</span>' +
      '<strong>Tudo</strong><b>' + d.total + '</b></div>');
    todas.onclick = function () { PROVA_CAT = null; abrirProvas(); };
    pastas.appendChild(todas);
    d.categorias.forEach(function (c) {
      var n = d.contagem[c.id] || 0;
      var it = el('<div class="pr-pasta' + (PROVA_CAT === c.id ? " on" : "") + '" ' +
        'style="--c:' + c.cor + '"><span class="pr-i">' + c.icone + '</span>' +
        '<strong>' + esc(c.nome) + '</strong><b>' + n + '</b>' +
        '<span class="pr-sub">' + esc(c.sub) + '</span></div>');
      it.onclick = function () { PROVA_CAT = c.id; abrirProvas(); };
      pastas.appendChild(it);
    });
    wrap.appendChild(pastas);

    /* filtros */
    var filtros = el('<div class="pr-filtros"></div>');
    var selC = document.createElement("select");
    selC.appendChild(el('<option value="">Todos os clientes</option>'));
    (d.clientes || []).forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id; o.textContent = c.empresa;
      if (PROVA_CLI === c.id) o.selected = true;
      selC.appendChild(o);
    });
    selC.onchange = function () { PROVA_CLI = selC.value; abrirProvas(); };
    var selO = document.createElement("select");
    [["recente", "Mais recentes primeiro"], ["antiga", "Mais antigas primeiro"]]
      .forEach(function (x) {
        var o = document.createElement("option");
        o.value = x[0]; o.textContent = x[1];
        if (PROVA_ORDEM === x[0]) o.selected = true;
        selO.appendChild(o);
      });
    selO.onchange = function () { PROVA_ORDEM = selO.value; abrirProvas(); };
    filtros.appendChild(selC); filtros.appendChild(selO);
    wrap.appendChild(filtros);

    if (!d.provas.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:52px 24px">' +
        '<h2 class="serif" style="font-size:25px;color:var(--ameixa-900)">' +
        'Nada guardado nesta pasta ainda</h2>' +
        '<p class="muted small" style="margin-top:8px;max-width:520px;margin-left:auto;' +
        'margin-right:auto">Toda vez que um cliente mandar um áudio elogiando, um print ' +
        'do faturamento ou falar um número bom numa reunião, guarde aqui. ' +
        'Na hora de vender, você não vai lembrar de procurar.</p></div>'));
      return wrap;
    }

    var grade = el('<div class="pr-grade"></div>');
    d.provas.forEach(function (pv) {
      var cat = mapa[pv.categoria] || { cor: "var(--muted)", nome: "Sem pasta", icone: "◆" };
      var capa = pv.capa_midia_id
        ? "#241030 url(/api/midia/" + esc(pv.capa_midia_id) + ") center/cover"
        : (pv.formato === "imagem" && pv.midia_id
            ? "#241030 url(/api/midia/" + esc(pv.midia_id) + ") center/cover"
            : "linear-gradient(140deg," + cat.cor + ",var(--ameixa-900))");
      var card = el('<div class="pr-card">' +
        '<div class="pr-capa" style="background:' + capa + '">' +
        '<span class="pr-tipo">' + ({ video: "▶", audio: "♪", imagem: "▣",
          texto: "❝", arquivo: "⇩" })[pv.formato || "texto"] + '</span>' +
        (pv.destaque ? '<span class="pr-estrela">★</span>' : '') +
        '</div>' +
        '<div class="pr-corpo">' +
        '<span class="pr-cat" style="color:' + cat.cor + '">' + esc(cat.nome) + '</span>' +
        '<strong>' + esc(pv.titulo) + '</strong>' +
        (pv.metrica ? '<div class="pr-metrica">' + esc(pv.metrica) + '</div>' : '') +
        (pv.antes || pv.depois
          ? '<div class="pr-ad"><span>' + esc(pv.antes || "—") + '</span>' +
            '<i>→</i><span>' + esc(pv.depois || "—") + '</span></div>' : '') +
        (pv.frase ? '<p class="pr-frase">' + esc(pv.frase) + '</p>' : '') +
        (pv.descricao ? '<p class="small muted">' + esc(pv.descricao) + '</p>' : '') +
        '<div class="pr-pe"><span>' + esc(pv.cliente_nome || "Sem cliente") + '</span>' +
        '<span>' + (pv.data ? dataBr(pv.data) : "") + '</span></div>' +
        '</div></div>');
      card.onclick = function () { modalProva(pv, d); };
      grade.appendChild(card);
    });
    wrap.appendChild(grade);
    return wrap;
  }

  function modalProva(pv, d) {
    pv = pv || {};
    function selHtml(id, rot, opts, val, vazio) {
      var h = '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
        'style="color:var(--ameixa-700);margin-bottom:5px;display:block">' + rot + '</label>' +
        '<select id="' + id + '"><option value="">' + (vazio || "Escolher") + '</option>';
      opts.forEach(function (o) {
        h += '<option value="' + esc(o.id) + '"' + (val === o.id ? " selected" : "") +
          '>' + esc(o.nome) + '</option>';
      });
      return h + '</select></div>';
    }
    var corpo = el('<div>' +
      campoTexto("pv_tit", "Nome desta prova", "Ex: Clínica dobrou o faturamento", pv.titulo) +
      selHtml("pv_cat", "Pasta", d.categorias, pv.categoria) +
      selHtml("pv_cli", "De qual cliente", (d.clientes || []).map(function (c) {
        return { id: c.id, nome: c.empresa }; }), pv.cliente_id, "Nenhum cliente") +
      selHtml("pv_fmt", "Formato", d.formatos, pv.formato || "texto") +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      campoTexto("pv_antes", "Antes", "Ex: R$ 40 mil", pv.antes) +
      campoTexto("pv_depois", "Depois", "Ex: R$ 118 mil", pv.depois) + '</div>' +
      campoTexto("pv_met", "O número em uma linha", "Ex: 3x o faturamento em 6 meses", pv.metrica) +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">' +
      'A frase do cliente</label><textarea id="pv_frase" style="min-height:70px" ' +
      'placeholder="Do jeito que ele falou. Não edite.">' + esc(pv.frase || "") +
      '</textarea></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      campoTexto("pv_autor", "Quem falou", "Nome", pv.autor) +
      campoTexto("pv_cargo", "Cargo", "Ex: Sócia", pv.autor_cargo) + '</div>' +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Quando foi</label>' +
      '<input type="date" id="pv_data" value="' + esc(pv.data || "") + '"></div>' +
      campoTexto("pv_url", "Link, se houver", "Panda, YouTube, Drive", pv.url) +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Observação</label>' +
      '<textarea id="pv_desc" style="min-height:60px" placeholder="Onde usar, para quem ' +
      'serve">' + esc(pv.descricao || "") + '</textarea></div>' +
      '<div id="pv_arq" style="margin-bottom:14px"></div>' +
      '<div id="pv_capa" style="margin-bottom:14px"></div>' +
      '<label class="ws-vis"><input type="checkbox" id="pv_dest"' +
      (pv.destaque ? " checked" : "") + '> <span>Marcar como destaque</span></label>' +
      '</div>');

    var midId = pv.midia_id || "", capaId = pv.capa_midia_id || "";
    var aArq = corpo.querySelector("#pv_arq"), aCapa = corpo.querySelector("#pv_capa");
    function pintarArq() {
      aArq.innerHTML = "";
      aArq.appendChild(el('<label class="small" style="color:var(--ameixa-700);' +
        'margin-bottom:6px;display:block">Arquivo: vídeo, áudio, print ou documento</label>'));
      if (midId) {
        aArq.appendChild(el('<a class="ws-arq" style="margin-bottom:8px" href="/api/midia/' +
          esc(midId) + '" target="_blank"><span class="ws-arq-i">⇩</span>' +
          '<span>Ver o arquivo</span></a>'));
      }
      aArq.appendChild(botaoEnviar(midId ? "↑ Trocar" : "↑ Enviar arquivo", null, "prova",
        function (r) { midId = r.id; pintarArq(); }));
    }
    function pintarCapa() {
      aCapa.innerHTML = "";
      aCapa.appendChild(el('<label class="small" style="color:var(--ameixa-700);' +
        'margin-bottom:6px;display:block">Capa do cartão</label>'));
      if (capaId) {
        aCapa.appendChild(el('<img src="/api/midia/' + esc(capaId) + '" ' +
          'style="max-height:72px;border-radius:var(--r-sm);margin-bottom:8px;display:block">'));
      }
      aCapa.appendChild(botaoEnviar(capaId ? "↑ Trocar a capa" : "↑ Enviar uma capa",
        null, "prova", function (r) { capaId = r.id; pintarCapa(); }, "image/*", "capa_prova"));
    }
    pintarArq(); pintarCapa();

    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var acoes = [bs];
    if (pv.id) {
      var bx = el('<button class="btn btn-fantasma">Excluir</button>');
      bx.onclick = function () {
        if (!confirm('Excluir "' + pv.titulo + '"?')) return;
        api("/api/admin/prova-excluir", { id: pv.id }).then(function () {
          document.querySelector(".modal-fundo").remove();
          toast("Prova excluída"); abrirProvas();
        });
      };
      acoes.unshift(bx);
    }
    var f = modal(pv.id ? "Editar prova" : "Nova prova social", "Arsenal comercial",
                  corpo, acoes);
    bs.onclick = function () {
      var t = f.querySelector("#pv_tit").value.trim();
      if (!t) return toast("Dê um nome a esta prova");
      api("/api/admin/prova-salvar", { id: pv.id, titulo: t,
        categoria: f.querySelector("#pv_cat").value,
        cliente_id: f.querySelector("#pv_cli").value,
        formato: f.querySelector("#pv_fmt").value,
        antes: f.querySelector("#pv_antes").value,
        depois: f.querySelector("#pv_depois").value,
        metrica: f.querySelector("#pv_met").value,
        frase: f.querySelector("#pv_frase").value,
        autor: f.querySelector("#pv_autor").value,
        autor_cargo: f.querySelector("#pv_cargo").value,
        data: f.querySelector("#pv_data").value,
        url: f.querySelector("#pv_url").value,
        descricao: f.querySelector("#pv_desc").value,
        midia_id: midId, capa_midia_id: capaId,
        destaque: f.querySelector("#pv_dest").checked })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Prova guardada"); abrirProvas();
        });
    };
  }

  function abrirProvas() {
    var q = [];
    if (PROVA_CAT) q.push("categoria=" + encodeURIComponent(PROVA_CAT));
    if (PROVA_CLI) q.push("cliente=" + encodeURIComponent(PROVA_CLI));
    q.push("ordem=" + PROVA_ORDEM);
    api("/api/admin/provas?" + q.join("&")).then(function (d) {
      if (d.erro) return toast(d.erro);
      S.rota = "provas";
      shell(telaProvas(d));
    });
  }

