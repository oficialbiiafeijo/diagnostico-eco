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
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:4px">' +
        'A marca do Grupo B3 Sales</h3>' +
        '<p class="small muted" style="margin:0 0 12px">Envie o arquivo do seu logo. Ele passa ' +
        'a aparecer no painel, no formulário do cliente e no acompanhamento. ' +
        'PNG com fundo transparente fica melhor.</p>' +
        '<div id="cf_marca" style="margin-bottom:8px"></div>' +
        '<hr class="filete">' +
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
        '<hr class="filete">' +
        '<h3 class="serif" style="font-size:22px;color:var(--ameixa-900);margin-bottom:6px">Tamanho de cada imagem</h3>' +
        '<p class="small muted">Onde entra imagem no sistema, em que tela ela aparece e ' +
        'qual medida deixa o resultado limpo. Se enviar em outro tamanho, use o botão de ' +
        'enquadrar para escolher o recorte.</p>' +
        '<div class="med-lista">' + listaMedidasHtml() + '</div>' +
        '</div>');
      var marcaId = cfg.logo_midia_id || "";
      var areaM = corpo.querySelector("#cf_marca");
      function pintarMarca() {
        areaM.innerHTML = "";
        if (marcaId) {
          areaM.appendChild(el('<div class="marca-previa"><img src="/api/midia/' +
            esc(marcaId) + '" alt=""></div>'));
        }
        var linha = el('<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap"></div>');
        linha.appendChild(botaoEnviar(marcaId ? "↑ Trocar o logo" : "↑ Enviar o logo",
          null, "marca", function (r) {
            marcaId = r.id;
            api("/api/admin/marca", { logo_midia_id: marcaId }).then(function () {
              MARCA_IMG = marcaId; toast("Marca atualizada"); pintarMarca();
            });
          }, "image/*", "logo_casa"));
        if (marcaId) {
          var bl = el('<button class="btn btn-fantasma btn-sm">Voltar ao desenho</button>');
          bl.onclick = function () {
            marcaId = "";
            api("/api/admin/marca", { logo_midia_id: "" }).then(function () {
              MARCA_IMG = null; toast("Voltou ao símbolo desenhado"); pintarMarca();
            });
          };
          linha.appendChild(bl);
        }
        areaM.appendChild(linha);
      }
      pintarMarca();

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

