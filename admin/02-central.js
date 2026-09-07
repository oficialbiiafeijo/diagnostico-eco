  /* ------------------------------------------------- Central de Ação */
  var CF = { aberto: "1" };

  function abrirCentral(cid) {
    S.rota = "central";
    if (cid !== undefined) CF.cliente = cid || "";
    var q = Object.keys(CF).filter(function (k) { return CF[k]; })
      .map(function (k) { return k + "=" + encodeURIComponent(CF[k]); }).join("&");
    api("/api/admin/central" + (q ? "?" + q : "")).then(function (d) {
      if (d.erro) return toast(d.erro);
      shell(telaCentral(d));
    });
  }

  function telaCentral(d) {
    var wrap = document.createElement("div");
    wrap.appendChild(el('<div class="painel-topo"><div>' +
      '<div class="eyebrow">Uso interno · o cliente nunca vê esta tela</div>' +
      '<h1 class="serif">Central de <em class="grifo">Ação</em></h1>' +
      '<p class="muted small" style="margin-top:6px">Tudo que precisa ser executado, ' +
      'cobrado ou acompanhado. Nada aqui é cópia: mudar o prazo ou o status muda ' +
      'na aba de onde a tarefa veio.</p></div></div>'));

    var r = d.resumo;
    var kp = el('<div class="kpis"></div>');
    [["Tarefas no total", r.total, ""],
     ["Concluídas", r.concluidas || r.concluidos, ""],
     ["Em andamento", r.andamento, ""],
     ["Atrasadas", r.atrasados, r.atrasados ? "kpi-alerta" : ""],
     ["Esperando o cliente", r.do_cliente, ""],
     ["Esperando a B3 Sales", r.da_casa, ""]
    ].forEach(function (x) {
      kp.appendChild(el('<div class="kpi ' + x[2] + '"><b>' + (x[1] || 0) + '</b>' +
        '<span>' + x[0] + '</span></div>'));
    });
    wrap.appendChild(kp);

    if (r.proxima_acao) {
      wrap.appendChild(el('<div class="ca-proximo">' +
        '<span class="eyebrow">Próxima ação</span>' +
        '<strong>' + esc(r.proxima_acao) + '</strong>' +
        (r.proximo_prazo ? '<span class="ca-prazo">prazo ' +
          dataCurta(r.proximo_prazo) + '</span>' : '') + '</div>'));
    }

    /* filtros */
    var fl = el('<div class="ca-filtros"></div>');
    function sel(chave, rotulo, lista, valores) {
      var s2 = document.createElement("select");
      s2.appendChild(el('<option value="">' + rotulo + '</option>'));
      lista.forEach(function (x, i) {
        var v = valores ? valores[i] : x;
        var o = el('<option value="' + esc(v) + '">' + esc(x) + '</option>');
        if (CF[chave] === v) o.selected = true;
        s2.appendChild(o);
      });
      s2.onchange = function () { CF[chave] = s2.value; abrirCentral(); };
      fl.appendChild(s2);
    }
    sel("cliente", "Todos os clientes",
        d.clientes.map(function (c) { return c.empresa; }),
        d.clientes.map(function (c) { return c.id; }));
    sel("status", "Qualquer situação", d.status.concat(["Atrasado"]));
    sel("prioridade", "Qualquer prioridade", d.prioridades);
    sel("lado", "De quem depende", ["Do cliente", "Da B3 Sales"],
        ["cliente", "b3sales"]);
    sel("origem", "Qualquer origem",
        Object.keys(d.origens).map(function (k) { return d.origens[k]; }),
        Object.keys(d.origens));
    sel("tipo", "Qualquer tipo", d.tipos);
    sel("ciclo", "Qualquer ciclo", d.ciclos);
    sel("pilar", "Qualquer pilar", ["Estratégia", "Condução", "Operação"],
        ["E", "C", "O"]);

    var busca = el('<input type="text" placeholder="Buscar no título" ' +
      'style="min-width:180px">');
    busca.value = CF.busca || "";
    busca.onkeydown = function (e) {
      if (e.key === "Enter") { CF.busca = busca.value; abrirCentral(); }
    };
    fl.appendChild(busca);

    var soAberto = el('<label class="ca-check"><input type="checkbox"' +
      (CF.aberto ? " checked" : "") + '> <span>Só o que está em aberto</span></label>');
    soAberto.querySelector("input").onchange = function (e) {
      CF.aberto = e.target.checked ? "1" : ""; abrirCentral();
    };
    fl.appendChild(soAberto);

    var bLimpa = el('<button class="btn btn-fantasma btn-sm">Limpar filtros</button>');
    bLimpa.onclick = function () { CF = { aberto: "1" }; abrirCentral(); };
    fl.appendChild(bLimpa);

    var bNovo = el('<button class="btn btn-ameixa btn-sm">+ Novo registro</button>');
    bNovo.onclick = function () { modalRegistro(null, d); };
    fl.appendChild(bNovo);
    wrap.appendChild(fl);

    /* a lista */
    var lista = el('<div class="ca-lista"></div>');
    if (!d.itens.length) {
      lista.appendChild(el('<div class="card card-pad"><p class="muted">' +
        'Nada por aqui com estes filtros. Tire algum filtro ou crie o primeiro ' +
        'registro.</p></div>'));
    }
    d.itens.forEach(function (i) {
      var lin = el('<div class="ca-i' + (i.atrasado ? " atrasada" : "") + '"></div>');
      lin.appendChild(el('<span class="ca-pr ca-pr-' +
        (i.prioridade || "Média").toLowerCase().replace("é", "e") + '" title="' +
        esc(i.prioridade) + '"></span>'));
      var meio = el('<div class="ca-meio"></div>');
      meio.appendChild(el('<strong>' + esc(i.titulo) + '</strong>'));
      var etq = el('<div class="ca-etq"></div>');
      etq.appendChild(el('<span class="ca-tag">' + esc(i.origem_nome) + '</span>'));
      if (i.cliente_nome) {
        etq.appendChild(el('<span class="ca-tag ca-tag-cli">' +
          esc(i.cliente_nome) + '</span>'));
      }
      if (i.ciclo) etq.appendChild(el('<span class="ca-tag">' + esc(i.ciclo) + '</span>'));
      if (i.pilar_nome) {
        etq.appendChild(el('<span class="ca-tag">' + esc(i.pilar_nome) + '</span>'));
      }
      etq.appendChild(el('<span class="ca-tag ca-lado-' + i.lado + '">' +
        (i.lado === "cliente" ? "com o cliente" : "com a B3 Sales") + '</span>'));
      if (i.responsavel) {
        etq.appendChild(el('<span class="ca-tag">' + esc(i.responsavel) + '</span>'));
      }
      meio.appendChild(etq);
      lin.appendChild(meio);

      var dir = el('<div class="ca-dir"></div>');
      if (i.atrasado) {
        dir.appendChild(el('<span class="ca-atraso">atrasada há ' + i.dias_atraso +
          (i.dias_atraso === 1 ? " dia" : " dias") + '</span>'));
      } else if (i.prazo) {
        dir.appendChild(el('<span class="ca-prazo">' + dataCurta(i.prazo) + '</span>'));
      }
      var st = document.createElement("select");
      st.className = "ca-st";
      d.status.forEach(function (x) {
        var o = el('<option value="' + esc(x) + '">' + esc(x) + '</option>');
        if (i.status === x) o.selected = true;
        st.appendChild(o);
      });
      st.onchange = function () {
        api("/api/admin/central-salvar", { id: i.id, status: st.value })
          .then(function (rr) {
            if (rr.erro) return toast(rr.erro);
            toast("Atualizado na origem"); abrirCentral();
          });
      };
      dir.appendChild(st);
      var bE = el('<button class="btn btn-fantasma btn-sm">Abrir</button>');
      bE.onclick = function () { modalRegistro(i, d); };
      dir.appendChild(bE);
      lin.appendChild(dir);
      lista.appendChild(lin);
    });
    wrap.appendChild(lista);

    wrap.appendChild(blocoNotas(d));
    return wrap;
  }

  /* Ficha de um item, seja ele da rota, dos materiais ou criado aqui. */
  function modalRegistro(item, d) {
    var novo = !item;
    var daOrigem = item && item.origem !== "registro";
    var corpo = el('<div>' +
      (daOrigem ? '<div class="aviso"><strong>Este item vive em ' +
        esc(item.origem_nome) + '.</strong><br>O que você mudar aqui muda lá também, ' +
        'porque não existe cópia.</div>' : '') +
      campoTexto("rg_titulo", "Título", "", item ? item.titulo : "") +
      '<label class="small ca-lb">Descrição</label><textarea id="rg_desc"></textarea>' +
      '<div class="ca-dupla">' +
      '<div><label class="small ca-lb">Tipo</label><select id="rg_tipo"></select></div>' +
      '<div><label class="small ca-lb">Cliente</label><select id="rg_cli"></select></div>' +
      '</div><div class="ca-dupla">' +
      '<div><label class="small ca-lb">Situação</label><select id="rg_st"></select></div>' +
      '<div><label class="small ca-lb">Prioridade</label><select id="rg_pr"></select></div>' +
      '</div><div class="ca-dupla">' +
      '<div><label class="small ca-lb">Prazo</label>' +
      '<input type="date" id="rg_prazo"></div>' +
      '<div><label class="small ca-lb">Responsável</label>' +
      '<input type="text" id="rg_resp" placeholder="Nome de quem executa"></div>' +
      '</div><div class="ca-dupla">' +
      '<div><label class="small ca-lb">Ciclo</label><select id="rg_ciclo"></select></div>' +
      '<div><label class="small ca-lb">Pilar do método</label>' +
      '<select id="rg_pilar"></select></div>' +
      '</div>' +
      '<label class="small ca-lb">De quem depende</label><select id="rg_lado">' +
      '<option value="b3sales">Da B3 Sales</option>' +
      '<option value="cliente">Do cliente</option></select>' +
      '<div id="rg_anexos"></div><div id="rg_hist"></div></div>');

    function encher(id, lista, valores, atual, vazio) {
      var s2 = corpo.querySelector(id);
      if (vazio) s2.appendChild(el('<option value="">' + vazio + '</option>'));
      lista.forEach(function (x, n) {
        var v = valores ? valores[n] : x;
        var o = el('<option value="' + esc(v) + '">' + esc(x) + '</option>');
        if (atual === v) o.selected = true;
        s2.appendChild(o);
      });
    }
    encher("#rg_tipo", d.tipos, null, item ? item.tipo : "Tarefa");
    encher("#rg_cli", d.clientes.map(function (c) { return c.empresa; }),
           d.clientes.map(function (c) { return c.id; }),
           item ? item.cliente_id : (CF.cliente || ""), "Sem cliente");
    encher("#rg_st", d.status, null, item ? item.status : "Não iniciado");
    encher("#rg_pr", d.prioridades, null, item ? item.prioridade : "Média");
    encher("#rg_ciclo", d.ciclos, null, item ? item.ciclo : "", "Sem ciclo");
    encher("#rg_pilar", ["Estratégia", "Condução", "Operação"], ["E", "C", "O"],
           item ? item.pilar : "", "Sem pilar");
    corpo.querySelector("#rg_desc").value = item ? (item.descricao || "") : "";
    corpo.querySelector("#rg_prazo").value = item && item.prazo ?
      String(item.prazo).slice(0, 10) : "";
    corpo.querySelector("#rg_resp").value = item ? (item.responsavel || "") : "";
    corpo.querySelector("#rg_lado").value = item ? item.lado : "b3sales";
    if (daOrigem) corpo.querySelector("#rg_cli").disabled = true;

    /* Anexos em qualquer item. O arquivo é guardado onde o item mora:
       no registro, na ação, ou como bloco dentro da página. Nunca num
       segundo lugar só da Central. */
    var anexados = (item && item.anexos ? item.anexos.slice() : []);
    var ax = corpo.querySelector("#rg_anexos");
    ax.appendChild(el('<label class="small ca-lb">Anexos</label>'));
    if (daOrigem) {
      ax.appendChild(el('<p class="small muted" style="margin:0 0 8px">' +
        'O arquivo é guardado em ' + esc(item.origem_nome) +
        ', então aparece lá também.</p>'));
    }
    var listaAx = el('<div class="fala-ax-lista"></div>');
    function pintarAx() {
      listaAx.innerHTML = "";
      if (!anexados.length) {
        listaAx.appendChild(el('<span class="small muted">Nenhum arquivo ainda.</span>'));
      }
      anexados.forEach(function (a, n) {
        var t = el('<span class="fala-ax-t"><a href="/api/midia/' + esc(a.id) +
          '" target="_blank" rel="noopener">' + esc(a.nome) + '</a>' +
          ' <button type="button" title="Tirar">×</button></span>');
        t.querySelector("button").onclick = function () {
          if (item) {
            api("/api/admin/central-anexar",
                { id: item.id, midia_id: a.id, remover: true }).then(function (rr) {
              if (rr.erro) return toast(rr.erro);
              anexados.splice(n, 1); pintarAx(); toast("Arquivo retirado");
            });
          } else { anexados.splice(n, 1); pintarAx(); }
        };
        listaAx.appendChild(t);
      });
    }
    pintarAx();
    ax.appendChild(listaAx);
    var envAx = botaoEnviar("↑ Anexar arquivo",
      (item ? item.cliente_id : corpo.querySelector("#rg_cli").value) || null,
      "central", function (rr) {
        if (!item) { anexados.push({ id: rr.id, nome: rr.nome }); pintarAx(); return; }
        api("/api/admin/central-anexar", { id: item.id, midia_id: rr.id })
          .then(function (x) {
            if (x.erro) return toast(x.erro);
            anexados.push({ id: rr.id, nome: rr.nome }); pintarAx();
            toast("Arquivo anexado");
          });
      });
    envAx.style.marginTop = "9px";
    ax.appendChild(envAx);

    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var acoes = [bs];
    if (item && item.origem === "registro") {
      var bx = el('<button class="btn btn-fantasma" style="color:var(--critico)">' +
        'Apagar</button>');
      bx.onclick = function () {
        if (!confirm("Apagar este registro?")) return;
        api("/api/admin/central-apagar", { id: item.id }).then(function () {
          f.remove(); toast("Registro apagado"); abrirCentral();
        });
      };
      acoes.unshift(bx);
    }
    var f = modal(novo ? "Novo registro" : "Ficha do item",
                  "Central de Ação", corpo, acoes);

    if (item) {
      var hx = corpo.querySelector("#rg_hist");
      api("/api/admin/central-historico?item=" + encodeURIComponent(item.id))
        .then(function (h) {
          if (!(h.historico || []).length) return;
          hx.appendChild(el('<hr class="filete">'));
          hx.appendChild(el('<div class="eyebrow">O que já mudou</div>'));
          h.historico.forEach(function (x) {
            hx.appendChild(el('<div class="ca-h"><span>' + esc(x.campo) + '</span>' +
              '<b>' + esc(String(x.anterior || "vazio").slice(0, 40)) + ' → ' +
              esc(String(x.novo || "vazio").slice(0, 40)) + '</b>' +
              '<i>' + dataBr(x.em) + (x.usuario ? " · " + esc(x.usuario) : "") +
              '</i></div>'));
          });
        });
    }

    bs.onclick = function () {
      var corpoEnvio = {
        titulo: corpo.querySelector("#rg_titulo").value,
        descricao: corpo.querySelector("#rg_desc").value,
        tipo: corpo.querySelector("#rg_tipo").value,
        status: corpo.querySelector("#rg_st").value,
        prioridade: corpo.querySelector("#rg_pr").value,
        prazo: corpo.querySelector("#rg_prazo").value,
        responsavel: corpo.querySelector("#rg_resp").value,
        ciclo: corpo.querySelector("#rg_ciclo").value,
        pilar: corpo.querySelector("#rg_pilar").value,
        lado: corpo.querySelector("#rg_lado").value,
        midia_ids: anexados.map(function (a) { return a.id; })
      };
      if (item) corpoEnvio.id = item.id;
      else corpoEnvio.cliente_id = corpo.querySelector("#rg_cli").value;
      api("/api/admin/central-salvar", corpoEnvio).then(function (rr) {
        if (rr.erro) return toast(rr.erro);
        f.remove(); toast(novo ? "Registro criado" : "Salvo na origem");
        abrirCentral();
      });
    };
  }

  /* Notas livres, no espírito do Notas do Mac. */
  function blocoNotas(d) {
    var cx = el('<div class="card card-pad" style="margin-top:22px">' +
      '<div class="q-cab"><div><div class="eyebrow">Uso interno</div>' +
      '<h2 class="serif tit-card" style="margin-bottom:2px">Notas da ' +
      '<em class="grifo">equipe</em></h2>' +
      '<p class="small muted" style="margin:0">Resumo de reunião, print, link, ' +
      'observação estratégica. Fica só entre vocês.</p></div></div></div>');
    var bN = el('<button class="btn btn-linha btn-sm">+ Nova nota</button>');
    bN.onclick = function () { modalNota(null); };
    cx.querySelector(".q-cab").appendChild(bN);

    var lista = el('<div class="ca-notas"></div>');
    if (!(d.notas || []).length) {
      lista.appendChild(el('<p class="small muted">Nenhuma nota ainda.</p>'));
    }
    (d.notas || []).forEach(function (n) {
      var it = el('<div class="ca-nota' + (n.fixada ? " fixada" : "") + '">' +
        '<strong>' + esc(n.titulo || "Sem título") + '</strong>' +
        '<p>' + esc(String(n.corpo || "").slice(0, 320)) + '</p>' +
        '<i>' + dataBr(n.atualizado_em) + '</i></div>');
      it.onclick = function () { modalNota(n); };
      lista.appendChild(it);
    });
    cx.appendChild(lista);
    return cx;
  }

  function modalNota(n) {
    var corpo = el('<div>' +
      campoTexto("nt_t", "Título", "Reunião do dia, alerta, decisão…",
                 n ? n.titulo : "") +
      '<label class="small ca-lb">Nota</label>' +
      '<textarea id="nt_c" style="min-height:220px"></textarea>' +
      '<label class="ws-vis" style="margin-top:12px"><input type="checkbox" id="nt_f"> ' +
      '<span>Deixar fixada no topo</span></label></div>');
    corpo.querySelector("#nt_c").value = n ? (n.corpo || "") : "";
    corpo.querySelector("#nt_f").checked = !!(n && n.fixada);
    var bs = el('<button class="btn btn-ouro">Salvar</button>');
    var acoes = [bs];
    if (n) {
      var bx = el('<button class="btn btn-fantasma" style="color:var(--critico)">' +
        'Apagar</button>');
      bx.onclick = function () {
        if (!confirm("Apagar esta nota?")) return;
        api("/api/admin/central-nota", { id: n.id, apagar: true })
          .then(function () { f.remove(); toast("Nota apagada"); abrirCentral(); });
      };
      acoes.unshift(bx);
    }
    var f = modal(n ? "Nota" : "Nova nota", "Central de Ação", corpo, acoes);
    bs.onclick = function () {
      var b = { titulo: corpo.querySelector("#nt_t").value,
                corpo: corpo.querySelector("#nt_c").value,
                fixada: corpo.querySelector("#nt_f").checked,
                cliente_id: CF.cliente || "" };
      if (n) b.id = n.id;
      api("/api/admin/central-nota", b).then(function () {
        f.remove(); toast("Nota salva"); abrirCentral();
      });
    };
  }

  /* Atalho para ver o sistema pelos olhos de qualquer cliente. */
  function modalModoCliente() {
    var corpo = el('<div><p style="margin-top:0">Abra o acompanhamento exatamente ' +
      'como o cliente vê. Nada da sua análise interna aparece por lá.</p>' +
      '<div id="mc_lista" style="margin-top:16px"></div></div>');
    modal("Modo cliente", "Ver como ele vê", corpo);
    var lista = corpo.querySelector("#mc_lista");
    lista.appendChild(el('<p class="small muted">Carregando…</p>'));
    api("/api/admin/clientes").then(function (d) {
      lista.innerHTML = "";
      var cs = (d.clientes || []);
      if (!cs.length) {
        lista.appendChild(el('<p class="small muted">Nenhum cliente cadastrado.</p>'));
        return;
      }
      cs.forEach(function (c) {
        var aberto = c.portal_ativo && c.token_portal;
        var it = el('<div class="mc-i"><div class="fc-foto" style="' +
          estiloLogo(c, 36) + '">' +
          (c.logo_midia_id ? '' : esc((c.empresa || "?").slice(0, 1).toUpperCase())) +
          '</div><div class="fc-t"><strong>' + esc(c.empresa) + '</strong>' +
          '<p>' + (aberto ? "Acompanhamento aberto"
                          : "Acompanhamento ainda fechado") + '</p></div></div>');
        if (aberto) {
          var a = el('<a class="btn btn-linha btn-sm" target="_blank" rel="noopener" ' +
            'href="' + esc(location.origin + "/c/" + c.token_portal) + '">Abrir →</a>');
          it.appendChild(a);
        } else {
          var b = el('<button class="btn btn-ouro btn-sm">Abrir para ele</button>');
          b.onclick = function () {
            api("/api/admin/portal", { cliente_id: c.id, ativo: true }).then(function (r) {
              if (r.erro) return toast(r.erro);
              window.open(location.origin + "/c/" + r.token, "_blank");
              toast("Acompanhamento liberado");
            });
          };
          it.appendChild(b);
        }
        lista.appendChild(it);
      });
    });
  }

