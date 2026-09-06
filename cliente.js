/* Diagnostico Comercial ECO - experiencia do cliente */
(function () {
  "use strict";

  var TOKEN = location.pathname.split("/d/")[1] || "";
  var S = { dados: null, blocos: [], resp: {}, tela: "carregando", bi: 0, fila: {}, timer: null };

  var palco = document.getElementById("palco");
  var toastEl = document.getElementById("toast");
  var toastTxt = document.getElementById("toastTxt");

  /* ------------------------------------------------------------- util */
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
  var toastT;
  function toast(msg) {
    toastTxt.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 2100);
  }
  function api(url, body) {
    return fetch(url, body ? {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    } : {}).then(function (r) { return r.json(); });
  }
  function tamanho(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  /* --------------------------------------------------------- respostas */
  function get(qid) {
    if (!S.resp[qid]) S.resp[qid] = {};
    return S.resp[qid];
  }
  function preenchida(a) {
    if (!a) return false;
    if (a.na) return true;
    var v = a.v;
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).some(function (k) {
      return v[k] !== "" && v[k] !== null && v[k] !== undefined;
    });
    return true;
  }
  function marcar(qid) {
    S.fila[qid] = S.resp[qid];
    clearTimeout(S.timer);
    S.timer = setTimeout(enviarFila, 700);
    atualizarProgresso();
  }
  function enviarFila() {
    var itens = Object.keys(S.fila).map(function (qid) { return { qid: qid, valor: S.fila[qid] }; });
    if (!itens.length) return Promise.resolve();
    S.fila = {};
    var nome = (S.resp.emp_responsavel || {}).v || "";
    return api("/api/d/" + TOKEN + "/salvar", { itens: itens, preenchido_por: nome })
      .then(function (r) {
        if (r.erro) { toast("Não foi possível salvar: " + r.erro); return; }
        toast("Respostas salvas");
        if (r.progresso !== undefined) pintarProgresso(r.progresso);
      })
      .catch(function () { toast("Sem conexão. Vamos tentar de novo."); });
  }
  window.addEventListener("beforeunload", function () {
    if (Object.keys(S.fila).length) {
      var itens = Object.keys(S.fila).map(function (q) { return { qid: q, valor: S.fila[q] }; });
      navigator.sendBeacon("/api/d/" + TOKEN + "/salvar",
        new Blob([JSON.stringify({ itens: itens })], { type: "application/json" }));
    }
  });

  /* -------------------------------------------------------- progresso */
  function totalPerguntas() {
    var n = 0;
    S.blocos.forEach(function (b) {
      b.questions.forEach(function (q) { if (q.type !== "files") n++; });
    });
    return n;
  }
  function feitas() {
    var n = 0;
    S.blocos.forEach(function (b) {
      b.questions.forEach(function (q) {
        if (q.type !== "files" && preenchida(S.resp[q.id])) n++;
      });
    });
    return n;
  }
  function atualizarProgresso() { pintarProgresso(Math.round(feitas() / totalPerguntas() * 100)); }
  function pintarProgresso(p) {
    document.getElementById("progBarra").style.width = p + "%";
    document.getElementById("progPct").textContent = p + "%";
  }
  function blocoCompleto(b) {
    return b.questions.every(function (q) {
      return !q.required || preenchida(S.resp[q.id]);
    });
  }

  /* --------------------------------------------------------- condicao */
  function visivel(q) {
    var c = q.show_if;
    if (!c) return true;
    var a = S.resp[c.q];
    var v = a ? a.v : null;
    var lista = Array.isArray(v) ? v : (v === null || v === undefined || v === "" ? [] : [v]);
    if (c.in) return lista.some(function (x) { return c.in.indexOf(x) >= 0; });
    if (c.not_in) return lista.length > 0 && !lista.every(function (x) { return c.not_in.indexOf(x) >= 0; });
    return true;
  }

  /* ------------------------------------------------------- renderizacao */
  function render() {
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    if (S.tela === "carregando") return palco.innerHTML = '<p class="center muted">Carregando o seu diagnóstico…</p>';
    if (S.tela === "bloqueado") return telaBloqueado();
    if (S.tela === "boas") return telaBoas();
    if (S.tela === "fim") return telaFim();
    if (S.tela === "revisao") return telaRevisao();
    telaBloco();
  }

  function telaBloqueado() {
    document.getElementById("topoProg").classList.add("hidden");
    palco.innerHTML = "";
    palco.appendChild(el(
      '<div class="card card-pad center" style="max-width:560px;margin:60px auto">' +
      '<div class="eyebrow">Diagnóstico Comercial ECO</div>' +
      '<h1 class="serif" style="font-size:36px;margin:12px 0 14px;color:var(--ameixa-900)">Link indisponível</h1>' +
      '<p class="muted">' + esc(S.erro || "Este link não está mais ativo.") + '</p>' +
      '<hr class="filete"><p class="small muted">Entre em contato com a equipe do Grupo B3 Sales para receber um novo link.</p></div>'));
  }

  function telaBoas() {
    document.getElementById("topoProg").classList.add("hidden");
    var d = S.dados, cont = d.progresso > 0;
    palco.innerHTML = "";
    palco.appendChild(el(
      '<div class="hero">' +
      '<div class="eyebrow">Método ECO · Estratégia · Condução · Operação</div>' +
      '<h1>Diagnóstico<br><em class="grifo">Comercial</em></h1>' +
      '<p class="sub">Olá' + (d.responsavel ? ", <strong>" + esc(d.responsavel.split(" ")[0]) + "</strong>" : "") +
      '. Este diagnóstico foi preparado exclusivamente para <strong>' + esc(d.empresa) + '</strong>. ' +
      'Ele existe para que a gente entenda o momento real da sua operação comercial — ' +
      'não para julgar, e sim para enxergar com clareza onde está a oportunidade.</p>' +
      '<div class="pilares">' +
      '<div class="pilar"><div class="letra">E</div><h3>Estratégia</h3><p>Onde estamos, onde queremos chegar e o que atacar primeiro.</p></div>' +
      '<div class="pilar"><div class="letra">C</div><h3>Condução</h3><p>Como cada oportunidade é recebida, conduzida e levada à decisão.</p></div>' +
      '<div class="pilar"><div class="letra">O</div><h3>Operação</h3><p>Processo, pessoas e rotina que transformam execução em resultado.</p></div>' +
      '</div>' +
      '<div class="card card-pad" style="text-align:left;max-width:660px;margin:0 auto">' +
      '<h3 class="serif" style="font-size:23px;color:var(--ameixa-900);margin-bottom:12px">Antes de começar</h3>' +
      '<ul style="margin:0;padding-left:20px;color:var(--texto-2);font-size:14px;line-height:1.85">' +
      '<li><strong>Suas respostas salvam sozinhas.</strong> Pode fechar e voltar depois pelo mesmo link.</li>' +
      '<li><strong>Prefira o número exato.</strong> Se não acompanhar algum dado, existe a opção de dizer isso — e essa informação também conta.</li>' +
      '<li><strong>Responda com sinceridade.</strong> O diagnóstico só funciona com o retrato real da empresa.</li>' +
      '<li>Reserve cerca de <strong>25 a 35 minutos</strong>. São ' + totalPerguntas() + ' perguntas em ' + S.blocos.length + ' blocos.</li>' +
      '</ul></div>' +
      '<div class="fatos">' +
      '<div class="fato"><b>' + S.blocos.length + '</b><span>Blocos</span></div>' +
      '<div class="fato"><b>' + totalPerguntas() + '</b><span>Perguntas</span></div>' +
      '<div class="fato"><b>' + esc(d.ciclo) + '</b><span>Ciclo atual</span></div>' +
      '</div>' +
      '<div style="margin-top:34px"><button class="btn btn-ouro" id="btnComecar" style="padding:15px 40px;font-size:15px">' +
      (cont ? "Continuar de onde parei →" : "Começar o diagnóstico →") + '</button>' +
      (cont ? '<p class="small muted" style="margin-top:12px">Você já preencheu ' + d.progresso + '% deste diagnóstico.</p>' : '') +
      '</div></div>'));
    document.getElementById("btnComecar").onclick = function () {
      S.bi = 0;
      if (cont) {
        for (var i = 0; i < S.blocos.length; i++) { if (!blocoCompleto(S.blocos[i])) { S.bi = i; break; } }
      }
      S.tela = "bloco"; render();
    };
  }

  function telaBloco() {
    document.getElementById("topoProg").classList.remove("hidden");
    var b = S.blocos[S.bi];
    document.getElementById("progRot").textContent = "Bloco " + (S.bi + 1) + " de " + S.blocos.length;
    palco.innerHTML = "";

    var trilha = el('<div class="trilha"></div>');
    S.blocos.forEach(function (bl, i) {
      var bt = el('<button class="' + (i === S.bi ? "at " : "") + (blocoCompleto(bl) ? "ok" : "") + '">' +
        (i + 1) + ". " + esc(bl.title) + '</button>');
      bt.onclick = function () { enviarFila(); S.bi = i; render(); };
      trilha.appendChild(bt);
    });
    palco.appendChild(trilha);

    palco.appendChild(el('<div class="bloco-cab"><div class="eyebrow">' + esc(b.eyebrow) +
      '</div><h2>' + esc(b.title) + '</h2><p>' + esc(b.intro) + '</p></div>'));

    var card = el('<div class="card card-pad"></div>');
    var n = 0;
    b.questions.forEach(function (q) {
      if (!visivel(q)) return;
      n++;
      try {
        card.appendChild(campo(q, n));
      } catch (e) {
        console.error("Falha ao montar a pergunta " + q.id + " (" + q.type + "):", e);
        card.appendChild(el('<div class="pergunta"><div class="aviso erro">' +
          'Não foi possível exibir esta pergunta. Avise a equipe do Grupo B3 Sales.</div></div>'));
      }
    });
    palco.appendChild(card);

    var nav = el('<div class="nav"></div>');
    var esquerda = el('<div></div>');
    if (S.bi > 0) {
      var volt = el('<button class="btn btn-fantasma">← Voltar</button>');
      volt.onclick = function () { enviarFila(); S.bi--; render(); };
      esquerda.appendChild(volt);
    }
    var direita = el('<div style="display:flex;gap:10px;flex-wrap:wrap"></div>');
    var salvar = el('<button class="btn btn-linha">Salvar e sair</button>');
    salvar.onclick = function () { enviarFila().then(function () { toast("Tudo salvo. Você pode voltar por este mesmo link."); }); };
    direita.appendChild(salvar);
    var prox = el('<button class="btn btn-ouro">' +
      (S.bi === S.blocos.length - 1 ? "Revisar respostas →" : "Continuar →") + '</button>');
    prox.onclick = function () {
      enviarFila();
      if (!blocoCompleto(b)) {
        var falta = b.questions.filter(function (q) { return q.required && visivel(q) && !preenchida(S.resp[q.id]); });
        toast(falta.length + (falta.length === 1 ? " pergunta obrigatória ainda em aberto" : " perguntas obrigatórias ainda em aberto"));
        var alvo = document.getElementById("q_" + falta[0].id);
        if (alvo) { alvo.scrollIntoView({ behavior: "smooth", block: "center" }); alvo.style.background = "rgba(207,164,103,.14)"; setTimeout(function () { alvo.style.background = ""; }, 1600); }
        return;
      }
      if (S.bi === S.blocos.length - 1) { S.tela = "revisao"; }
      else { S.bi++; toast("Bloco concluído. Suas informações foram salvas com segurança."); }
      render();
    };
    direita.appendChild(prox);
    nav.appendChild(esquerda); nav.appendChild(direita);
    palco.appendChild(nav);
    atualizarProgresso();
  }

  /* ------------------------------------------------------------ campos */
  function campo(q, n) {
    var wrap = el('<div class="pergunta" id="q_' + q.id + '"></div>');
    wrap.appendChild(el('<span class="num-q">' + String(n).padStart(2, "0") + '</span>'));
    wrap.appendChild(el('<label class="rotulo">' + esc(q.label) +
      (q.required ? '<span class="obrig">obrigatória</span>' : '') + '</label>'));
    if (q.help) wrap.appendChild(el('<p class="ajuda">' + esc(q.help) + '</p>'));
    if (q.example) wrap.appendChild(el('<p class="exemplo">Exemplo: ' + esc(q.example) + '</p>'));

    var a = get(q.id);
    var corpo = document.createElement("div");
    var t = q.type;

    if (t === "text" || t === "number" || t === "currency" || t === "percent") {
      var inp = document.createElement("input");
      inp.type = (t === "text") ? "text" : "number";
      if (t !== "text") { inp.step = "any"; inp.min = "0"; }
      inp.placeholder = q.placeholder || (t === "currency" ? "0,00" : t === "text" ? "" : "0");
      inp.value = a.v == null ? "" : a.v;
      if (q.unit) { inp.style.maxWidth = "300px"; }
      inp.oninput = function () { a.v = inp.value; a.na = ""; marcar(q.id); pintarNA(wrap, a); };
      var linha = el('<div style="display:flex;align-items:center;flex-wrap:wrap"></div>');
      if (t === "currency") linha.appendChild(el('<span class="unidade" style="margin:0 8px 0 0;font-size:15px;color:var(--ameixa-700)">R$</span>'));
      linha.appendChild(inp);
      if (q.unit && t !== "currency") linha.appendChild(el('<span class="unidade">' + esc(q.unit) + '</span>'));
      corpo.appendChild(linha);

    } else if (t === "textarea") {
      var ta = document.createElement("textarea");
      ta.placeholder = q.placeholder || "Escreva com suas palavras…";
      ta.value = a.v == null ? "" : a.v;
      ta.oninput = function () { a.v = ta.value; a.na = ""; marcar(q.id); };
      corpo.appendChild(ta);

    } else if (t === "date") {
      var dt = document.createElement("input"); dt.type = "date"; dt.value = a.v || "";
      dt.style.maxWidth = "240px";
      dt.onchange = function () { a.v = dt.value; marcar(q.id); };
      corpo.appendChild(dt);

    } else if (t === "yesno") {
      corpo.appendChild(opcoes(q, a, ["Sim", "Não"], "radio", wrap));

    } else if (t === "radio" || t === "select") {
      var ops = (q.options || []).slice();
      if (q.other) ops.push("Outro");
      corpo.appendChild(opcoes(q, a, ops, "radio", wrap));

    } else if (t === "multiselect") {
      var ops2 = (q.options || []).slice();
      if (q.other) ops2.push("Outro");
      corpo.appendChild(opcoes(q, a, ops2, "check", wrap));

    } else if (t === "scale") {
      var esc10 = el('<div><div class="escala"></div><div class="escala-legenda"><span>1 · são estimativas</span><span>10 · dados conferidos</span></div></div>');
      var box = esc10.querySelector(".escala");
      for (var i = 1; i <= 10; i++) (function (i) {
        var b = el('<button type="button" class="' + (String(a.v) === String(i) ? "sel" : "") + '">' + i + '</button>');
        b.onclick = function () {
          a.v = i; marcar(q.id);
          box.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel");
        };
        box.appendChild(b);
      })(i);
      corpo.appendChild(esc10);

    } else if (t === "duration") {
      if (typeof a.v !== "object" || a.v === null) a.v = {};
      var dur = el('<div class="numgrid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"></div>');
      [["anos", "Anos completos"], ["meses", "Meses adicionais"]].forEach(function (p) {
        var it = el('<div class="numitem"><span>' + p[1] + '</span></div>');
        var i2 = document.createElement("input"); i2.type = "number"; i2.min = "0";
        i2.placeholder = "0"; i2.value = a.v[p[0]] == null ? "" : a.v[p[0]];
        i2.oninput = function () { a.v[p[0]] = i2.value; marcar(q.id); };
        it.appendChild(i2); dur.appendChild(it);
      });
      var itd = el('<div class="numitem"><span>Ou informe a data de início das atividades</span></div>');
      var id2 = document.createElement("input"); id2.type = "date"; id2.value = a.v.data || "";
      id2.onchange = function () { a.v.data = id2.value; marcar(q.id); };
      itd.appendChild(id2); dur.appendChild(itd);
      corpo.appendChild(dur);

    } else if (t === "numgroup") {
      if (typeof a.v !== "object" || a.v === null) a.v = {};
      var g = el('<div class="numgrid"></div>');
      var totEl = null;
      function recalc() {
        if (!totEl) return;
        var s = 0;
        q.fields.forEach(function (f) { s += parseFloat(a.v[f.id]) || 0; });
        totEl.textContent = s;
      }
      q.fields.forEach(function (f) {
        var it = el('<div class="numitem"><span>' + esc(f.label) + '</span></div>');
        var i3 = document.createElement("input"); i3.type = "number"; i3.min = "0"; i3.placeholder = "0";
        i3.value = a.v[f.id] == null ? "" : a.v[f.id];
        i3.oninput = function () { a.v[f.id] = i3.value; recalc(); marcar(q.id); };
        it.appendChild(i3); g.appendChild(it);
      });
      if (q.total) {
        var tt = el('<div class="numitem numtotal"><span>' + esc(q.total.label) + '</span><strong>0</strong></div>');
        totEl = tt.querySelector("strong"); g.appendChild(tt); recalc();
      }
      corpo.appendChild(g);

    } else if (t === "matrix") {
      if (typeof a.v !== "object" || a.v === null) a.v = {};
      var wrapT = el('<div class="tabela-wrap"><table class="matriz"><thead><tr>' +
        '<th>Etapa</th><th>Responsável</th><th class="col-qtd">Pessoas</th>' +
        '<th class="col-sub">Existe substituto?</th></tr></thead><tbody></tbody></table></div>');
      var tb = wrapT.querySelector("tbody");
      q.rows.forEach(function (row) {
        if (!a.v[row]) a.v[row] = {};
        var tr = el('<tr><td class="etapa">' + esc(row) + '</td><td></td><td></td><td></td></tr>');
        var tds = tr.querySelectorAll("td");
        var sel = document.createElement("select");
        sel.appendChild(el('<option value="">Selecione…</option>'));
        q.responsaveis.forEach(function (r) {
          var o = el('<option>' + esc(r) + '</option>');
          if (a.v[row].resp === r) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () { a.v[row].resp = sel.value; marcar(q.id); };
        tds[1].appendChild(sel);
        var qt = document.createElement("input"); qt.type = "number"; qt.min = "0"; qt.placeholder = "0";
        qt.value = a.v[row].qtd == null ? "" : a.v[row].qtd;
        qt.oninput = function () { a.v[row].qtd = qt.value; marcar(q.id); };
        tds[2].appendChild(qt);
        var sb = document.createElement("select");
        ["", "Sim", "Não"].forEach(function (r) {
          var o = el('<option value="' + esc(r) + '">' + (r || "—") + '</option>');
          if (a.v[row].subst === r) o.selected = true;
          sb.appendChild(o);
        });
        sb.onchange = function () { a.v[row].subst = sb.value; marcar(q.id); };
        tds[3].appendChild(sb);
        tb.appendChild(tr);
      });
      corpo.appendChild(wrapT);

    } else if (t === "files") {
      corpo.appendChild(areaAnexos());
    }

    wrap.appendChild(corpo);

    /* campo "Outro" */
    if (q.other) {
      var mostra = function () {
        var v = a.v;
        var lista = Array.isArray(v) ? v : (v ? [v] : []);
        return lista.indexOf("Outro") >= 0;
      };
      var outro = el('<div style="margin-top:10px' + (mostra() ? '' : ';display:none') + '"></div>');
      var oi = document.createElement("input"); oi.type = "text";
      oi.placeholder = "Descreva a sua resposta";
      oi.value = a.outro || "";
      oi.oninput = function () { a.outro = oi.value; marcar(q.id); };
      outro.appendChild(oi);
      wrap.appendChild(outro);
      wrap._outro = function () { outro.style.display = mostra() ? "" : "none"; };
    }

    /* campo complementar */
    if (q.followup) {
      var fu = el('<div style="margin-top:14px"></div>');
      fu.appendChild(el('<label class="ajuda" style="margin-bottom:7px;display:block;color:var(--ameixa-700)">' +
        esc(q.followup.label) + '</label>'));
      var fe = document.createElement(q.followup.type === "textarea" ? "textarea" : "input");
      if (q.followup.type === "number") { fe.type = "number"; fe.style.maxWidth = "260px"; }
      else if (q.followup.type !== "textarea") fe.type = "text";
      fe.value = a.extra == null ? "" : a.extra;
      fe.oninput = function () { a.extra = fe.value; marcar(q.id); };
      fu.appendChild(fe);
      wrap.appendChild(fu);
    }

    /* nao sei informar */
    if (q.unknown) {
      var na = el('<div class="na-linha"><span class="na-rot">Se não souber</span></div>');
      ["Não acompanho esse dado", "Não sei informar", "Não se aplica"].forEach(function (op) {
        var c = el('<button type="button" class="na-chip' + (a.na === op ? " sel" : "") + '">' + op + '</button>');
        c.onclick = function () {
          a.na = (a.na === op) ? "" : op;
          if (a.na) { a.v = ""; var i = wrap.querySelector("input[type=number],input[type=text]"); if (i) i.value = ""; }
          marcar(q.id); pintarNA(wrap, a);
        };
        na.appendChild(c);
      });
      wrap.appendChild(na);
      wrap._na = na;
    }
    return wrap;
  }

  function pintarNA(wrap, a) {
    if (!wrap._na) return;
    wrap._na.querySelectorAll(".na-chip").forEach(function (c) {
      c.classList.toggle("sel", c.textContent === a.na);
    });
  }

  function opcoes(q, a, lista, modo, wrap) {
    var box = el('<div class="opcoes' + (lista.length > 4 && modo === "check" ? " duas" : "") + '"></div>');
    var multi = modo === "check";
    if (multi && !Array.isArray(a.v)) a.v = a.v ? [a.v] : [];
    lista.forEach(function (op) {
      var marcado = multi ? a.v.indexOf(op) >= 0 : a.v === op;
      var o = el('<label class="opc ' + modo + (marcado ? " sel" : "") + '">' +
        '<span class="marca-opc"></span><span>' + esc(op) + '</span></label>');
      o.onclick = function (e) {
        e.preventDefault();
        if (multi) {
          var i = a.v.indexOf(op);
          if (i >= 0) a.v.splice(i, 1); else a.v.push(op);
        } else {
          a.v = (a.v === op) ? "" : op;
        }
        a.na = "";
        box.querySelectorAll(".opc").forEach(function (x, idx) {
          var val = lista[idx];
          x.classList.toggle("sel", multi ? a.v.indexOf(val) >= 0 : a.v === val);
        });
        if (wrap && wrap._outro) wrap._outro();
        pintarNA(wrap, a);
        marcar(q.id);
        if (!multi) redesenharCondicionais(q.id);
      };
      box.appendChild(o);
    });
    return box;
  }

  function redesenharCondicionais(qid) {
    var b = S.blocos[S.bi];
    var afeta = b.questions.some(function (q) { return q.show_if && q.show_if.q === qid; });
    if (afeta) setTimeout(function () { telaBloco(); }, 180);
  }

  /* ------------------------------------------------------------ anexos */
  function areaAnexos() {
    var box = document.createElement("div");
    var dz = el('<div class="dropzone"><div class="ico">⬆</div>' +
      '<p style="margin:10px 0 4px;font-size:15px;color:var(--ameixa-900)"><strong>Clique aqui ou arraste seus arquivos</strong></p>' +
      '<p class="small muted" style="margin:0">PDF, Word, Excel, imagens, prints, áudios · até 20 MB por arquivo</p></div>');
    var inp = document.createElement("input");
    inp.type = "file"; inp.multiple = true; inp.style.display = "none";
    dz.onclick = function () { inp.click(); };
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add("over"); };
    dz.ondragleave = function () { dz.classList.remove("over"); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove("over"); subir(e.dataTransfer.files); };
    inp.onchange = function () { subir(inp.files); inp.value = ""; };
    box.appendChild(dz); box.appendChild(inp);
    var lista = el('<div class="lista-anexos"></div>');
    box.appendChild(lista);
    S._listaAnexos = lista;
    pintarAnexos();
    return box;
  }

  function pintarAnexos() {
    var lista = S._listaAnexos;
    if (!lista) return;
    lista.innerHTML = "";
    if (!S.dados.anexos.length) {
      lista.appendChild(el('<p class="small muted center" style="padding:8px">Nenhum arquivo anexado ainda.</p>'));
      return;
    }
    S.dados.anexos.forEach(function (x) {
      var ext = (x.nome.split(".").pop() || "?").toUpperCase().slice(0, 4);
      var it = el('<div class="anexo"><div class="anexo-ico">' + esc(ext) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="anexo-nome">' + esc(x.nome) + '</div>' +
        '<div class="anexo-meta">' + tamanho(x.tamanho) + ' · enviado em ' +
        esc((x.enviado_em || "").replace("T", " às ").slice(0, 19)) + '</div></div></div>');
      var rm = el('<button class="btn btn-fantasma btn-sm" title="Remover">Remover</button>');
      rm.onclick = function () {
        if (!confirm("Remover o arquivo " + x.nome + "?")) return;
        api("/api/d/" + TOKEN + "/anexo-remover", { id: x.id }).then(function (r) {
          if (r.anexos) { S.dados.anexos = r.anexos; pintarAnexos(); toast("Arquivo removido"); }
        });
      };
      it.appendChild(rm);
      lista.appendChild(it);
    });
  }

  function subir(files) {
    var arr = Array.prototype.slice.call(files);
    if (!arr.length) return;
    var i = 0;
    function proximo() {
      if (i >= arr.length) { pintarAnexos(); return; }
      var f = arr[i++];
      if (f.size > 20 * 1024 * 1024) { toast(f.name + " passa de 20 MB e não foi enviado."); return proximo(); }
      toast("Enviando " + f.name + "…");
      var fr = new FileReader();
      fr.onload = function () {
        api("/api/d/" + TOKEN + "/anexo",
          { nome: f.name, tipo: f.type, dados: String(fr.result).split(",")[1] })
          .then(function (r) {
            if (r.erro) toast(r.erro);
            else { S.dados.anexos = r.anexos; toast(f.name + " anexado"); }
            pintarAnexos(); proximo();
          }).catch(function () { toast("Falha ao enviar " + f.name); proximo(); });
      };
      fr.readAsDataURL(f);
    }
    proximo();
  }

  /* ----------------------------------------------------------- revisao */
  function textoResposta(q, a) {
    if (!a) return "";
    if (a.na) return a.na;
    var v = a.v, s = "";
    if (v === null || v === undefined || v === "") s = "";
    else if (Array.isArray(v)) s = v.join(" · ");
    else if (q.type === "duration") {
      var p = [];
      if (v.anos) p.push(v.anos + (v.anos == 1 ? " ano" : " anos"));
      if (v.meses) p.push(v.meses + (v.meses == 1 ? " mês" : " meses"));
      if (v.data) p.push("início em " + v.data);
      s = p.join(" e ");
    } else if (q.type === "numgroup") {
      s = q.fields.filter(function (f) { return v[f.id] !== "" && v[f.id] != null; })
        .map(function (f) { return f.label + ": " + v[f.id]; }).join("\n");
    } else if (q.type === "matrix") {
      s = Object.keys(v).filter(function (r) { return v[r].resp; })
        .map(function (r) {
          return r + " → " + v[r].resp + (v[r].qtd ? " (" + v[r].qtd + ")" : "") +
            (v[r].subst ? " · substituto: " + v[r].subst : "");
        }).join("\n");
    } else if (q.type === "currency") s = "R$ " + v;
    else s = String(v) + (q.unit && q.type !== "currency" ? " " + q.unit : "");
    if (a.outro) s += (s ? " — " : "") + a.outro;
    if (a.extra) s += (s ? "\n↳ " : "") + a.extra;
    return s;
  }

  function telaRevisao() {
    document.getElementById("topoProg").classList.remove("hidden");
    document.getElementById("progRot").textContent = "Revisão final";
    palco.innerHTML = "";
    palco.appendChild(el('<div class="bloco-cab"><div class="eyebrow">Última etapa</div>' +
      '<h2>Revise antes de <em class="grifo">enviar</em></h2>' +
      '<p>Confira suas respostas com calma. Você ainda pode voltar e ajustar qualquer bloco. ' +
      'Depois do envio definitivo, as respostas ficam registradas e não podem mais ser alteradas por aqui.</p></div>'));

    var falta = [];
    S.blocos.forEach(function (b) {
      b.questions.forEach(function (q) {
        if (q.required && visivel(q) && !preenchida(S.resp[q.id])) falta.push({ b: b, q: q });
      });
    });
    if (falta.length) {
      var av = el('<div class="aviso erro" style="margin-bottom:22px"><strong>' + falta.length +
        (falta.length === 1 ? ' pergunta obrigatória ainda está em aberto.' : ' perguntas obrigatórias ainda estão em aberto.') +
        '</strong><ul style="margin:8px 0 0;padding-left:18px"></ul></div>');
      var ul = av.querySelector("ul");
      falta.slice(0, 8).forEach(function (f) {
        var li = el('<li style="margin:3px 0"><a href="#" style="color:var(--critico)">' +
          esc(f.b.title) + " · " + esc(f.q.label) + '</a></li>');
        li.querySelector("a").onclick = function (e) {
          e.preventDefault();
          S.bi = S.blocos.indexOf(f.b); S.tela = "bloco"; render();
          setTimeout(function () {
            var t = document.getElementById("q_" + f.q.id);
            if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        };
        ul.appendChild(li);
      });
      palco.appendChild(av);
    }

    S.blocos.forEach(function (b, i) {
      var rb = el('<div class="rev-bloco' + (i === 0 ? " aberto" : "") + '"></div>');
      var cab = el('<div class="rev-cab"><div><div class="eyebrow">' + esc(b.eyebrow) +
        '</div><h3>' + esc(b.title) + '</h3></div>' +
        '<div style="display:flex;gap:10px;align-items:center"></div></div>');
      var ed = el('<button class="btn btn-linha btn-sm">Editar</button>');
      ed.onclick = function (e) { e.stopPropagation(); S.bi = i; S.tela = "bloco"; render(); };
      cab.lastChild.appendChild(ed);
      cab.lastChild.appendChild(el('<span class="muted" style="font-size:18px">⌄</span>'));
      cab.onclick = function () { rb.classList.toggle("aberto"); };
      rb.appendChild(cab);
      var lista = el('<div class="rev-lista"></div>');
      b.questions.forEach(function (q) {
        if (!visivel(q)) return;
        var txt = textoResposta(q, S.resp[q.id]);
        if (q.type === "files") {
          txt = S.dados.anexos.length ? S.dados.anexos.map(function (x) { return x.nome; }).join("\n") : "";
        }
        lista.appendChild(el('<div class="rev-item"><div class="p">' + esc(q.label) + '</div>' +
          '<div class="r' + (txt ? "" : " vazio") + '">' + (txt ? esc(txt) : "Não respondida") + '</div></div>'));
      });
      rb.appendChild(lista);
      palco.appendChild(rb);
    });

    var pe = el('<div class="card card-pad" style="margin-top:24px;text-align:center"></div>');
    pe.appendChild(el('<div class="aviso" style="text-align:left;margin-bottom:20px">' +
      '<strong>Atenção:</strong> ao confirmar o envio, o diagnóstico é encaminhado para a equipe do ' +
      'Grupo B3 Sales e as respostas ficam bloqueadas para edição. Se precisar corrigir algo depois, ' +
      'basta falar com a equipe.</div>'));
    var acoes = el('<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"></div>');
    var volt2 = el('<button class="btn btn-linha">← Voltar aos blocos</button>');
    volt2.onclick = function () { S.tela = "bloco"; S.bi = S.blocos.length - 1; render(); };
    var env = el('<button class="btn btn-ouro" style="padding:15px 38px;font-size:15px">Enviar diagnóstico ✦</button>');
    if (falta.length) { env.disabled = true; env.textContent = "Complete as obrigatórias para enviar"; }
    env.onclick = function () {
      if (!confirm("Confirmar o envio definitivo do diagnóstico?\n\nDepois disso as respostas não poderão mais ser alteradas por este link.")) return;
      env.disabled = true; env.textContent = "Enviando…";
      enviarFila().then(function () { return api("/api/d/" + TOKEN + "/enviar", {}); })
        .then(function (r) {
          if (r.ok) { S.tela = "fim"; render(); }
          else { env.disabled = false; env.textContent = "Enviar diagnóstico ✦"; toast("Ainda faltam respostas obrigatórias."); render(); }
        });
    };
    acoes.appendChild(volt2); acoes.appendChild(env);
    pe.appendChild(acoes);
    palco.appendChild(pe);
  }

  function telaFim() {
    document.getElementById("topoProg").classList.add("hidden");
    palco.innerHTML = "";
    palco.appendChild(el(
      '<div class="fim"><div class="selo-ok">✦</div>' +
      '<div class="eyebrow">Método ECO</div>' +
      '<h1>Diagnóstico enviado<br><em class="grifo">com sucesso</em></h1>' +
      '<p>Obrigada pelo tempo investido e pela dedicação em responder este diagnóstico.</p>' +
      '<p>Suas respostas vão nos ajudar a compreender o momento atual da sua empresa, ' +
      'identificar os principais gargalos e construir uma estratégia comercial mais clara, ' +
      'organizada e aplicável à sua realidade.</p>' +
      '<hr class="filete" style="max-width:340px;margin:30px auto">' +
      '<p class="bora">Agora é hora de transformar informação em movimento.<br>' +
      '<strong>Bora fazer acontecer! 🚀</strong></p>' +
      '<p class="eyebrow" style="margin-top:22px">Grupo B3 Sales</p></div>'));
  }

  /* -------------------------------------------------------------- boot */
  function carregar() {
    api("/api/d/" + TOKEN).then(function (d) {
      if (d.bloqueado) { S.erro = d.erro; S.tela = "bloqueado"; return render(); }
      S.dados = d; S.blocos = d.blocos; S.resp = d.respostas || {};
      S.tela = d.enviado ? "fim" : "boas";
      render();
      pintarProgresso(d.progresso);
    }).catch(function () {
      S.erro = "Não conseguimos carregar o diagnóstico. Verifique sua conexão e recarregue a página.";
      S.tela = "bloqueado"; render();
    });
  }
  carregar();
})();
