  "use strict";
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast"), toastTxt = document.getElementById("toastTxt");
  var MARCA_IMG = null;
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
  /* data e hora escritas como a gente fala, sem cortar o relógio no meio */
  function dataBr(s) {
    if (!s) return "—";
    var t = String(s);
    var hora = t.slice(11, 16);
    return dataCurta(t) + (hora ? " · " + hora : "");
  }
  /* só a data, escrita como a gente fala */
  function dataCurta(s) {
    if (!s) return "";
    var p = String(s).slice(0, 10).split("-");
    if (p.length !== 3) return s;
    var meses = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
    return p[2] + " " + (meses[parseInt(p[1], 10) - 1] || "") + " " + p[0];
  }
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
      '<div class="card card-pad entrada" style="width:min(430px,100%)">' +
      '<div class="entrada-marca">' + marcaHtml() + '</div>' +
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
        .then(function (r) { if (r.ok) { abrirPainel(); } else telaLogin(r.erro || "Falha no acesso."); });
    }
    document.getElementById("entrar").onclick = tentar;
    ["u", "s"].forEach(function (i) {
      document.getElementById(i).onkeydown = function (e) { if (e.key === "Enter") tentar(); };
    });
    document.getElementById("u").focus();
  }

  /* ---------------------------------------------------------------- shell */

  /* A marca da casa: se a B3 Sales enviou o arquivo do logo, ele manda.
     Senão, desenhamos o B com o 3, que é o mais próximo do original. */
  function marcaHtml() {
    if (MARCA_IMG) {
      return '<div class="marca"><img class="marca-img" src="/api/midia/' +
        esc(MARCA_IMG) + '" alt="Grupo B3 Sales"></div>';
    }
    return '<div class="marca"><span class="marca-b3">' +
      '<svg viewBox="0 0 56 56" aria-label="B3 Sales Group">' +
      '<text class="mb" x="0" y="45">B</text>' +
      '<text class="m3" x="13" y="41">3</text></svg></span>' +
      '<span class="marca-fio"></span>' +
      '<div><div class="marca-txt">Sales</div>' +
      '<div class="marca-sub">Group</div></div></div>';
  }

