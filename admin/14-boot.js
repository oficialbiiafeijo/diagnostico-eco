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
  fetch("/api/marca").then(function (r) { return r.json(); })
    .then(function (m) { MARCA_IMG = m.logo_midia_id || null; })
    .catch(function () {})
    .then(function () { return api("/api/admin/sessao"); })
    .then(function (s) { s.logado ? abrirPainel() : telaLogin(); })
    .catch(function () { telaLogin("Não foi possível conectar ao servidor."); });
