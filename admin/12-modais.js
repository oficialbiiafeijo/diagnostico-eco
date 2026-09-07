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
      campoTexto("m_insta_emp", "Instagram da empresa", "@nomedaempresa") +
      campoTexto("m_insta_pes", "Instagram pessoal", "@nomedapessoa") +
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
        instagram_empresa: corpo.querySelector("#m_insta_emp").value,
        instagram_pessoal: corpo.querySelector("#m_insta_pes").value,
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
      campoTexto("e_insta_emp", "Instagram da empresa", "@nomedaempresa",
                 c.instagram_empresa) +
      campoTexto("e_insta_pes", "Instagram pessoal", "@nomedapessoa",
                 c.instagram_pessoal) +
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
        instagram_empresa: corpo.querySelector("#e_insta_emp").value,
        instagram_pessoal: corpo.querySelector("#e_insta_pes").value,
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


