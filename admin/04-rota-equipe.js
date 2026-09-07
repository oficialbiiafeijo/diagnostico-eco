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
            esc(a.responsavel) + '</div>' : '') +
          ((a.anexos || []).length
            ? '<div class="fala-ax-lista" style="margin-top:6px">' +
              a.anexos.map(function (x) {
                return '<span class="fala-ax-t"><a href="/api/midia/' + esc(x.id) +
                  '" target="_blank" rel="noopener">⇩ ' + esc(x.nome) + '</a></span>';
              }).join("") + '</div>'
            : '') + '</div></div>');
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
      caixa.appendChild(el('<p class="small muted" style="margin-top:14px">' +
        'Ele só vê as páginas que você liberou. Os materiais dele ficam em ' +
        '<strong>Materiais e metodologia</strong>. A metodologia da casa é liberada ' +
        'na aba <strong>Metodologia</strong>, dentro de cada página.</p>'));
    }

    pintar(c.token_portal || "", c.portal_ativo ? 1 : 0);
    modal("Acompanhamento do cliente", "O que ele vê", corpo);
  }




