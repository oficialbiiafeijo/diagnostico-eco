# Como colocar o sistema no ar

Este guia é para publicar o Diagnóstico ECO na internet, para que **seus clientes
consigam abrir o link no navegador deles**.

O serviço usado é o **Render**, o mesmo do `projetoignis.online`.

---

## Antes de começar

Você vai precisar de:

1. Uma conta no GitHub (gratuita) — `github.com`
2. Sua conta no Render — `render.com`

O sistema não usa nenhuma biblioteca externa, então a publicação é simples.

---

## Parte 1 — Colocar o código no GitHub

1. Entre em `github.com` e faça login.
2. Clique no botão **+** no canto superior direito e escolha **New repository**.
3. Em *Repository name*, escreva: `diagnostico-eco`
4. Marque a opção **Private**.
5. Clique em **Create repository**.
6. Na tela seguinte, clique no link **uploading an existing file**.
7. Abra a pasta `diagnostico-eco` no seu Mac.
8. Selecione **todos os arquivos e a pasta `web`** — mas **não** envie a pasta `data`.
9. Arraste tudo para a área de upload do GitHub.
10. Role a página e clique em **Commit changes**.

> A pasta `data` guarda respostas de clientes. Ela nunca deve ir para o GitHub.
> O arquivo `.gitignore` já está configurado para isso.

---

## Parte 2 — Publicar no Render

1. Entre em `render.com` e faça login.
2. Clique em **New +** e escolha **Web Service**.
3. Escolha **Build and deploy from a Git repository** e clique em **Next**.
4. Conecte sua conta do GitHub, se ainda não estiver conectada.
5. Encontre o repositório `diagnostico-eco` e clique em **Connect**.
6. Preencha assim:

   | Campo    | O que colocar          |
   |----------|------------------------|
   | Name     | `diagnostico-eco`      |
   | Region   | a mesma do outro sistema |
   | Runtime  | **Docker**             |
   | Plan     | **Starter**            |

7. Clique em **Advanced** e depois em **Add Environment Variable**. Adicione:

   | Chave               | Valor                                  |
   |---------------------|----------------------------------------|
   | `ECO_DATA_DIR`      | `/var/data`                            |
   | `ECO_ADMIN_USUARIO` | `b3sales`                              |
   | `ECO_ADMIN_SENHA`   | uma senha forte, escolhida por você    |

8. Ainda em **Advanced**, clique em **Add Disk** e preencha:

   | Campo      | Valor        |
   |------------|--------------|
   | Name       | `dados-eco`  |
   | Mount Path | `/var/data`  |
   | Size       | `5` GB       |

   > **Este passo é obrigatório.** É o disco que guarda as respostas e os anexos.
   > Sem ele, os dados dos clientes são apagados a cada nova publicação.

9. Em **Health Check Path**, escreva: `/saude`
10. Clique em **Create Web Service**.

O Render leva alguns minutos publicando. Quando terminar, aparece o endereço,
algo como `https://diagnostico-eco.onrender.com`.

---

## Parte 3 — Endereço próprio (opcional)

Se quiser um endereço como `diagnostico.projetoignis.online`:

1. No Render, abra o serviço e vá em **Settings → Custom Domains**.
2. Clique em **Add Custom Domain** e escreva o endereço desejado.
3. O Render mostra um registro `CNAME`. Copie esse valor.
4. No painel onde o domínio `projetoignis.online` está registrado, crie um
   registro **CNAME** com o nome `diagnostico` apontando para o valor copiado.
5. Volte ao Render e clique em **Verify**.

---

## Parte 4 — Usar

1. Acesse `https://SEU-ENDERECO/admin`
2. Entre com o usuário e a senha que você definiu na Parte 2.
3. Clique em **+ Novo cliente**, preencha os dados e clique em
   **Cadastrar e gerar link**.
4. Copie o link ou envie direto pelo WhatsApp.
5. Acompanhe o preenchimento pelo painel.

---

## Manutenção

**Cópia de segurança.** No Render, o disco `/var/data` é preservado entre as
publicações. Mesmo assim, exporte o JSON dos clientes de tempos em tempos pelo
botão **Exportar JSON**, na tela de cada cliente.

**Atualizar o sistema.** Se algum arquivo mudar, envie o arquivo novo para o
GitHub. O Render publica a atualização sozinho. Os dados dos clientes não são
afetados.

**Trocar a senha.** Dentro da área interna, em **Configurações**.

---

## Chave de leitura dos dados

Em **Configurações**, na área interna, existe uma *chave de leitura*. Com ela é
possível ler os dados do sistema de fora, para gerar análises:

```
https://SEU-ENDERECO/api/dados?chave=SUA-CHAVE
```

Essa chave dá acesso a **todas** as respostas de **todos** os clientes.
Trate como uma senha: não publique e não coloque em mensagem pública.

Para os dados de um cliente só:

```
https://SEU-ENDERECO/api/dados/ID-DO-CLIENTE?chave=SUA-CHAVE
```
