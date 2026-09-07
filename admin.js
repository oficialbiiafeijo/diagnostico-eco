/* Diagnostico Comercial ECO - area interna do Grupo B3 Sales */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast"), toastTxt = document.getElementById("toastTxt");
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
  function dataBr(s) { return s ? s.replace("T", " · ").slice(0, 16) : "—"; }
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
      '<div class="card card-pad" style="width:min(430px,100%)">' +
      '<div class="marca" style="margin-bottom:26px"><span class="marca-b3"><svg viewBox="0 0 58 56" aria-label="B3 Sales Group"><text class="mb" x="0" y="47">B</text><text class="m3" x="17" y="47">3</text></svg></span><span class="marca-fio"></span>' +
      '<div><div class="marca-txt">Sales</div><div class="marca-sub">Group</div></div></div>' +
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
  function shell(conteudo) {
    app.innerHTML = "";
    var barra = el('<div class="barra"><div class="barra-in">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
      '<div class="marca"><span class="marca-b3"><svg viewBox="0 0 58 56" aria-label="B3 Sales Group"><text class="mb" x="0" y="47">B</text><text class="m3" x="17" y="47">3</text></svg></span><span class="marca-fio"></span>' +
      '<div><div class="marca-txt">Sales</div>' +
      '<div class="marca-sub">Group</div></div></div>' +
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
    var bu = el('<button class="btn btn-fantasma btn-sm">Acessos</button>');
    bu.onclick = modalUsuarios;
    dir.appendChild(bu);
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





  /* ------------------------------------------------------ rota do ciclo */
  function painelRota(d) {
    var cid = d.cliente.id, ciclo = d.ciclo;
    var box = el('<div></div>');
    var topo = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Rota de implementação · ' + esc(ciclo) + '</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 6px">' +
      'O que vamos <em class="grifo">instalar</em></h2>' +
      '<p class="small muted">O sistema sugere as ações a partir do diagnóstico. ' +
      'Tudo pode ser reescrito, reordenado ou apagado.</p></div>');
    var bGerar = el('<button class="btn btn-ouro btn-sm" style="margin-top:14px">Gerar rota pelo diagnóstico</button>');
    bGerar.onclick = function () {
      api("/api/admin/rota-gerar", { cliente_id: cid, ciclo: ciclo }).then(function (r) {
        if (r.erro) return toast(r.erro);
        toast(r.novas ? r.novas + " ações criadas" : "Nenhuma ação nova a sugerir");
        S.aba = "rota"; abrirCliente(cid, ciclo);
      });
    };
    var bNova = el('<button class="btn btn-linha btn-sm" style="margin-top:14px;margin-left:8px">+ Escrever uma ação</button>');
    bNova.onclick = function () { modalAcao(cid, ciclo, null, []); };
    topo.appendChild(bGerar); topo.appendChild(bNova);
    box.appendChild(topo);

    var lista = el('<div class="card card-pad"></div>');
    lista.appendChild(el('<p class="small muted">Carregando…</p>'));
    box.appendChild(lista);

    api("/api/admin/rota/" + cid + "?ciclo=" + encodeURIComponent(ciclo)).then(function (r) {
      lista.innerHTML = "";
      if (r.erro) { lista.appendChild(el('<p class="small muted">' + esc(r.erro) + '</p>')); return; }
      if (!r.acoes.length) {
        lista.appendChild(el('<p class="small muted">Nenhuma ação neste ciclo ainda. ' +
          'Use o botão acima para o sistema sugerir a partir do diagnóstico, ' +
          'ou escreva a sua.</p>'));
        return;
      }
      var feitas = r.acoes.filter(function (a) { return a.status === "Concluída"; }).length;
      lista.appendChild(el('<div class="eyebrow">' + feitas + ' de ' + r.acoes.length +
        ' concluídas</div>'));
      r.acoes.forEach(function (a) {
        var cls = a.status === "Concluída" ? "ok" : (a.status === "Bloqueada" ? "trava" : "");
        var linha = el('<div class="acao-linha ' + cls + '">' +
          '<div class="acao-txt"><strong>' + esc(a.titulo) + '</strong>' +
          (a.detalhe ? '<div class="small muted">' + esc(a.detalhe) + '</div>' : '') +
          (a.responsavel ? '<div class="small" style="color:var(--ouro-700);margin-top:3px">' +
            esc(a.responsavel) + '</div>' : '') + '</div></div>');
        var sel = document.createElement("select");
        sel.className = "acao-status";
        r.status_possiveis.forEach(function (st) {
          var o = document.createElement("option");
          o.value = st; o.textContent = st;
          if (a.status === st) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () {
          api("/api/admin/acao-salvar", { cliente_id: cid, id: a.id, titulo: a.titulo,
            detalhe: a.detalhe, responsavel: a.responsavel, status: sel.value,
            pilar: a.pilar, ordem: a.ordem })
            .then(function () { toast("Status atualizado"); });
        };
        linha.appendChild(sel);
        var bEd2 = el('<button class="acao-x" title="Editar">✎</button>');
        bEd2.onclick = function () { modalAcao(cid, ciclo, a, r.equipe); };
        var bX = el('<button class="acao-x" title="Remover">×</button>');
        bX.onclick = function () {
          if (!confirm("Remover esta ação?")) return;
          api("/api/admin/acao-excluir", { id: a.id }).then(function () {
            S.aba = "rota"; abrirCliente(cid, ciclo);
          });
        };
        linha.appendChild(bEd2); linha.appendChild(bX);
        lista.appendChild(linha);
      });
    });
    return box;
  }

  function modalAcao(cid, ciclo, a, equipe) {
    a = a || {};
    var corpo = el('<div>' +
      campoTexto("ac_tit", "O que precisa ser feito", "Ex: escrever o roteiro de atendimento", a.titulo) +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Detalhe</label>' +
      '<textarea id="ac_det" style="min-height:80px">' + esc(a.detalhe || "") + '</textarea></div>' +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">Quem é o responsável</label>' +
      '<select id="ac_resp"></select></div>' +
      '</div>');
    var selR = corpo.querySelector("#ac_resp");
    selR.appendChild(el('<option value="">Escolher uma pessoa</option>'));
    (equipe || []).forEach(function (pes) {
      var o = document.createElement("option");
      o.value = pes.nome;
      o.textContent = pes.nome + (pes.funcao ? "  ·  " + pes.funcao : "");
      if (a.responsavel === pes.nome) o.selected = true;
      selR.appendChild(o);
    });
    selR.appendChild(el('<option value="__b3__">Alguém da B3 Sales</option>'));
    if (a.responsavel && !(equipe || []).some(function (p) { return p.nome === a.responsavel; })) {
      var extra = document.createElement("option");
      extra.value = a.responsavel; extra.textContent = a.responsavel; extra.selected = true;
      selR.appendChild(extra);
    }
    if (!(equipe || []).length) {
      corpo.appendChild(el('<p class="small muted" style="margin:-8px 0 14px">' +
        'Cadastre o time em <strong>Equipe do cliente</strong> para escolher aqui pelo nome.</p>'));
    }
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(a.id ? "Editar ação" : "Nova ação", "Rota do " + ciclo, corpo, [bs]);
    bs.onclick = function () {
      var t = f.querySelector("#ac_tit").value.trim();
      if (!t) return toast("Escreva o que precisa ser feito");
      api("/api/admin/acao-salvar", { cliente_id: cid, ciclo: ciclo, id: a.id, titulo: t,
        detalhe: f.querySelector("#ac_det").value,
        responsavel: f.querySelector("#ac_resp").value === "__b3__"
          ? "Equipe B3 Sales" : f.querySelector("#ac_resp").value,
        status: a.status || "Não iniciada", pilar: a.pilar || "", ordem: a.ordem || 0 })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Ação salva"); S.aba = "rota"; abrirCliente(cid, ciclo);
        });
    };
  }

  /* --------------------------------------------------- equipe do cliente */
  function painelEquipe(d) {
    var cid = d.cliente.id;
    var box = el('<div></div>');
    var topo = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Quem é quem</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 6px">' +
      'A equipe do <em class="grifo">cliente</em></h2>' +
      '<p class="small muted">Nome, contato e função de cada pessoa, para você achar ' +
      'rápido quando precisar falar com alguém.</p></div>');
    var bAdd = el('<button class="btn btn-ouro btn-sm" style="margin-top:14px">+ Acrescentar pessoa</button>');
    topo.appendChild(bAdd);
    box.appendChild(topo);

    var lista = el('<div class="card card-pad"></div>');
    lista.appendChild(el('<p class="small muted">Carregando…</p>'));
    box.appendChild(lista);

    api("/api/admin/equipe/" + cid).then(function (r) {
      bAdd.onclick = function () { modalPessoa(cid, null, r); };
      lista.innerHTML = "";
      if (!r.equipe.length) {
        lista.appendChild(el('<p class="small muted">Nenhuma pessoa cadastrada ainda. ' +
          'Conforme o cliente contar quem faz o quê, registre aqui.</p>'));
        return;
      }
      var porArea = {};
      r.equipe.forEach(function (p) {
        var a = p.area || "Sem área definida";
        (porArea[a] = porArea[a] || []).push(p);
      });
      Object.keys(porArea).forEach(function (area) {
        lista.appendChild(el('<div class="eyebrow" style="margin:18px 0 8px">' +
          esc(area) + ' · ' + porArea[area].length + '</div>'));
        porArea[area].forEach(function (p) {
          var linha = el('<div class="pessoa">' +
            '<div class="pessoa-i">' + esc((p.nome || "?").slice(0, 1).toUpperCase()) + '</div>' +
            '<div class="pessoa-d"><strong>' + esc(p.nome) + '</strong>' +
            (p.funcao ? '<div class="small muted">' + esc(p.funcao) + '</div>' : '') +
            (p.nivel ? '<div class="small" style="color:var(--ouro-700)">' +
              esc(p.nivel.split(":")[0]) + '</div>' : '') + '</div>' +
            '<div class="pessoa-c">' +
            (p.telefone ? '<a href="https://wa.me/55' + esc(p.telefone.replace(/\D/g, "")) +
              '" target="_blank">' + esc(p.telefone) + '</a>' : '') +
            (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') +
            '</div></div>');
          var bE = el('<button class="acao-x" title="Editar">✎</button>');
          bE.onclick = function () { modalPessoa(cid, p, r); };
          var bX = el('<button class="acao-x" title="Remover">×</button>');
          bX.onclick = function () {
            if (!confirm("Remover " + p.nome + " da equipe?")) return;
            api("/api/admin/equipe-excluir", { id: p.id }).then(function () {
              S.aba = "equipe"; abrirCliente(cid, S.ciclo);
            });
          };
          linha.appendChild(bE); linha.appendChild(bX);
          lista.appendChild(linha);
        });
      });
    });
    return box;
  }

  function modalPessoa(cid, p, r) {
    p = p || {};
    function selHtml(id, rot, opts, val) {
      var h = '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
        'style="color:var(--ameixa-700);margin-bottom:5px;display:block">' + rot + '</label>' +
        '<select id="' + id + '"><option value="">Escolher</option>';
      opts.forEach(function (o) {
        h += '<option' + (val === o ? " selected" : "") + '>' + esc(o) + '</option>';
      });
      return h + '</select></div>';
    }
    var corpo = el('<div>' +
      campoTexto("pe_nome", "Nome", "Nome completo", p.nome) +
      selHtml("pe_funcao", "Função", r.funcoes, p.funcao) +
      selHtml("pe_area", "Área", r.areas, p.area) +
      selHtml("pe_nivel", "Nível de atuação", r.niveis, p.nivel) +
      campoTexto("pe_tel", "WhatsApp ou telefone", "(00) 00000-0000", p.telefone) +
      campoTexto("pe_mail", "E-mail", "nome@empresa.com.br", p.email) +
      '<div class="campo"><label class="small" style="color:var(--ameixa-700);' +
      'margin-bottom:5px;display:block">Observação</label>' +
      '<textarea id="pe_obs" style="min-height:70px">' + esc(p.obs || "") + '</textarea></div>' +
      '</div>');
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(p.id ? "Editar pessoa" : "Nova pessoa", "Equipe do cliente", corpo, [bs]);
    bs.onclick = function () {
      var nome = f.querySelector("#pe_nome").value.trim();
      if (!nome) return toast("Informe o nome");
      api("/api/admin/equipe-salvar", { cliente_id: cid, id: p.id, nome: nome,
        funcao: f.querySelector("#pe_funcao").value, area: f.querySelector("#pe_area").value,
        nivel: f.querySelector("#pe_nivel").value, telefone: f.querySelector("#pe_tel").value,
        email: f.querySelector("#pe_mail").value, obs: f.querySelector("#pe_obs").value,
        ordem: p.ordem || 0 })
        .then(function (res) {
          if (res.erro) return toast(res.erro);
          f.remove(); toast("Pessoa salva"); S.aba = "equipe"; abrirCliente(cid, S.ciclo);
        });
    };
  }

  function modalPortal(c) {
    var corpo = el('<div></div>');
    corpo.appendChild(el('<p class="small" style="color:var(--texto-2);line-height:1.7">' +
      'O acompanhamento é uma página que o cliente abre para ver o que já foi implantado, ' +
      'os materiais que você liberou e a jornada dos seis meses. ' +
      '<strong>Ele nunca vê</strong> as suas observações internas, o score nem os gargalos.</p>'));
    var caixa = el('<div style="margin-top:16px"></div>');
    corpo.appendChild(caixa);

    function pintar(token, ativo) {
      caixa.innerHTML = "";
      if (!ativo) {
        var b = el('<button class="btn btn-ouro" style="width:100%">Abrir o acompanhamento para este cliente</button>');
        b.onclick = function () {
          api("/api/admin/portal", { cliente_id: c.id, ativo: true })
            .then(function (r) { toast("Acompanhamento liberado"); pintar(r.token, 1); c.portal_ativo = 1; });
        };
        caixa.appendChild(b);
        return;
      }
      var url = location.origin + "/c/" + token;
      caixa.appendChild(el('<div class="eyebrow">Endereço do cliente</div>'));
      var cx = el('<div class="link-cx" style="margin:8px 0 14px"><code>' + esc(url) + '</code></div>');
      caixa.appendChild(cx);
      var bc = el('<button class="btn btn-ouro btn-sm">Copiar o link</button>');
      bc.onclick = function () { copiar(url, "Link copiado"); };
      var bv = el('<a class="btn btn-linha btn-sm" href="' + esc(url) + '" target="_blank">Ver como o cliente vê</a>');
      var bn = el('<button class="btn btn-fantasma btn-sm">Gerar outro endereço</button>');
      bn.onclick = function () {
        if (!confirm("O endereço atual deixa de funcionar. Continuar?")) return;
        api("/api/admin/portal", { cliente_id: c.id, acao: "novo", ativo: true })
          .then(function (r) { toast("Novo endereço gerado"); pintar(r.token, 1); });
      };
      var bf = el('<button class="btn btn-fantasma btn-sm">Fechar o acompanhamento</button>');
      bf.onclick = function () {
        api("/api/admin/portal", { cliente_id: c.id, ativo: false })
          .then(function () { toast("Acompanhamento fechado"); c.portal_ativo = 0; pintar(token, 0); });
      };
      var linha = el('<div style="display:flex;gap:8px;flex-wrap:wrap"></div>');
      linha.appendChild(bc); linha.appendChild(bv); linha.appendChild(bn); linha.appendChild(bf);
      caixa.appendChild(linha);
      caixa.appendChild(el('<p class="small muted" style="margin-top:14px">Para escolher o que ' +
        'ele vê, marque as páginas em Materiais e metodologia.</p>'));
    }

    pintar(c.token_portal || "", c.portal_ativo ? 1 : 0);
    modal("Acompanhamento do cliente", "O que ele vê", corpo);
  }



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
        var card = el('<div class="cur-card">' +
          '<div class="cur-capa" style="background:' +
          (c.capa_midia_id ? "#000 url(/api/midia/" + esc(c.capa_midia_id) +
            ") center/cover" : (CAPA_CSS[c.capa] || "var(--creme-3)")) + '">' +
          '<span class="cur-play">▶</span></div>' +
          '<div class="cur-corpo"><strong>' + esc(c.titulo) + '</strong>' +
          (c.descricao ? '<div class="small muted">' + esc(c.descricao) + '</div>' : '') +
          '<div class="cur-pe"><span>' + c.aulas +
          (c.aulas === 1 ? " aula" : " aulas") + '</span>' +
          '<span class="' + (c.clientes.length ? "cur-lib" : "cur-fech") + '">' +
          (c.clientes.length ? c.clientes.length + " com acesso" : "ninguém vê ainda") +
          '</span></div></div>');
        card.onclick = function () { abrirCurso(c.id); };
        grade.appendChild(card);
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
        null, "curso", function (r) { capaId = r.id; pintarCapa(); }, "image/*"));
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

  function modalAcesso(c) {
    var corpo = el('<div></div>');
    corpo.appendChild(el('<p class="small muted" style="margin:0 0 14px;line-height:1.7">' +
      'Marque quem enxerga este curso no acompanhamento. Quem não estiver marcado ' +
      'não vê o curso.</p>'));
    var escolhidos = (c.acesso || []).slice();
    (c.clientes || []).forEach(function (cli) {
      var it = el('<div class="pessoa esc' + (escolhidos.indexOf(cli.id) >= 0 ? " on" : "") +
        '" style="cursor:pointer"><span class="esc-n">' +
        (escolhidos.indexOf(cli.id) >= 0 ? "✓" : "") + '</span>' +
        '<div class="pessoa-d"><strong>' + esc(cli.empresa) + '</strong></div></div>');
      it.onclick = function () {
        var i = escolhidos.indexOf(cli.id);
        if (i >= 0) escolhidos.splice(i, 1); else escolhidos.push(cli.id);
        it.classList.toggle("on", escolhidos.indexOf(cli.id) >= 0);
        it.querySelector(".esc-n").textContent = escolhidos.indexOf(cli.id) >= 0 ? "✓" : "";
      };
      corpo.appendChild(it);
    });
    if (!(c.clientes || []).length) {
      corpo.appendChild(el('<p class="small muted">Nenhum cliente ativo ainda.</p>'));
    }
    var bs = el('<button class="btn btn-ouro">Salvar acesso</button>');
    var f = modal("Quem pode ver", esc(c.titulo), corpo, [bs]);
    bs.onclick = function () {
      api("/api/admin/curso-acesso", { curso_id: c.id, clientes: escolhidos })
        .then(function () { f.remove(); toast("Acesso atualizado"); abrirCurso(c.id); });
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
  function botaoEnviar(rotulo, cid, categoria, aoTerminar, aceita) {
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
    return cx;
  }

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
      var fundoCapa = pag.capa_midia_id
        ? "#241030 url(/api/midia/" + esc(pag.capa_midia_id) + ") center/cover"
        : (CAPA_CSS[pag.capa] || "var(--creme-3)");
      var capa = el('<div class="ws-capa" style="background:' + fundoCapa + '"></div>');
      var trocar = el('<div class="ws-capa-troca"></div>');
      dados.capas.forEach(function (c) {
        var b = el('<button type="button" title="' + esc(c.nome) + '" style="background:' + c.css + '"></button>');
        b.onclick = function () {
          api("/api/admin/ws-pagina", { id: paginaId, capa: c.id }).then(redesenhar);
        };
        trocar.appendChild(b);
      });
      var envCapa = botaoEnviar("↑ Imagem de capa", pag.cliente_id, "capa", function (r) {
        api("/api/admin/ws-pagina", { id: paginaId, capa_midia_id: r.id }).then(redesenhar);
      }, "image/*");
      envCapa.classList.add("ws-capa-env");
      trocar.appendChild(envCapa);
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

      if (!daCasa) {
        var vis = el('<label class="ws-vis"><input type="checkbox"' +
          (pag.visivel_cliente ? " checked" : "") + '> <span>O cliente pode ver esta página</span></label>');
        vis.querySelector("input").onchange = function (e) {
          api("/api/admin/ws-pagina", { id: paginaId, visivel_cliente: e.target.checked ? 1 : 0 })
            .then(function () { pisca(e.target.checked ? "Visível ao cliente" : "Só interno"); });
        };
        cab.appendChild(vis);
      }
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

  /* ------------------------------------------------------- visão geral */
  var CORES_CICLO = ["#472B60", "#5A3A6E", "#8E6FA3", "#C09052",
                     "#CFA467", "#C2683F", "#9C4A2F"];

  function rosca(dados, tamanho, centro, legenda) {
    /* dados: [{rotulo, valor, cor}] */
    var total = dados.reduce(function (a, d) { return a + d.valor; }, 0);
    var R = tamanho / 2, r = R * 0.62, cx = R, cy = R;
    var meio = (centro === undefined || centro === null) ? total : centro;
    var rot = legenda || "CLIENTES";
    function moldura(interno) {
      return '<svg viewBox="0 0 ' + tamanho + ' ' + tamanho + '" width="' + tamanho +
        '" height="' + tamanho + '">' + interno +
        '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" ' +
        'style="font-family:var(--serif);font-size:' + (R * 0.52) + 'px;fill:var(--ameixa-900)">' +
        meio + '</text>' +
        '<text x="' + cx + '" y="' + (cy + R * 0.28) + '" text-anchor="middle" ' +
        'style="font-size:9px;letter-spacing:.18em;fill:var(--muted)">' + esc(rot) +
        '</text></svg>';
    }
    if (!total) {
      return moldura('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) +
        '" fill="none" stroke="var(--creme-3)" stroke-width="' + (R - r) + '"/>');
    }
    /* um item sozinho fecha a volta inteira: arco de 360 graus não desenha, usamos anel */
    var cheios = dados.filter(function (d) { return d.valor > 0; });
    if (cheios.length === 1) {
      return moldura('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) +
        '" fill="none" stroke="' + cheios[0].cor + '" stroke-width="' + (R - r) +
        '"><title>' + esc(cheios[0].rotulo) + ': ' + cheios[0].valor + '</title></circle>');
    }
    var ang = -Math.PI / 2, partes = "";
    dados.forEach(function (d) {
      if (!d.valor) return;
      var fatia = d.valor / total * Math.PI * 2;
      var fim = ang + fatia;
      var grande = fatia > Math.PI ? 1 : 0;
      var x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
      var x2 = cx + R * Math.cos(fim), y2 = cy + R * Math.sin(fim);
      var x3 = cx + r * Math.cos(fim), y3 = cy + r * Math.sin(fim);
      var x4 = cx + r * Math.cos(ang), y4 = cy + r * Math.sin(ang);
      partes += '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + grande + ' 1 ' +
        x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 ' + grande + ' 0 ' +
        x4 + ' ' + y4 + ' Z" fill="' + d.cor + '"><title>' + esc(d.rotulo) + ': ' +
        d.valor + '</title></path>';
      ang = fim;
    });
    return moldura(partes);
  }

  function barrasPilar(p) {
    var itens = [{ k: "E", n: "Estratégia", v: p.E, c: "var(--ameixa-600)" },
                 { k: "C", n: "Condução", v: p.C, c: "var(--ouro-600)" },
                 { k: "O", n: "Operação", v: p.O, c: "var(--terracota-500)" }];
    var h = "";
    itens.forEach(function (i) {
      h += '<div class="pil-linha">' +
        '<span class="pil-k">' + i.k + '</span>' +
        '<span class="pil-n">' + i.n + '</span>' +
        '<span class="pil-t"><i style="width:' + Math.max(i.v, 2) + '%;background:' + i.c + '"></i></span>' +
        '<span class="pil-v">' + i.v + '</span></div>';
    });
    return h;
  }

  /* cada empresa ganha um tom próprio, para o olho achar rápido no quadro */
  var TONS = ["linear-gradient(140deg,#472B60,#241030)",
              "linear-gradient(140deg,#A8803F,#7E5A22)",
              "linear-gradient(140deg,#B25837,#7E3A24)",
              "linear-gradient(140deg,#5A3A6E,#37204B)",
              "linear-gradient(140deg,#3E7D5A,#2A5740)",
              "linear-gradient(140deg,#8E6FA3,#5A3A6E)"];
  function corDaEmpresa(nome) {
    var n = 0;
    for (var i = 0; i < (nome || "").length; i++) n += nome.charCodeAt(i);
    return TONS[n % TONS.length];
  }

  function telaPainel(d) {
    var wrap = document.createElement("div");
    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Grupo B3 Sales</div>' +
      '<h1 class="serif">Visão geral da <em class="grifo">carteira</em></h1>' +
      '<p class="muted small" style="margin-top:6px">O que já foi implantado, ' +
      'onde a operação está e quem precisa de atenção agora.</p></div></div>'));

    /* faixa de números */
    wrap.appendChild(el('<div class="kpis">' +
      '<div class="kpi"><b>' + d.total + '</b><span>Clientes ativos</span></div>' +
      '<div class="kpi"><b>' + d.diagnosticos_enviados + '</b><span>Diagnósticos respondidos</span></div>' +
      '<div class="kpi"><b>' + d.acoes.concluidas + '<i class="de">/' + d.acoes.total +
        '</i></b><span>Processos implantados</span></div>' +
      '<div class="kpi"><b>' + d.documentos + '</b><span>Documentos recebidos</span></div>' +
      '<div class="kpi"><b>' + d.paginas + '</b><span>Materiais criados</span></div>' +
      '</div>'));

    var grade = el('<div class="grade-painel"></div>');

    /* rosca: onde os clientes estão na jornada */
    var dadosCiclo = d.ciclos.map(function (c, i) {
      return { rotulo: c, valor: d.por_ciclo[c] || 0, cor: CORES_CICLO[i % CORES_CICLO.length] };
    });
    var cRosca = el('<div class="card card-pad">' +
      '<div class="eyebrow">Onde cada cliente está</div>' +
      '<h2 class="serif tit-card">A jornada dos <em class="grifo">180 dias</em></h2>' +
      '<div class="rosca-linha"><div class="rosca-svg">' + rosca(dadosCiclo, 168) + '</div>' +
      '<div class="rosca-leg"></div></div></div>');
    var leg = cRosca.querySelector(".rosca-leg");
    dadosCiclo.forEach(function (x) {
      if (!x.valor) return;
      leg.appendChild(el('<div class="leg-item"><i style="background:' + x.cor + '"></i>' +
        '<span>' + esc(x.rotulo) + '</span><b>' + x.valor + '</b></div>'));
    });
    if (!leg.children.length) leg.appendChild(el('<p class="small muted">Nenhum ciclo em andamento.</p>'));
    grade.appendChild(cRosca);

    /* barras: maturidade por pilar */
    grade.appendChild(el('<div class="card card-pad">' +
      '<div class="eyebrow">Maturidade média da carteira</div>' +
      '<h2 class="serif tit-card">Os três pilares do <em class="grifo">ECO</em></h2>' +
      '<div class="pilares-graf">' + barrasPilar(d.pilares) + '</div>' +
      '<div class="score-linha"><span>Score médio</span><b>' + d.score_medio + '<i>/100</i></b></div>' +
      '</div>'));

    /* execução do plano */
    var pct = d.acoes.pct;
    grade.appendChild(el('<div class="card card-pad">' +
      '<div class="eyebrow">Execução do plano</div>' +
      '<h2 class="serif tit-card">O que saiu do <em class="grifo">papel</em></h2>' +
      '<div class="anel-exec">' +
      rosca([{ rotulo: "Concluídas", valor: d.acoes.concluidas, cor: "var(--ouro-600)" },
             { rotulo: "Em aberto", valor: d.acoes.total - d.acoes.concluidas, cor: "#EDE0D6" }],
            140, d.acoes.pct + "%", "CONCLUÍDO") +
      '</div>' +
      '<p class="small muted center" style="margin-top:10px">' + pct +
      '% das ações combinadas já foram concluídas</p></div>'));

    wrap.appendChild(grade);

    /* quem precisa de atenção */
    var atencao = el('<div class="grade-painel dois"></div>');
    var cAtr = el('<div class="card card-pad"><div class="eyebrow">Precisam de atenção</div>' +
      '<h2 class="serif tit-card">Ciclos <em class="grifo">parados</em></h2></div>');
    if (!d.atrasados.length) cAtr.appendChild(el('<p class="small muted">Nenhum ciclo parado. Carteira em dia.</p>'));
    d.atrasados.forEach(function (x) {
      var linha = el('<div class="alerta"><div><strong>' + esc(x.empresa) + '</strong>' +
        '<div class="small muted">' + esc(x.ciclo) + ' sem envio</div></div>' +
        '<span class="selo selo-critico">' + x.dias + ' dias</span></div>');
      linha.onclick = function () { abrirCliente(x.id); };
      cAtr.appendChild(linha);
    });
    atencao.appendChild(cAtr);

    var cSem = el('<div class="card card-pad"><div class="eyebrow">Sem contato</div>' +
      '<h2 class="serif tit-card">Há mais de <em class="grifo">7 dias</em></h2></div>');
    if (!d.sem_contato.length) cSem.appendChild(el('<p class="small muted">Todo mundo acessou nos últimos dias.</p>'));
    d.sem_contato.forEach(function (x) {
      var linha = el('<div class="alerta"><div><strong>' + esc(x.empresa) + '</strong></div>' +
        '<span class="selo selo-atencao">' + x.dias + ' dias</span></div>');
      linha.onclick = function () { abrirCliente(x.id); };
      cSem.appendChild(linha);
    });
    atencao.appendChild(cSem);
    wrap.appendChild(atencao);

    /* carteira em cartões, agrupada pelo ciclo */
    wrap.appendChild(el('<div class="p-sec" style="margin:34px 0 14px">' +
      '<div class="eyebrow">Carteira</div>' +
      '<h2 class="serif tit-card" style="margin-bottom:0">Cada cliente, ' +
      '<em class="grifo">um cartão</em></h2></div>'));

    if (!d.jornada.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:44px 24px">' +
        '<p class="muted small">Nenhum cliente ativo ainda.</p></div>'));
      return wrap;
    }

    var colunas = el('<div class="kanban"></div>');
    d.ciclos.forEach(function (ciclo) {
      var doCiclo = d.jornada.filter(function (j) { return j.ciclo === ciclo; });
      if (!doCiclo.length) return;
      var col = el('<div class="kan-col"><div class="kan-cab">' +
        '<span class="kan-t">' + esc(ciclo) + '</span>' +
        '<span class="kan-n">' + doCiclo.length + '</span></div>' +
        '<div class="kan-lista"></div></div>');
      var lista = col.querySelector(".kan-lista");
      doCiclo.forEach(function (j) {
        var pct = j.acoes ? Math.round(j.acoes_feitas / j.acoes * 100) : 0;
        var avisos = "";
        if (j.dias_sem_contato != null && j.dias_sem_contato > 7) {
          avisos += '<span class="kan-alerta">' + j.dias_sem_contato + ' dias sem falar</span>';
        }
        if (j.dias_contrato != null) {
          var cls = j.dias_contrato < 0 ? "kan-venceu"
                  : j.dias_contrato <= 30 ? "kan-alerta" : "kan-prazo";
          avisos += '<span class="' + cls + '">' +
            (j.dias_contrato < 0 ? "contrato vencido"
              : j.dias_contrato + " dias de contrato") + '</span>';
        }
        var c = el('<div class="kan-card">' +
          '<div class="kan-topo"><span class="kan-ini" style="background:' +
          corDaEmpresa(j.empresa) + '">' +
          esc((j.empresa || "?").slice(0, 1).toUpperCase()) + '</span>' +
          '<div class="kan-nome"><strong>' + esc(j.empresa) + '</strong>' +
          (j.tipo_servico ? '<span class="small muted">' + esc(j.tipo_servico) + '</span>'
            : '<span class="small muted">' + esc(j.segmento || "Sem segmento") + '</span>') +
          '</div></div>' +
          (j.entrada ? '<span class="selo selo-entrada" style="margin-top:10px;display:inline-block">' +
            esc(j.entrada) + '</span>' : '') +
          '<div class="kan-linha"><span>Diagnóstico</span>' +
          '<div class="mini-barra"><i style="width:' + (j.progresso || 0) + '%"></i></div>' +
          '<b>' + (j.progresso || 0) + '%</b></div>' +
          '<div class="kan-linha"><span>Implantação</span>' +
          '<div class="mini-barra"><i style="width:' + pct + '%;background:var(--terracota-500)"></i></div>' +
          '<b>' + j.acoes_feitas + '/' + j.acoes + '</b></div>' +
          '<div class="kan-pe"><span>' + (j.documentos + j.paginas) + ' materiais</span>' +
          '<span class="kan-avisos">' + avisos + '</span></div>');
        c.onclick = function () { abrirCliente(j.id); };
        lista.appendChild(c);
      });
      colunas.appendChild(col);
    });
    wrap.appendChild(colunas);
    return wrap;
  }

  function abrirPainel() {
    api("/api/admin/painel").then(function (d) {
      if (d.erro) return telaLogin();
      S.rota = "painel";
      try { shell(telaPainel(d)); }
      catch (e) { console.error("Falha ao montar a visão geral:", e); }
    });
  }

  /* ----------------------------------------------------------- lista */
  function telaLista(d) {
    var cs = d.clientes;
    var wrap = document.createElement("div");
    var enviados = cs.filter(function (c) { return c.ja_enviou; }).length;
    var andamento = cs.filter(function (c) { return c.status === "Em preenchimento"; }).length;
    var anexos = cs.reduce(function (a, c) { return a + c.anexos; }, 0);

    var topo = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Grupo B3 Sales</div>' +
      '<h1 class="serif">Diagnósticos <em class="grifo">' +
      (S.arquivados ? 'arquivados' : 'em carteira') + '</em></h1></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"></div></div>');
    var bArq = el('<button class="btn btn-linha">' +
      (S.arquivados ? "← Clientes ativos" : "Ver arquivados") + '</button>');
    bArq.onclick = function () { S.arquivados = !S.arquivados; carregar(); };
    topo.lastChild.appendChild(bArq);
    var bn = el('<button class="btn btn-ouro">+ Novo cliente</button>');
    bn.onclick = modalNovoCliente;
    topo.lastChild.appendChild(bn);
    wrap.appendChild(topo);

    wrap.appendChild(el('<div class="kpis">' +
      '<div class="kpi"><b>' + cs.length + '</b><span>Clientes</span></div>' +
      '<div class="kpi"><b>' + andamento + '</b><span>Preenchendo</span></div>' +
      '<div class="kpi"><b>' + enviados + '</b><span>Enviados</span></div>' +
      '<div class="kpi"><b>' + anexos + '</b><span>Anexos recebidos</span></div>' +
      '</div>'));

    if (!cs.length) {
      wrap.appendChild(el('<div class="card card-pad center" style="padding:60px 24px">' +
        '<h2 class="serif" style="font-size:28px;color:var(--ameixa-900)">Nenhum cliente cadastrado ainda</h2>' +
        '<p class="muted" style="margin:10px 0 22px">Cadastre a primeira empresa para gerar o link individual do diagnóstico.</p>' +
        '</div>'));
      var b2 = el('<button class="btn btn-ouro">+ Cadastrar primeiro cliente</button>');
      b2.onclick = modalNovoCliente;
      wrap.lastChild.appendChild(b2);
      return wrap;
    }

    var card = el('<div class="card" style="overflow:hidden"><div style="overflow-x:auto">' +
      '<table class="lista"><thead><tr><th>Empresa</th><th>Responsável</th><th>Ciclo</th>' +
      '<th>Status</th><th>Progresso</th><th>Último acesso</th><th>Link do cliente</th><th></th>' +
      '</tr></thead><tbody></tbody></table></div></div>');
    var tb = card.querySelector("tbody");
    cs.forEach(function (c) {
      var ativo = (c.links || []).filter(function (l) { return l.ativo; }).slice(-1)[0];
      var tr = el('<tr>' +
        '<td><span class="emp">' + esc(c.empresa) + '</span><div class="small muted">' +
        esc(c.segmento || "—") + '</div></td>' +
        '<td>' + esc(c.responsavel || "—") + '<div class="small muted">' + esc(c.cargo || "") + '</div></td>' +
        '<td>' + esc(c.ciclo_atual) + '</td>' +
        '<td><span class="selo ' + seloClasse(c.status) + '">' + esc(stTexto(c.status)) + '</span></td>' +
        '<td><span class="mini-prog"><i style="width:' + c.progresso + '%"></i></span>' + c.progresso + '%</td>' +
        '<td class="small muted">' + dataBr(ativo && ativo.ultimo_acesso) + '</td>' +
        '<td></td><td style="text-align:right"></td></tr>');
      var tdLink = tr.children[6];
      if (ativo) {
        var lc = el('<div class="link-cel"><code>/d/' + esc(ativo.token.slice(0, 12)) + '…</code></div>');
        var bcp = el('<button class="btn btn-fantasma btn-sm" title="Copiar link">Copiar</button>');
        bcp.onclick = function (e) { e.stopPropagation(); copiar(linkDe(ativo.token)); };
        lc.appendChild(bcp);
        tdLink.appendChild(lc);
      } else tdLink.appendChild(el('<span class="small muted">sem link ativo</span>'));
      var ver = el('<button class="btn btn-linha btn-sm">Abrir</button>');
      ver.onclick = function () { abrirCliente(c.id); };
      tr.children[7].appendChild(ver);
      tr.querySelector(".emp").onclick = function () { abrirCliente(c.id); };
      tb.appendChild(tr);
    });
    wrap.appendChild(card);
    return wrap;
  }

  /* -------------------------------------------------------- detalhe */
  function abrirCliente(cid, ciclo) {
    S.cid = cid; S.ciclo = ciclo || null;
    api("/api/admin/cliente/" + cid + (ciclo ? "?ciclo=" + encodeURIComponent(ciclo) : ""))
      .then(function (d) {
        if (d.erro) return toast(d.erro);
        S.det = d; S.ciclo = d.ciclo; S.rota = "detalhe";
        shell(telaDetalhe(d));
      });
  }

  function telaDetalhe(d) {
    var c = d.cliente;
    var wrap = document.createElement("div");

    var volta = el('<button class="btn btn-fantasma btn-sm" style="margin-bottom:14px">← Todos os clientes</button>');
    volta.onclick = function () { S.rota = "lista"; carregar(); };
    wrap.appendChild(volta);

    var cab = el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">' + esc(c.segmento || "Cliente") + '</div>' +
      '<h1 class="serif">' + esc(c.empresa) + '</h1>' +
      '<p class="muted small" style="margin:6px 0 0">' + esc(c.responsavel || "—") +
      (c.cargo ? " · " + esc(c.cargo) : "") + (c.contato ? " · " + esc(c.contato) : "") +
      (c.email ? " · " + esc(c.email) : "") + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"></div></div>');
    var acoes = cab.lastChild;
    var bEd = el('<button class="btn btn-linha btn-sm">Editar dados</button>');
    bEd.onclick = function () { modalEditar(c); };
    var bMat = el('<button class="btn btn-ouro btn-sm">Materiais e metodologia</button>');
    bMat.onclick = function () { abrirMateriais(c.id); };
    var bPortal = el('<button class="btn btn-linha btn-sm">' +
      (c.portal_ativo ? "Link do cliente" : "Abrir acompanhamento ao cliente") + '</button>');
    bPortal.onclick = function () { modalPortal(c); };
    var bJson = el('<a class="btn btn-linha btn-sm" href="/api/admin/exportar/' + c.id + '">Exportar JSON</a>');
    var bCsv = el('<a class="btn btn-linha btn-sm" href="/api/admin/exportar-csv/' + c.id + '">Exportar CSV</a>');
    var bCiclo = el('<button class="btn btn-ameixa btn-sm">+ Novo ciclo</button>');
    bCiclo.onclick = function () { modalNovoCiclo(d); };
    var bArq2 = el('<button class="btn btn-fantasma btn-sm">' +
      (c.arquivado ? "Reativar" : "Arquivar") + '</button>');
    bArq2.onclick = function () {
      api("/api/admin/cliente-editar", { id: c.id, arquivado: !c.arquivado })
        .then(function () {
          toast(c.arquivado ? "Cliente reativado" : "Cliente arquivado");
          S.arquivados = false; S.rota = "lista"; carregar();
        });
    };
    var bDel = el('<button class="btn btn-fantasma btn-sm" style="color:var(--critico)">Excluir</button>');
    bDel.onclick = function () { modalExcluir(c); };
    acoes.appendChild(bEd);
    acoes.appendChild(bMat); acoes.appendChild(bPortal); acoes.appendChild(bJson); acoes.appendChild(bCsv);
    acoes.appendChild(bArq2); acoes.appendChild(bDel); acoes.appendChild(bCiclo);
    wrap.appendChild(cab);

    /* abas de ciclo */
    var ab = el('<div class="abas"></div>');
    d.ciclos.forEach(function (x) {
      var b = el('<button class="' + (x.ciclo === d.ciclo ? "at" : "") + '">' + esc(x.ciclo) +
        ' · ' + x.progresso + '%</button>');
      b.onclick = function () { abrirCliente(c.id, x.ciclo); };
      ab.appendChild(b);
    });
    if (d.ciclos.length > 1) {
      var bc = el('<button style="border-style:dashed">⇄ Comparar ciclos</button>');
      bc.onclick = function () { modalComparar(d); };
      ab.appendChild(bc);
    }
    wrap.appendChild(ab);

    var grade = el('<div class="grade"></div>');
    var col1 = document.createElement("div"), col2 = document.createElement("div");

    /* ---- coluna direita: score, status, links, anexos */
    var ciclo = d.ciclos.filter(function (x) { return x.ciclo === d.ciclo; })[0] || {};
    var sc = d.score;
    if (!sc) {
      col2.appendChild(el('<div class="card card-pad" style="margin-bottom:16px">' +
        '<div class="eyebrow">Score ECO</div>' +
        '<p class="small muted" style="margin:8px 0 0">O score é calculado sobre o ' +
        'diagnóstico do Dia 0. Este ciclo é um acompanhamento, então ele mede ' +
        'evolução, não estrutura. Abra o Dia 0 para ver o score.</p></div>'));
    }
    var sCard = sc && el('<div class="score-cartao">' +
      '<div class="eyebrow" style="color:var(--ouro-300)">Score ECO · interno</div>' +
      '<div class="score-geral">' + sc.geral + '<span style="font-size:22px;opacity:.6">/100</span></div>' +
      '<p style="font-size:12.5px;color:rgba(255,255,255,.75);margin:6px 0 16px">' +
      esc(sc.classificacao) + '</p></div>');
    if (sc) ["E", "C", "O"].forEach(function (k) {
      var p = sc.pilares[k];
      sCard.appendChild(el('<div class="score-pil"><span class="l">' + k + '</span>' +
        '<span class="n">' + esc(p.nome) + '</span><span class="t"><i style="width:' + p.score + '%"></i></span>' +
        '<span class="p">' + p.score + '</span></div>'));
    });
    if (sc) {
      sCard.appendChild(el('<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16);' +
        'font-size:12.5px;color:rgba(255,255,255,.8)">Porta de entrada sugerida: ' +
        '<strong style="color:var(--ouro-300)">' + esc(sc.entrada_nome) + '</strong></div>'));
      col2.appendChild(sCard);
    }

    /* status */
    var stCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Status do ciclo ' + esc(d.ciclo) + '</div></div>');
    var sel = document.createElement("select");
    sel.style.marginTop = "10px";
    d.status_possiveis.forEach(function (s) {
      var o = el('<option value="' + esc(s) + '">' + esc(stTexto(s)) + '</option>');
      if (ciclo.status === s) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      api("/api/admin/status", { cliente_id: c.id, ciclo: d.ciclo, status: sel.value })
        .then(function () { toast("Status atualizado"); });
    };
    stCard.appendChild(sel);
    stCard.appendChild(el('<div class="small muted" style="margin-top:12px;line-height:1.9">' +
      'Progresso: <strong>' + (ciclo.progresso || 0) + '%</strong><br>' +
      'Enviado em: ' + dataBr(ciclo.enviado_em) + '<br>' +
      'Obrigatórias em aberto: ' + d.faltando.length + '</div>'));
    col2.appendChild(stCard);

    /* links */
    var lkCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Links individuais</div></div>');
    d.links.forEach(function (l) {
      var it = el('<div style="padding:11px 0;border-top:1px solid var(--linha)">' +
        '<div class="small" style="display:flex;justify-content:space-between;gap:8px">' +
        '<span>' + esc(l.ciclo) + '</span>' +
        '<span class="' + (l.ativo ? "sinal-ok" : "muted") + '">' + (l.ativo ? "ativo" : "desativado") + '</span></div>' +
        '<code style="font-size:10.5px;color:var(--muted);word-break:break-all">' +
        esc(linkDe(l.token)) + '</code>' +
        '<div class="small muted" style="margin-top:5px">' + (l.acessos || 0) + ' acessos · último ' +
        dataBr(l.ultimo_acesso) + (l.preenchido_por ? '<br>preenchido por ' + esc(l.preenchido_por) : '') +
        (l.expira_em ? '<br>expira em ' + dataBr(l.expira_em) : '') + '</div>' +
        '<div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap"></div></div>');
      var barra = it.lastChild;
      var b1 = el('<button class="btn btn-linha btn-sm">Copiar</button>');
      b1.onclick = function () { copiar(linkDe(l.token)); };
      var b2 = el('<button class="btn btn-fantasma btn-sm">' + (l.ativo ? "Desativar" : "Reativar") + '</button>');
      b2.onclick = function () {
        api("/api/admin/link", { acao: l.ativo ? "desativar" : "ativar", token: l.token })
          .then(function () { toast("Link atualizado"); abrirCliente(c.id, d.ciclo); });
      };
      barra.appendChild(b1); barra.appendChild(b2);
      lkCard.appendChild(it);
    });
    var bNovo = el('<button class="btn btn-linha btn-sm" style="margin-top:12px;width:100%">Gerar novo link deste ciclo</button>');
    bNovo.onclick = function () {
      if (!confirm("Gerar um novo link para o ciclo " + d.ciclo + "?\nO link anterior deste ciclo será desativado.")) return;
      api("/api/admin/link", { acao: "novo", cliente_id: c.id, ciclo: d.ciclo })
        .then(function (r) { copiar(linkDe(r.token), "Novo link gerado e copiado"); abrirCliente(c.id, d.ciclo); });
    };
    lkCard.appendChild(bNovo);
    col2.appendChild(lkCard);

    /* anexos */
    var axCard = el('<div class="card card-pad" style="margin-top:16px">' +
      '<div class="eyebrow">Anexos do cliente · ' + d.anexos.length + '</div></div>');
    if (!d.anexos.length) axCard.appendChild(el('<p class="small muted" style="margin-top:10px">Nenhum arquivo enviado neste ciclo.</p>'));
    d.anexos.forEach(function (x) {
      var ext = (x.nome.split(".").pop() || "?").toUpperCase().slice(0, 4);
      var it = el('<div class="anexo" style="margin-top:10px;padding:10px 12px">' +
        '<div class="anexo-ico" style="width:30px;height:30px;font-size:11px">' + esc(ext) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="anexo-nome" style="font-size:12.5px">' +
        esc(x.nome) + '</div><div class="anexo-meta">' + tamanho(x.tamanho) + ' · ' +
        dataBr(x.enviado_em) + '</div></div></div>');
      it.appendChild(el('<a class="btn btn-fantasma btn-sm" href="/api/anexo/' + x.id + '">Baixar</a>'));
      axCard.appendChild(it);
    });
    col2.appendChild(axCard);

    /* ---- coluna esquerda: abas de conteudo */
    var navAbas = el('<div class="abas" style="margin-bottom:18px"></div>');
    [["respostas", "Respostas"], ["rota", "Rota do ciclo"], ["equipe", "Equipe do cliente"],
     ["diagnostico", "Diagnóstico interno"], ["notas", "Análise da B3 Sales"],
     ["historico", "Histórico"]].forEach(function (t) {
      var b = el('<button class="' + (S.aba === t[0] ? "at" : "") + '">' + t[1] + '</button>');
      b.onclick = function () { S.aba = t[0]; shell(telaDetalhe(d)); };
      navAbas.appendChild(b);
    });
    col1.appendChild(navAbas);

    if (S.aba === "respostas") col1.appendChild(painelRespostas(d));
    else if (S.aba === "rota") col1.appendChild(painelRota(d));
    else if (S.aba === "equipe") col1.appendChild(painelEquipe(d));
    else if (S.aba === "diagnostico") col1.appendChild(painelDiagnostico(d));
    else if (S.aba === "notas") col1.appendChild(painelNotas(d));
    else col1.appendChild(painelHistorico(d));

    grade.appendChild(col1); grade.appendChild(col2);
    wrap.appendChild(grade);
    return wrap;
  }

  function textoResp(q, a) {
    if (!a) return "";
    if (a.na) return a.na;
    var v = a.v, s = "";
    if (v === null || v === undefined || v === "") s = "";
    else if (Array.isArray(v)) s = v.join(" · ");
    else if (q.type === "duration") {
      var p = [];
      if (v.anos) p.push(v.anos + " anos");
      if (v.meses) p.push(v.meses + " meses");
      if (v.data) p.push("início " + v.data);
      s = p.join(" e ");
    } else if (q.type === "numgroup") {
      s = (q.fields || []).filter(function (f) { return v[f.id] !== "" && v[f.id] != null; })
        .map(function (f) { return f.label + ": " + v[f.id]; }).join("\n");
    } else if (q.type === "matrix") {
      s = Object.keys(v).filter(function (r) { return v[r].resp; }).map(function (r) {
        return r + " → " + v[r].resp + (v[r].qtd ? " (" + v[r].qtd + " pessoa(s))" : "") +
          (v[r].subst ? " · substituto: " + v[r].subst : "");
      }).join("\n");
    } else if (q.type === "currency") s = "R$ " + v;
    else s = String(v) + (q.unit && q.type !== "currency" ? " " + q.unit : "");
    if (a.outro) s += (s ? " — " : "") + a.outro;
    if (a.extra) s += (s ? "\n↳ " : "") + a.extra;
    return s;
  }

  function painelRespostas(d) {
    var box = document.createElement("div");
    d.blocos.forEach(function (b) {
      var card = el('<div class="card card-pad" style="margin-bottom:16px">' +
        '<div class="eyebrow">' + esc(b.eyebrow) + '</div>' +
        '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
        esc(b.title) + '</h2></div>');
      b.questions.forEach(function (q) {
        var a = d.respostas[q.id];
        var t = textoResp(q, a);
        var it = el('<div class="resp-item"><div class="resp-p">' + esc(q.label) + '</div>' +
          '<div class="resp-v' + (t ? "" : " vazio") + '">' + (t ? esc(t) : "Não respondida") + '</div></div>');
        if (q.admin) {
          var adm = q.admin;
          it.appendChild(el('<div class="resp-adm"><span class="interno-tag">Uso interno · não visível ao cliente</span>' +
            (adm.indicador ? '<div><b>Indicador:</b> ' + esc(adm.indicador) + '</div>' : '') +
            (adm.objetivo ? '<div><b>Objetivo:</b> ' + esc(adm.objetivo) + '</div>' : '') +
            (adm.analise ? '<div><b>Análise:</b> ' + esc(adm.analise) + '</div>' : '') + '</div>'));
        }
        card.appendChild(it);
      });
      box.appendChild(card);
    });
    return box;
  }

  function painelDiagnostico(d) {
    var box = document.createElement("div");
    var ind = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Indicadores calculados</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'O que os números <em class="grifo">mostram</em></h2></div>');
    if (!d.indicadores.length) ind.appendChild(el('<p class="muted small">Ainda não há números suficientes para calcular indicadores.</p>'));
    d.indicadores.forEach(function (i) {
      ind.appendChild(el('<div class="ind"><div><strong>' + esc(i.nome) + '</strong>' +
        (i.ref ? '<div class="small muted">referência: ' + esc(i.ref) + '</div>' : '') +
        (i.obs ? '<div class="small ' + (i.sinal ? "sinal-" + i.sinal : "muted") + '">' + esc(i.obs) + '</div>' : '') +
        '</div><div class="v ' + (i.sinal ? "sinal-" + i.sinal : "") + '">' + esc(i.valor) + '</div></div>'));
    });
    box.appendChild(ind);

    var g = el('<div class="card card-pad" style="margin-bottom:16px">' +
      '<div class="eyebrow">Gargalos identificados · ordenados por peso</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'Onde a operação <em class="grifo">vaza</em></h2></div>');
    var gargalos = (d.score && d.score.gargalos) || [];
    if (!gargalos.length) g.appendChild(el('<p class="muted small">Os gargalos estruturais são lidos no diagnóstico do Dia 0.</p>'));
    gargalos.forEach(function (x) {
      g.appendChild(el('<div class="garg"><div class="peso">' + x.peso + '</div>' +
        '<div><strong>' + esc(x.rotulo) + '</strong>' +
        '<div class="small muted">Pilar: ' + esc(x.pilar_nome) + '</div></div></div>'));
    });
    box.appendChild(g);

    if (d.nao_informados.length) {
      var ni = el('<div class="card card-pad">' +
        '<div class="eyebrow">Dados que a empresa não acompanha</div>' +
        '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 6px">' +
        'A ausência também é <em class="grifo">diagnóstico</em></h2>' +
        '<p class="small muted" style="margin-bottom:12px">' + d.nao_informados.length +
        ' respostas marcadas como não acompanhadas. Isso mede a maturidade de gestão.</p></div>');
      d.nao_informados.forEach(function (x) {
        ni.appendChild(el('<div class="ind"><div><strong>' + esc(x.label) + '</strong>' +
          '<div class="small muted">' + esc(x.bloco) + '</div></div>' +
          '<div class="small sinal-atencao" style="white-space:nowrap">' + esc(x.motivo) + '</div></div>'));
      });
      box.appendChild(ni);
    }
    return box;
  }

  function painelNotas(d) {
    var a = d.analise || {};
    var card = el('<div class="card card-pad">' +
      '<div class="eyebrow">Uso interno · o cliente nunca vê este conteúdo</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 18px">' +
      'Análise do <em class="grifo">Grupo B3 Sales</em></h2></div>');
    var campos = [
      ["gargalos", "Gargalos priorizados", "Quais gargalos atacar primeiro e por quê."],
      ["prioridades", "Prioridades do ciclo", "O que será implementado neste ciclo."],
      ["proximo_foco", "Próximo foco de implementação", "O que entra no ciclo seguinte."],
      ["notas", "Observações internas", "Contexto, percepções da reunião, alertas."],
    ];
    var refs = {};
    campos.forEach(function (c) {
      card.appendChild(el('<label class="small" style="color:var(--ameixa-700);font-weight:500;' +
        'margin-top:16px;display:block">' + c[1] + '</label>'));
      card.appendChild(el('<p class="small muted" style="margin:2px 0 7px">' + c[2] + '</p>'));
      var ta = document.createElement("textarea");
      ta.value = a[c[0]] || "";
      refs[c[0]] = ta;
      card.appendChild(ta);
    });
    var salvar = el('<button class="btn btn-ouro" style="margin-top:20px">Salvar análise</button>');
    salvar.onclick = function () {
      var body = { cliente_id: d.cliente.id, ciclo: d.ciclo };
      campos.forEach(function (c) { body[c[0]] = refs[c[0]].value; });
      api("/api/admin/analise", body).then(function () { toast("Análise salva"); });
    };
    card.appendChild(salvar);
    if (a.atualizado_em) card.appendChild(el('<p class="small muted" style="margin-top:10px">Última atualização: ' + dataBr(a.atualizado_em) + '</p>'));
    return card;
  }

  function painelHistorico(d) {
    var qm = {};
    d.blocos.forEach(function (b) { b.questions.forEach(function (q) { qm[q.id] = q.label; }); });
    var card = el('<div class="card card-pad">' +
      '<div class="eyebrow">Últimas 60 alterações</div>' +
      '<h2 class="serif" style="font-size:27px;color:var(--ameixa-900);margin:6px 0 14px">' +
      'Histórico de <em class="grifo">preenchimento</em></h2></div>');
    if (!d.historico.length) card.appendChild(el('<p class="muted small">Nenhuma alteração registrada.</p>'));
    d.historico.forEach(function (h) {
      var novo = "";
      try { var o = JSON.parse(h.novo); novo = o && (o.na || (Array.isArray(o.v) ? o.v.join(" · ") : typeof o.v === "object" ? JSON.stringify(o.v) : o.v)); } catch (e) { novo = h.novo; }
      card.appendChild(el('<div class="ind"><div><strong>' + esc(qm[h.qid] || h.qid) + '</strong>' +
        '<div class="small muted" style="white-space:pre-wrap">' + esc(String(novo || "").slice(0, 180)) + '</div></div>' +
        '<div class="small muted" style="white-space:nowrap">' + dataBr(h.em) + '</div></div>'));
    });
    return card;
  }

  /* --------------------------------------------------------- modais */
  function modal(titulo, sub, corpo, acoes) {
    var f = el('<div class="modal-fundo"><div class="modal">' +
      '<div class="modal-cab"><div class="eyebrow">' + esc(sub || "Grupo B3 Sales") + '</div>' +
      '<h2 class="serif" style="font-size:30px;color:var(--ameixa-900);margin:6px 0 0">' +
      titulo + '</h2></div>' +
      '<div class="modal-corpo"></div><div class="modal-pe"></div></div></div>');
    f.querySelector(".modal-corpo").appendChild(corpo);
    var pe = f.querySelector(".modal-pe");
    var fechar = el('<button class="btn btn-fantasma">Cancelar</button>');
    fechar.onclick = function () { f.remove(); };
    pe.appendChild(fechar);
    (acoes || []).forEach(function (b) { pe.appendChild(b); });
    f.onclick = function (e) { if (e.target === f) f.remove(); };
    document.body.appendChild(f);
    var i = f.querySelector("input"); if (i) i.focus();
    return f;
  }

  function campoTexto(id, rot, ph, valor) {
    return '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">' + rot + '</label>' +
      '<input type="text" id="' + id + '" placeholder="' + esc(ph || "") + '" value="' +
      esc(valor || "") + '"></div>';
  }

  function modalNovoCliente() {
    var corpo = el('<div>' +
      campoTexto("m_empresa", "Nome da empresa *", "Razão social ou nome fantasia") +
      campoTexto("m_resp", "Responsável pelo preenchimento", "Nome completo") +
      campoTexto("m_cargo", "Função", "Proprietária, gestora comercial…") +
      campoTexto("m_seg", "Segmento", "Estética e beleza, saúde, serviços…") +
      campoTexto("m_contato", "WhatsApp", "(00) 00000-0000") +
      campoTexto("m_email", "E-mail", "nome@empresa.com.br") +
      '<div class="campo" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Ciclo inicial</label>' +
      '<select id="m_ciclo"></select></div>' +
      '<div><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Validade do link</label>' +
      '<select id="m_val"><option value="0">Sem prazo</option><option value="7">7 dias</option>' +
      '<option value="15">15 dias</option><option value="30">30 dias</option>' +
      '<option value="60">60 dias</option></select></div></div>' +
      '<p class="small muted" style="margin-top:14px">Ao cadastrar, o sistema gera um link individual ' +
      'e exclusivo para esta empresa. O cliente abre o link no navegador e responde sem precisar criar senha.</p>' +
      '</div>');
    var selc = corpo.querySelector("#m_ciclo");
    (S.lista ? S.lista.ciclos : ["Dia 0"]).forEach(function (c) {
      selc.appendChild(el('<option>' + esc(c) + '</option>'));
    });
    var criar = el('<button class="btn btn-ouro">Cadastrar e gerar link</button>');
    var f = modal('Novo <em class="grifo">cliente</em>', "Cadastro", corpo, [criar]);
    criar.onclick = function () {
      var empresa = corpo.querySelector("#m_empresa").value.trim();
      if (!empresa) return toast("Informe o nome da empresa.");
      criar.disabled = true; criar.textContent = "Criando…";
      api("/api/admin/cliente-novo", {
        empresa: empresa,
        responsavel: corpo.querySelector("#m_resp").value,
        cargo: corpo.querySelector("#m_cargo").value,
        segmento: corpo.querySelector("#m_seg").value,
        contato: corpo.querySelector("#m_contato").value,
        email: corpo.querySelector("#m_email").value,
        ciclo: selc.value,
        validade_dias: corpo.querySelector("#m_val").value,
      }).then(function (r) {
        if (r.erro) { criar.disabled = false; criar.textContent = "Cadastrar e gerar link"; return toast(r.erro); }
        f.remove();
        modalLinkPronto(empresa, r.token);
      });
    };
  }

  function modalLinkPronto(empresa, token) {
    var url = linkDe(token);
    var corpo = el('<div>' +
      '<p style="margin-top:0">O link individual de <strong>' + esc(empresa) + '</strong> está pronto. ' +
      'Envie exatamente este endereço para a pessoa responsável.</p>' +
      '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
      'padding:14px;word-break:break-all;font-size:13px;margin:16px 0">' + esc(url) + '</div>' +
      '<div class="aviso small">Este link é exclusivo desta empresa. As respostas salvam sozinhas ' +
      'e a pessoa pode voltar quantas vezes precisar até enviar o diagnóstico.</div></div>');
    var bcopia = el('<button class="btn btn-linha">Copiar link</button>');
    bcopia.onclick = function () { copiar(url); };
    var bzap = el('<a class="btn btn-ouro" target="_blank" rel="noopener" href="https://wa.me/?text=' +
      encodeURIComponent("Olá! Este é o link do seu Diagnóstico Comercial ECO com o Grupo B3 Sales:\n\n" +
        url + "\n\nAs respostas salvam automaticamente, você pode responder com calma e voltar depois pelo mesmo link.") +
      '">Enviar por WhatsApp</a>');
    var bok = el('<button class="btn btn-ameixa">Concluir</button>');
    var f = modal('Link <em class="grifo">gerado</em>', "Pronto para enviar", corpo, [bcopia, bzap, bok]);
    bok.onclick = function () { f.remove(); carregar(); };
    f.querySelector(".modal-pe .btn-fantasma").remove();
  }

  function blocoContrato(c, tipos) {
    var h = '<h3 class="serif" style="font-size:20px;color:var(--ameixa-900);' +
      'margin:24px 0 12px;padding-top:18px;border-top:1px solid var(--linha)">Contrato</h3>' +
      '<div class="campo" style="margin-bottom:14px"><label class="small" ' +
      'style="color:var(--ameixa-700);margin-bottom:5px;display:block">O que foi vendido</label>' +
      '<select id="cl_servico"><option value="">Escolher</option>';
    (tipos || []).forEach(function (t) {
      h += '<option' + (c && c.tipo_servico === t ? " selected" : "") + '>' + esc(t) + '</option>';
    });
    h += '</select></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="campo"><label class="small" style="color:var(--ameixa-700);' +
      'margin-bottom:5px;display:block">Início</label>' +
      '<input type="date" id="cl_ini" value="' + esc((c && c.contrato_inicio) || "") + '"></div>' +
      '<div class="campo"><label class="small" style="color:var(--ameixa-700);' +
      'margin-bottom:5px;display:block">Término</label>' +
      '<input type="date" id="cl_fim" value="' + esc((c && c.contrato_fim) || "") + '"></div>' +
      '</div>' +
      campoTexto("cl_valor", "Valor", "Ex: R$ 3.500 por mês", (c && c.valor_contrato) || "");
    return h;
  }

  function modalEditar(c) {
    var corpo = el('<div>' +
      campoTexto("e_empresa", "Nome da empresa", "", c.empresa) +
      campoTexto("e_resp", "Responsável", "", c.responsavel) +
      campoTexto("e_cargo", "Função", "", c.cargo) +
      campoTexto("e_seg", "Segmento", "", c.segmento) +
      campoTexto("e_contato", "WhatsApp", "", c.contato) +
      campoTexto("e_email", "E-mail", "", c.email) +
      blocoContrato(c, (S.lista && S.lista.tipos_servico) || []) +
      '<div id="cl_contrato_area" style="margin-bottom:14px"></div>' +
      '<label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block;' +
      'margin-top:18px">Observações internas sobre o cliente</label>' +
      '<textarea id="e_obs"></textarea></div>');
    corpo.querySelector("#e_obs").value = c.obs_internas || "";

    /* anexo do contrato */
    var area = corpo.querySelector("#cl_contrato_area");
    var midiaContrato = c.contrato_midia_id || "";
    function pintarContrato() {
      area.innerHTML = "";
      area.appendChild(el('<label class="small" style="color:var(--ameixa-700);' +
        'margin-bottom:6px;display:block">Contrato assinado</label>'));
      if (midiaContrato) {
        area.appendChild(el('<a class="ws-arq" style="margin-bottom:8px" href="/api/midia/' +
          esc(midiaContrato) + '" target="_blank"><span class="ws-arq-i">⇩</span>' +
          '<span>Abrir o contrato</span></a>'));
      }
      area.appendChild(botaoEnviar(midiaContrato ? "↑ Trocar o contrato" : "↑ Anexar o contrato",
        c.id, "contrato", function (r) {
          midiaContrato = r.id; toast("Contrato anexado"); pintarContrato();
        }));
    }
    pintarContrato();

    var salvar = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal('Editar <em class="grifo">cadastro</em>', "Dados do cliente", corpo, [salvar]);
    salvar.onclick = function () {
      api("/api/admin/cliente-editar", {
        id: c.id, empresa: corpo.querySelector("#e_empresa").value,
        responsavel: corpo.querySelector("#e_resp").value,
        cargo: corpo.querySelector("#e_cargo").value,
        segmento: corpo.querySelector("#e_seg").value,
        contato: corpo.querySelector("#e_contato").value,
        email: corpo.querySelector("#e_email").value,
        obs_internas: corpo.querySelector("#e_obs").value,
        tipo_servico: corpo.querySelector("#cl_servico").value,
        contrato_inicio: corpo.querySelector("#cl_ini").value,
        contrato_fim: corpo.querySelector("#cl_fim").value,
        valor_contrato: corpo.querySelector("#cl_valor").value,
        contrato_midia_id: midiaContrato,
      }).then(function () { f.remove(); toast("Cadastro atualizado"); abrirCliente(c.id, S.ciclo); });
    };
  }

  function modalExcluir(c) {
    var corpo = el('<div>' +
      '<div class="aviso erro"><strong>Esta ação não pode ser desfeita.</strong><br>' +
      'Serão apagados definitivamente: todos os ciclos, todas as respostas, o histórico ' +
      'de preenchimento, a análise interna e todos os arquivos enviados por este cliente.</div>' +
      '<p style="margin:18px 0 6px">Se você só quer tirar o cliente da lista principal, ' +
      'use <strong>Arquivar</strong> em vez de excluir.</p>' +
      '<p class="small muted" style="margin:18px 0 6px">Para confirmar, digite o nome da empresa ' +
      'exatamente como está cadastrado:</p>' +
      '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:8px;' +
      'padding:9px 12px;margin-bottom:10px;font-size:13px">' + esc(c.empresa) + '</div>' +
      '<input type="text" id="ex_nome" placeholder="Nome da empresa"></div>');
    var bx = el('<button class="btn btn-perigo">Excluir definitivamente</button>');
    var f = modal('Excluir <em class="grifo">cliente</em>', "Ação irreversível", corpo, [bx]);
    bx.onclick = function () {
      api("/api/admin/cliente-excluir",
          { id: c.id, confirmacao: corpo.querySelector("#ex_nome").value })
        .then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Cliente excluído"); S.rota = "lista"; carregar();
        });
    };
  }

  function modalNovoCiclo(d) {
    var jaTem = d.ciclos.map(function (x) { return x.ciclo; });
    var disp = d.ciclos_possiveis.filter(function (c) { return jaTem.indexOf(c) < 0; });
    if (!disp.length) return toast("Todos os ciclos já foram criados para este cliente.");
    var corpo = el('<div><p style="margin-top:0">Cada ciclo guarda um retrato independente da empresa. ' +
      'Os ciclos anteriores <strong>nunca são apagados</strong>.</p>' +
      '<label class="small" style="color:var(--ameixa-700);margin:14px 0 5px;display:block">Novo ciclo</label>' +
      '<select id="nc_ciclo"></select>' +
      '<label class="small" style="color:var(--ameixa-700);margin:16px 0 5px;display:block">Partir das respostas de</label>' +
      '<select id="nc_copiar"><option value="">Começar em branco</option></select>' +
      '<p class="small muted" style="margin-top:10px">Copiar as respostas anteriores faz o cliente apenas ' +
      'atualizar o que mudou, em vez de responder tudo de novo.</p></div>');
    disp.forEach(function (c) { corpo.querySelector("#nc_ciclo").appendChild(el('<option>' + esc(c) + '</option>')); });
    jaTem.forEach(function (c) { corpo.querySelector("#nc_copiar").appendChild(el('<option>' + esc(c) + '</option>')); });
    var criar = el('<button class="btn btn-ouro">Criar ciclo e gerar link</button>');
    var f = modal('Novo <em class="grifo">ciclo</em>', "Acompanhamento de 180 dias", corpo, [criar]);
    criar.onclick = function () {
      api("/api/admin/ciclo-novo", {
        cliente_id: d.cliente.id, ciclo: corpo.querySelector("#nc_ciclo").value,
        copiar_de: corpo.querySelector("#nc_copiar").value,
      }).then(function (r) {
        if (r.erro) return toast(r.erro);
        f.remove(); modalLinkPronto(d.cliente.empresa, r.token);
      });
    };
  }

  function modalComparar(d) {
    var cs = d.ciclos.map(function (x) { return x.ciclo; });
    var corpo = el('<div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label class="small" style="color:var(--ameixa-700)">De</label><select id="cp_a"></select></div>' +
      '<div><label class="small" style="color:var(--ameixa-700)">Para</label><select id="cp_b"></select></div>' +
      '</div><div id="cp_res" style="margin-top:20px"></div></div>');
    cs.forEach(function (c) {
      corpo.querySelector("#cp_a").appendChild(el('<option>' + esc(c) + '</option>'));
      corpo.querySelector("#cp_b").appendChild(el('<option>' + esc(c) + '</option>'));
    });
    corpo.querySelector("#cp_b").value = cs[cs.length - 1];
    function rodar() {
      var a = corpo.querySelector("#cp_a").value, b = corpo.querySelector("#cp_b").value;
      var res = corpo.querySelector("#cp_res");
      res.innerHTML = '<p class="small muted">Calculando…</p>';
      api("/api/admin/comparar/" + d.cliente.id + "?a=" + encodeURIComponent(a) + "&b=" + encodeURIComponent(b))
        .then(function (r) {
          res.innerHTML = "";
          if (r.score_a && r.score_b) {
            var dif = r.score_b.geral - r.score_a.geral;
            res.appendChild(el('<div class="ind"><div><strong>Score ECO geral</strong></div>' +
              '<div class="v">' + r.score_a.geral + ' → ' + r.score_b.geral +
              ' <span class="' + (dif >= 0 ? "sobe" : "desce") + '">(' +
              (dif >= 0 ? "+" : "") + dif + ')</span></div></div>'));
          }
          if (r.score_a && r.score_b) ["E", "C", "O"].forEach(function (k) {
            var x = r.score_a.pilares[k].score, y = r.score_b.pilares[k].score;
            res.appendChild(el('<div class="ind"><div>' + esc(r.score_a.pilares[k].nome) + '</div>' +
              '<div class="v" style="font-size:16px">' + x + ' → ' + y + ' <span class="' +
              (y >= x ? "sobe" : "desce") + '">(' + (y - x >= 0 ? "+" : "") + (y - x) + ')</span></div></div>'));
          });
          if (!r.linhas.length) { res.appendChild(el('<p class="small muted" style="margin-top:14px">Sem indicadores numéricos comparáveis entre estes ciclos.</p>')); return; }
          var t = el('<table class="cmp" style="margin-top:18px"><thead><tr><th>Indicador</th>' +
            '<th style="text-align:right">' + esc(a) + '</th><th style="text-align:right">' + esc(b) +
            '</th><th style="text-align:right">Evolução</th></tr></thead><tbody></tbody></table>');
          var tb = t.querySelector("tbody");
          r.linhas.forEach(function (l) {
            var ev = l.pct === null || l.pct === undefined ? "—"
              : (l.pct >= 0 ? "+" : "") + l.pct.toFixed(0) + "%";
            tb.appendChild(el('<tr><td>' + esc(l.label) + '</td>' +
              '<td class="num">' + esc(l.a == null ? "—" : l.a) + '</td>' +
              '<td class="num">' + esc(l.b == null ? "—" : l.b) + '</td>' +
              '<td class="num ' + (l.dif > 0 ? "sobe" : l.dif < 0 ? "desce" : "") + '">' + ev + '</td></tr>'));
          });
          res.appendChild(t);
        });
    }
    corpo.querySelector("#cp_a").onchange = rodar;
    corpo.querySelector("#cp_b").onchange = rodar;
    modal('Comparativo entre <em class="grifo">ciclos</em>', "Evolução de 180 dias", corpo, []);
    rodar();
  }


  /* ---------------------------------------------- pessoas com acesso */
  function modalUsuarios() {
    api("/api/admin/usuarios").then(function (r) {
      var corpo = el('<div></div>');
      corpo.appendChild(el('<p class="small muted" style="margin:0 0 16px;line-height:1.7">' +
        'Quem pode entrar nesta área interna. Cada pessoa tem o próprio acesso, ' +
        'então dá para saber quem mexeu em quê.</p>'));
      var lista = el('<div style="margin-bottom:18px"></div>');
      r.usuarios.forEach(function (u) {
        var eu = u.usuario === r.eu;
        var linha = el('<div class="pessoa">' +
          '<div class="pessoa-i">' + esc((u.nome || u.usuario).slice(0, 1).toUpperCase()) + '</div>' +
          '<div class="pessoa-d"><strong>' + esc(u.nome || u.usuario) + '</strong>' +
          '<div class="small muted">' + esc(u.usuario) +
          (u.papel === "dona" ? " · dona" : "") + (eu ? " · você" : "") + '</div>' +
          (u.ultimo_acesso ? '<div class="small" style="color:var(--ouro-700)">último acesso ' +
            dataBr(u.ultimo_acesso) + '</div>' : '<div class="small muted">nunca entrou</div>') +
          '</div></div>');
        var bE = el('<button class="acao-x" title="Editar">✎</button>');
        bE.onclick = function () { modalUsuario(u); };
        linha.appendChild(bE);
        if (!eu) {
          var bX = el('<button class="acao-x" title="Remover">×</button>');
          bX.onclick = function () {
            if (!confirm("Tirar o acesso de " + (u.nome || u.usuario) + "?")) return;
            api("/api/admin/usuario-excluir", { id: u.id }).then(function (res) {
              if (res.erro) return toast(res.erro);
              toast("Acesso removido"); document.querySelector(".modal-fundo").remove();
              modalUsuarios();
            });
          };
          linha.appendChild(bX);
        }
        lista.appendChild(linha);
      });
      corpo.appendChild(lista);
      var bAdd = el('<button class="btn btn-ouro" style="width:100%">+ Dar acesso a alguém</button>');
      bAdd.onclick = function () { modalUsuario(null); };
      corpo.appendChild(bAdd);
      modal("Pessoas com acesso", "Área interna", corpo);
    });
  }

  function modalUsuario(u) {
    u = u || {};
    var corpo = el('<div>' +
      campoTexto("us_nome", "Nome da pessoa", "Ex: Camila Bueno", u.nome) +
      campoTexto("us_user", "Nome de acesso", "sem espaços, ex: camila", u.usuario) +
      campoTexto("us_mail", "E-mail", "nome@b3sales.com.br", u.email) +
      '<div class="campo"><label class="small" style="color:var(--ameixa-700);' +
      'margin-bottom:5px;display:block">' +
      (u.id ? "Nova senha (deixe em branco para manter)" : "Senha (mínimo 8 caracteres)") +
      '</label><input type="password" id="us_senha"></div>' +
      '</div>');
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(u.id ? "Editar acesso" : "Dar acesso", "Área interna", corpo, [bs]);
    bs.onclick = function () {
      var usuario = f.querySelector("#us_user").value.trim();
      if (!usuario) return toast("Informe o nome de acesso");
      api("/api/admin/usuario-salvar", { id: u.id, usuario: usuario,
        nome: f.querySelector("#us_nome").value, email: f.querySelector("#us_mail").value,
        senha: f.querySelector("#us_senha").value, papel: u.papel || "admin", ativo: 1 })
        .then(function (res) {
          if (res.erro) return toast(res.erro);
          f.remove();
          var m = document.querySelector(".modal-fundo"); if (m) m.remove();
          toast("Acesso salvo"); modalUsuarios();
        });
    };
  }

  function modalConfig() {
    api("/api/admin/config").then(function (cfg) {
      var base = location.origin;
      var corpo = el('<div>' +
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:6px">Acesso da equipe</h3>' +
        campoTexto("cf_user", "Usuário", "", cfg.usuario) +
        '<div class="campo" style="margin-bottom:14px"><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Senha atual</label>' +
        '<input type="password" id="cf_atual"></div>' +
        '<div class="campo"><label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">Nova senha (mínimo 8 caracteres)</label>' +
        '<input type="password" id="cf_nova"></div>' +
        '<hr class="filete">' +
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:6px">Chave de leitura dos dados</h3>' +
        '<p class="small muted">Use esta chave quando quiser que a análise seja feita a partir dos dados ' +
        'do sistema. Ela dá acesso somente de leitura. Trate como uma senha.</p>' +
        '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
        'padding:12px;word-break:break-all;font-size:12px;margin:12px 0"><strong>' + esc(cfg.api_key) + '</strong></div>' +
        '<p class="small muted">Endereço completo:</p>' +
        '<div style="background:var(--creme-2);border:1px solid var(--linha-2);border-radius:10px;' +
        'padding:12px;word-break:break-all;font-size:11.5px">' + esc(base) + '/api/dados?chave=' + esc(cfg.api_key) + '</div>' +
        '</div>');
      var bch = el('<button class="btn btn-linha">Copiar endereço</button>');
      bch.onclick = function () { copiar(base + "/api/dados?chave=" + cfg.api_key, "Endereço copiado"); };
      var bsv = el('<button class="btn btn-ouro">Salvar senha</button>');
      var f = modal('Configurações', "Sistema", corpo, [bch, bsv]);
      bsv.onclick = function () {
        api("/api/admin/senha", {
          usuario: corpo.querySelector("#cf_user").value,
          atual: corpo.querySelector("#cf_atual").value,
          nova: corpo.querySelector("#cf_nova").value,
        }).then(function (r) {
          if (r.erro) return toast(r.erro);
          f.remove(); toast("Senha atualizada");
        });
      };
    });
  }

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
  api("/api/admin/sessao").then(function (s) { s.logado ? abrirPainel() : telaLogin(); })
    .catch(function () { telaLogin("Não foi possível conectar ao servidor."); });
})();
