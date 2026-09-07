  /* ---------------------------------------------------------- imagens
     Onde cada imagem entra, em que proporção e com que medida.
     Serve para a B3 Sales criar as artes já no tamanho certo. */
  var MEDIDAS = {
    logo_casa:    { nome: "Logo do Grupo B3 Sales", w: 600, h: 200, prop: "3:1",
                    onde: "Configurações", nota: "PNG com fundo transparente" },
    logo_cliente: { nome: "Foto ou logo do cliente", w: 400, h: 400, prop: "1:1",
                    onde: "Ficha do cliente", nota: "Quadrada, como foto de perfil" },
    capa_cliente: { nome: "Capa do cliente", w: 1600, h: 400, prop: "4:1",
                    onde: "Topo da ficha do cliente", nota: "Faixa larga e baixa" },
    capa_pagina:  { nome: "Capa da página", w: 1600, h: 400, prop: "4:1",
                    onde: "Materiais e Metodologia", nota: "Faixa larga e baixa" },
    capa_curso:   { nome: "Capa do curso", w: 600, h: 800, prop: "3:4",
                    onde: "Cartão na lista de cursos", nota: "Em pé, como capa de livro" },
    banner_curso: { nome: "Banner do curso", w: 1600, h: 500, prop: "16:5",
                    onde: "Topo do curso, admin e cliente", nota: "Faixa larga" },
    capa_aula:    { nome: "Capa da aula", w: 640, h: 360, prop: "16:9",
                    onde: "Cartão de cada aula", nota: "Formato de vídeo" },
    capa_prova:   { nome: "Capa da prova social", w: 800, h: 450, prop: "16:9",
                    onde: "Cartão em Prova social", nota: "Formato de vídeo" }
  };

  function dicaMedida(chave) {
    var m = MEDIDAS[chave];
    if (!m) return "";
    return '<p class="med-dica"><span class="med-p">' + m.prop + '</span>' +
      '<strong>' + m.w + ' × ' + m.h + ' px</strong>' +
      '<span class="small muted">' + esc(m.nota) + '</span></p>';
  }

  /* Checklist de medidas: todo lugar do sistema que recebe imagem. */
  function listaMedidasHtml() {
    var h = "";
    Object.keys(MEDIDAS).forEach(function (k) {
      var m = MEDIDAS[k];
      h += '<div class="med-l"><div><strong>' + esc(m.nome) + '</strong>' +
        '<span class="small muted">' + esc(m.onde) + '</span></div>' +
        '<div class="med-l-num"><b>' + m.w + ' × ' + m.h + '</b>' +
        '<span class="med-p">' + m.prop + '</span></div></div>';
    });
    return h;
  }

  /* Enquadramento de qualquer imagem: zoom e posição, com prévia no
     formato real do lugar onde ela vai aparecer. */
  function modalMoldura(titulo, chave, midiaId, ajusteAtual, aoSalvar) {
    var a = {};
    try { a = JSON.parse(ajusteAtual || "{}") || {}; } catch (e) { a = {}; }
    var z = a.zoom || 100, x = a.x == null ? 50 : a.x, y = a.y == null ? 50 : a.y;
    var m = MEDIDAS[chave] || { w: 800, h: 450, prop: "16:9", nome: titulo, nota: "" };

    var corpo = el('<div>' +
      '<p class="small muted" style="margin:0 0 14px;line-height:1.7">Ajuste até ficar ' +
      'do jeito que você quer. A prévia mostra exatamente o formato do lugar onde ' +
      'esta imagem aparece.</p>' +
      dicaMedida(chave) +
      '<div class="mol-previa"><div class="mol-img"></div></div>' +
      '<div class="enq-ctrl"></div></div>');

    var prev = corpo.querySelector(".mol-previa");
    prev.style.aspectRatio = m.w + " / " + m.h;
    var img = corpo.querySelector(".mol-img");
    function pintar() {
      img.style.cssText = "background-image:url(/api/midia/" + esc(midiaId) + ");" +
        "background-size:" + z + "% auto;background-position:" + x + "% " + y + "%;" +
        "background-repeat:no-repeat;background-color:#fff";
    }
    pintar();

    var ctrl = corpo.querySelector(".enq-ctrl");
    function faixa(rot, valor, min, max, aplicar) {
      var l = el('<div class="enq-linha"><span class="small">' + rot + '</span></div>');
      var i = document.createElement("input");
      i.type = "range"; i.min = min; i.max = max; i.value = valor;
      i.oninput = function () { aplicar(parseInt(i.value, 10)); pintar(); };
      l.appendChild(i); ctrl.appendChild(l);
    }
    faixa("Zoom", z, 60, 300, function (v) { z = v; });
    faixa("Horizontal", x, 0, 100, function (v) { x = v; });
    faixa("Vertical", y, 0, 100, function (v) { y = v; });
    var bC = el('<button class="btn btn-fantasma btn-sm">Centralizar</button>');
    bC.onclick = function () {
      z = 100; x = 50; y = 50; pintar();
      ctrl.querySelectorAll("input").forEach(function (i, k) { i.value = [100, 50, 50][k]; });
    };
    ctrl.appendChild(bC);

    var bs = el('<button class="btn btn-ouro">Salvar enquadramento</button>');
    var f = modal("Enquadrar a imagem", titulo, corpo, [bs]);
    bs.onclick = function () {
      aoSalvar(JSON.stringify({ zoom: z, x: x, y: y }));
      f.remove();
    };
  }

  /* o estilo de fundo de qualquer imagem com ajuste */
  function fundoImagem(midiaId, ajuste, alternativa) {
    if (!midiaId) return alternativa || "background:var(--creme-3)";
    var a = {};
    try { a = JSON.parse(ajuste || "{}") || {}; } catch (e) { a = {}; }
    var z = a.zoom || 100, x = a.x == null ? 50 : a.x, y = a.y == null ? 50 : a.y;
    return "background-image:url(/api/midia/" + esc(midiaId) + ");" +
      "background-size:" + z + "% auto;background-position:" + x + "% " + y + "%;" +
      "background-repeat:no-repeat;background-color:#241030";
  }

  /* botão de enviar já com a medida do lugar escrita embaixo */
  function envioComMedida(rotulo, chave, cid, categoria, aoTerminar) {
    var cx = el('<div class="env-med"></div>');
    cx.appendChild(botaoEnviar(rotulo, cid, categoria, aoTerminar, "image/*"));
    cx.appendChild(el(dicaMedida(chave)));
    return cx;
  }

  /* ------------------------------------------------- envio de arquivos */
  var TIPOS_ACEITOS = "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx," +
    ".ppt,.pptx,.csv,.txt,.zip";

  function tamanhoBonito(b) {
    if (!b) return "";
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  var PEDACO = 4 * 1024 * 1024;   /* mesmo tamanho que o servidor espera */

  function lerPedaco(blob) {
    return new Promise(function (ok, falha) {
      var fr = new FileReader();
      fr.onerror = function () { falha(new Error("Não consegui ler o arquivo.")); };
      fr.onload = function () { ok(fr.result); };
      fr.readAsDataURL(blob);
    });
  }

  /* Arquivo grande vai em pedaços: cada um sobe sozinho e o servidor
     encaixa no disco. Assim uma aula de duas horas passa sem derrubar nada. */
  function enviarArquivo(file, cid, categoria, aoProgredir) {
    var envio = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var total = Math.max(1, Math.ceil(file.size / PEDACO));
    var i = 0;

    function proximo() {
      if (i >= total) return Promise.reject(new Error("Envio incompleto."));
      var ini = i * PEDACO;
      return lerPedaco(file.slice(ini, ini + PEDACO)).then(function (dados) {
        return api("/api/admin/midia-pedaco", {
          envio_id: envio, indice: i, total: total, dados: dados,
          nome: file.name, tipo: file.type, cliente_id: cid || null,
          categoria: categoria || "material"
        });
      }).then(function (r) {
        if (r.erro) throw new Error(r.erro);
        i++;
        if (aoProgredir) aoProgredir(Math.round(i / total * 100));
        return r.pronto ? r : proximo();
      });
    }
    return proximo();
  }

  /* botao de enviar que vira barra de progresso */
  function botaoEnviar(rotulo, cid, categoria, aoTerminar, aceita, medida) {
    var cx = el('<div class="env"></div>');
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = aceita || TIPOS_ACEITOS; inp.style.display = "none";
    var b = el('<button type="button" class="btn btn-ouro btn-sm">' + rotulo + '</button>');
    var st = el('<span class="env-st"></span>');
    b.onclick = function () { inp.click(); };
    var barra = el('<div class="env-barra"><i></i></div>');
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      b.disabled = true;
      var grande = f.size > PEDACO;
      st.textContent = "Enviando " + f.name + " (" + tamanhoBonito(f.size) + ")…";
      st.className = "env-st on";
      if (grande) { barra.classList.add("on"); barra.firstChild.style.width = "0%"; }
      enviarArquivo(f, cid, categoria, function (pct) {
        barra.firstChild.style.width = pct + "%";
        st.textContent = "Enviando " + f.name + "  ·  " + pct + "%";
      })
        .then(function (r) {
          st.textContent = "Enviado"; b.disabled = false; inp.value = "";
          barra.classList.remove("on");
          setTimeout(function () { st.className = "env-st"; }, 1600);
          aoTerminar(r);
        })
        .catch(function (e) {
          st.textContent = e.message; st.className = "env-st erro";
          b.disabled = false; barra.classList.remove("on");
        });
    };
    cx.appendChild(b); cx.appendChild(st); cx.appendChild(inp); cx.appendChild(barra);
    if (medida && MEDIDAS[medida]) cx.appendChild(el(dicaMedida(medida)));
    return cx;
  }

