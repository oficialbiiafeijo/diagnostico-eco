# Diagnóstico Comercial ECO — Grupo B3 Sales

Sistema de diagnóstico comercial com link individual por empresa, banco de dados
central, anexos, área interna e acompanhamento de 180 dias.

## O que o sistema faz

**Para o cliente**
- Recebe um link individual e exclusivo. Não precisa criar conta nem senha.
- Responde 78 perguntas divididas em 8 blocos, na identidade visual do Grupo B3 Sales.
- As respostas **salvam sozinhas** a cada alteração. Pode fechar e voltar pelo mesmo link.
- Campos numéricos exatos, com a opção de dizer "não acompanho esse dado".
- Anexa documentos, planilhas, prints, scripts e fotos (até 20 MB por arquivo).
- Revisa tudo antes de enviar e recebe a mensagem final de conclusão.

**Para a equipe do Grupo B3 Sales**
- Área interna protegida por usuário e senha.
- Cadastra clientes e gera links exclusivos, com validade opcional.
- Acompanha status, percentual preenchido, último acesso e quem preencheu.
- Vê as respostas com o indicador, o objetivo e o critério de análise de cada pergunta —
  conteúdo que **o cliente nunca enxerga**.
- Score ECO automático por pilar (Estratégia, Condução, Operação), com gargalos
  ordenados por peso e porta de entrada sugerida.
- Indicadores calculados a partir dos números informados (taxa de atendimento,
  no show, conversão de proposta, receita adormecida, custo por venda e outros).
- Registra a análise interna: gargalos priorizados, prioridades do ciclo,
  próximo foco e observações.
- Ciclos Dia 0 → Dia 180, com comparativo entre dois ciclos quaisquer.
  Um ciclo novo **nunca apaga** o anterior.
- Exporta tudo em JSON e CSV.
- Baixa os anexos enviados pelo cliente.

## Como rodar no seu Mac

Dê **dois cliques** em `Iniciar-Diagnostico-ECO.command`.
O navegador abre sozinho na área interna. Não é preciso instalar nada:
o sistema usa apenas o Python que já vem no Mac.

O endereço é sempre o mesmo: **http://127.0.0.1:8420/admin**

Se o sistema já estiver ligado, o atalho apenas abre o navegador,
sem abrir uma segunda cópia.

Para encerrar, feche a janela do Terminal que abriu junto.
Enquanto essa janela estiver aberta, o sistema está no ar no seu Mac.

## Primeiro acesso

Usuário e senha ficam no arquivo `data/PRIMEIRO-ACESSO.txt`, criado na primeira
vez que o sistema roda. **Troque a senha** em Configurações, dentro da área interna.

## Onde ficam os dados

Tudo em `data/`:

- `data/eco.db` — banco de dados com clientes, respostas, ciclos e análises.
- `data/uploads/` — arquivos enviados pelos clientes.
- `data/PRIMEIRO-ACESSO.txt` — usuário, senha inicial e chave de leitura.

Faça cópia dessa pasta de tempos em tempos. Ela é o sistema inteiro.

## Publicar na internet

Veja `INSTALACAO.md`, com o passo a passo para colocar no ar no Render,
o mesmo serviço já usado no `projetoignis.online`.

## Estrutura do projeto

```
server.py      servidor e API (só biblioteca padrão do Python)
questions.py   as 78 perguntas, com os campos internos de análise
analise.py     Score ECO, gargalos e indicadores calculados
verificar.py   checagem de integridade do banco de perguntas
web/           telas do cliente e da área interna
data/          banco de dados e anexos (não versionar)
Dockerfile     imagem para publicar
render.yaml    configuração do Render
```

Para conferir a integridade do banco de perguntas depois de qualquer alteração:

```bash
python3 verificar.py
```
