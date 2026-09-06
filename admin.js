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
      '<div class="marca" style="margin-bottom:26px"><div class="marca-b">B</div>' +
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
      '<div class="marca"><div class="marca-b">B</div><div><div class="marca-txt">Sales</div>' +
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
    var bu = el('<button class="btn btn-fantasma btn-sm">Pessoas com acesso</button>');
    bu.onclick = modalUsuarios;
    dir.appendChild(bu);
    var bc = el('<button class="btn btn-fantasma btn-sm">Configurações</button>');
    bc.onclick = modalConfig;
    var bs = el('<button class="btn btn-fantasma btn-sm">Sair</button>');
    bs.onclick = function () { api("/api/admin/sair", {}).then(function () { telaLogin(); }); };
    dir.appendChild(bp); dir.appendChild(bc); dir.appendChild(bs);
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
      campoTexto("ac_resp", "Quem é o responsável", "Nome da pessoa", a.responsavel) +
      '</div>');
    if ((equipe || []).length) {
      var dica = el('<p class="small muted" style="margin:-8px 0 14px">Equipe: ' +
        equipe.map(function (p) { return esc(p.nome); }).join(" · ") + '</p>');
      corpo.appendChild(dica);
    }
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var f = modal(a.id ? "Editar ação" : "Nova ação", "Rota do " + ciclo, corpo, [bs]);
    bs.onclick = function () {
      var t = f.querySelector("#ac_tit").value.trim();
      if (!t) return toast("Escreva o que precisa ser feito");
      api("/api/admin/acao-salvar", { cliente_id: cid, ciclo: ciclo, id: a.id, titulo: t,
        detalhe: f.querySelector("#ac_det").value, responsavel: f.querySelector("#ac_resp").value,
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

  function blocoTexto(b, tag, place) {
    var t = document.createElement("textarea");
    t.className = "ws-t " + tag;
    t.rows = 1;
    t.placeholder = place;
    t.value = b.conteudo.texto || "";
    t.oninput = function () { b.conteudo.texto = t.value; autoAltura(t); salvarBloco(b); };
    setTimeout(function () { autoAltura(t); }, 0);
    return t;
  }

  function desenharBloco(b, pag, redesenhar) {
    var box = el('<div class="ws-bloco" data-id="' + b.id + '"></div>');
    var corpo = el('<div class="ws-corpo"></div>');

    if (b.tipo === "titulo") {
      corpo.appendChild(blocoTexto(b, "ws-titulo", "Título da seção"));

    } else if (b.tipo === "texto") {
      corpo.appendChild(blocoTexto(b, "", "Escreva aqui"));

    } else if (b.tipo === "destaque") {
      var d = el('<div class="ws-destaque"></div>');
      d.appendChild(blocoTexto(b, "", "O que não pode ser esquecido"));
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
      var atual = (pag.anexos || []).filter(function (a) { return a.id === b.conteudo.anexo_id; })[0];
      if (atual && ehImg) {
        cx.appendChild(el('<img class="ws-img" src="/api/anexo/' + esc(atual.id) + '" alt="">'));
      } else if (atual) {
        cx.appendChild(el('<a class="ws-arq" href="/api/anexo/' + esc(atual.id) + '" target="_blank">' +
          '<span class="ws-arq-i">⇩</span><span>' + esc(atual.nome) + '</span></a>'));
      }
      var sel = document.createElement("select");
      sel.appendChild(el('<option value="">Escolher um arquivo já enviado</option>'));
      (pag.anexos || []).forEach(function (a) {
        if (ehImg && !/^image\//.test(a.tipo || "")) return;
        var o = document.createElement("option");
        o.value = a.id; o.textContent = a.nome;
        if (a.id === b.conteudo.anexo_id) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = function () {
        b.conteudo.anexo_id = sel.value;
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
      if (!(pag.anexos || []).length) {
        cx.appendChild(el('<p class="small muted">Nenhum arquivo enviado ainda para este cliente. ' +
          'Os anexos que o cliente mandar no diagnóstico aparecem aqui.</p>'));
      }
      corpo.appendChild(cx);

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
    var wrap = document.createElement("div");
    CAPA_CSS = {};
    dados.capas.forEach(function (c) { CAPA_CSS[c.id] = c.css; });

    var volta = el('<button class="btn btn-linha btn-sm">← Voltar ao cliente</button>');
    volta.onclick = function () { abrirCliente(cid); };
    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Materiais e metodologia</div>' +
      '<h1 class="serif">O que já <em class="grifo">entregamos</em></h1></div>' +
      '<div style="display:flex;gap:10px;align-items:center"></div></div>'));
    var acoesTopo = wrap.querySelector(".painel-topo > div:last-child");
    acoesTopo.appendChild(el('<span id="ws_salvo" class="ws-salvo">Salvo</span>'));
    acoesTopo.appendChild(volta);

    var grade = el('<div class="ws-grade"></div>');

    /* coluna das páginas */
    var lat = el('<div class="ws-lateral"><div class="eyebrow" style="margin-bottom:10px">Páginas</div></div>');
    dados.paginas.forEach(function (pg) {
      var it = el('<div class="ws-pag' + (pg.id === paginaId ? " at" : "") + '">' +
        '<span class="ws-pag-capa" style="background:' + (CAPA_CSS[pg.capa] || "var(--creme-3)") + '"></span>' +
        '<span class="ws-pag-t">' + esc(pg.titulo) + '</span>' +
        (pg.visivel_cliente ? '<span class="ws-olho" title="O cliente vê esta página">◉</span>' : '') +
        '</div>');
      it.onclick = function () { abrirMateriais(cid, pg.id); };
      lat.appendChild(it);
    });
    if (!dados.paginas.length) {
      lat.appendChild(el('<p class="small muted">Nenhuma página ainda.</p>'));
      var bm = el('<button class="btn btn-ouro btn-sm" style="width:100%;margin-top:10px">Criar a estrutura sugerida</button>');
      bm.onclick = function () {
        api("/api/admin/ws-modelo", { cliente_id: cid }).then(function () {
          toast("Estrutura criada"); abrirMateriais(cid);
        });
      };
      lat.appendChild(bm);
    }
    var bnova = el('<button class="btn btn-linha btn-sm" style="width:100%;margin-top:10px">+ Nova página</button>');
    bnova.onclick = function () {
      var t = prompt("Nome da página:", "Nova página");
      if (t === null) return;
      api("/api/admin/ws-pagina", { cliente_id: cid, titulo: t || "Nova página" })
        .then(function (r) { abrirMateriais(cid, r.id); });
    };
    lat.appendChild(bnova);
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
      function redesenhar() { abrirMateriais(cid, paginaId); }

      /* capa */
      var capa = el('<div class="ws-capa" style="background:' +
        (CAPA_CSS[pag.capa] || "var(--creme-3)") + '"></div>');
      var trocar = el('<div class="ws-capa-troca"></div>');
      dados.capas.forEach(function (c) {
        var b = el('<button type="button" title="' + esc(c.nome) + '" style="background:' + c.css + '"></button>');
        b.onclick = function () {
          api("/api/admin/ws-pagina", { id: paginaId, capa: c.id }).then(redesenhar);
        };
        trocar.appendChild(b);
      });
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
      var vis = el('<label class="ws-vis"><input type="checkbox"' +
        (pag.visivel_cliente ? " checked" : "") + '> <span>O cliente pode ver esta página</span></label>');
      vis.querySelector("input").onchange = function (e) {
        api("/api/admin/ws-pagina", { id: paginaId, visivel_cliente: e.target.checked ? 1 : 0 })
          .then(function () { pisca(e.target.checked ? "Visível ao cliente" : "Só interno"); });
      };
      cab.appendChild(vis);
      col.appendChild(cab);

      /* blocos */
      var lista = el('<div class="ws-blocos"></div>');
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
          toast("Página excluída"); abrirMateriais(cid);
        });
      };
      col.appendChild(bex);
    });
    return wrap;
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

    /* carteira detalhada */
    var tab = el('<div class="card" style="overflow:hidden;margin-top:18px">' +
      '<div class="card-pad" style="padding-bottom:0"><div class="eyebrow">Carteira</div>' +
      '<h2 class="serif tit-card">Cada cliente, <em class="grifo">em uma linha</em></h2></div>' +
      '<div style="overflow-x:auto"><table class="lista"><thead><tr>' +
      '<th>Cliente</th><th>Ciclo</th><th>Progresso</th><th>Pilar de entrada</th>' +
      '<th>Ações</th><th>Materiais</th></tr></thead><tbody></tbody></table></div></div>');
    var tb = tab.querySelector("tbody");
    d.jornada.forEach(function (j) {
      var tr = el('<tr>' +
        '<td><span class="emp">' + esc(j.empresa) + '</span>' +
        '<div class="small muted">' + esc(j.segmento || "Sem segmento") + '</div></td>' +
        '<td>' + esc(j.ciclo) + '</td>' +
        '<td><div class="mini-barra"><i style="width:' + (j.progresso || 0) + '%"></i></div>' +
        '<span class="small muted">' + (j.progresso || 0) + '%</span></td>' +
        '<td>' + (j.entrada ? '<span class="selo selo-entrada">' + esc(j.entrada) + '</span>' :
          '<span class="small muted">aguardando</span>') + '</td>' +
        '<td>' + j.acoes_feitas + ' de ' + j.acoes + '</td>' +
        '<td>' + (j.documentos + j.paginas) + '</td></tr>');
      tr.style.cursor = "pointer";
      tr.onclick = function () { abrirCliente(j.id); };
      tb.appendChild(tr);
    });
    if (!d.jornada.length) {
      tab.querySelector("tbody").appendChild(el('<tr><td colspan="6" class="small muted" ' +
        'style="padding:22px">Nenhum cliente ativo ainda.</td></tr>'));
    }
    wrap.appendChild(tab);
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

  function modalEditar(c) {
    var corpo = el('<div>' +
      campoTexto("e_empresa", "Nome da empresa", "", c.empresa) +
      campoTexto("e_resp", "Responsável", "", c.responsavel) +
      campoTexto("e_cargo", "Função", "", c.cargo) +
      campoTexto("e_seg", "Segmento", "", c.segmento) +
      campoTexto("e_contato", "WhatsApp", "", c.contato) +
      campoTexto("e_email", "E-mail", "", c.email) +
      '<label class="small" style="color:var(--ameixa-700);margin-bottom:5px;display:block">' +
      'Observações internas sobre o cliente</label><textarea id="e_obs"></textarea></div>');
    corpo.querySelector("#e_obs").value = c.obs_internas || "";
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
