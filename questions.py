# -*- coding: utf-8 -*-
"""
Banco de perguntas do Diagnóstico Comercial ECO - Grupo B3 Sales.

Cada pergunta pode carregar um bloco "admin" com indicador, objetivo e
critério de análise. Esse conteudo NUNCA e enviado ao cliente: o servidor
remove essas chaves antes de entregar o formulario ao navegador dele.
"""

# Tipos suportados:
#   text, textarea, number, currency, percent, select, radio, multiselect,
#   yesno, scale, date, duration, numgroup, matrix, contatos
#
# Chaves opcionais:
#   help      -> explicacao curta exibida ao cliente
#   example   -> exemplo de preenchimento
#   other     -> True adiciona a opcao "Outro" com campo livre
#   unknown   -> True adiciona "Não acompanho esse dado / Não sei informar / Não se aplica"
#   unit      -> sufixo do campo numérico
#   required  -> True
#   show_if   -> {"q": "id_da_pergunta", "in": [valores]}
#   followup  -> {"label": "...", "type": "textarea"} campo complementar sempre visivel

import ciclos

NAO_SEI = ["Não acompanho esse dado", "Não sei informar", "Não se aplica"]

# Vocabulario da equipe do cliente. Usado nas perguntas de estrutura e
# tambem na ficha interna que a B3 Sales preenche com nome e contato.
AREAS_EQUIPE = ["Marketing", "Comercial", "Gestão e administrativo",
                "Operação e atendimento"]

FUNCOES_EQUIPE = ["Proprietária ou proprietário", "Sócia ou sócio", "Gestor comercial",
                  "Líder de equipe", "SDR", "BDR", "Closer", "Social seller",
                  "Recepcionista ou atendente", "Vendedora ou vendedor",
                  "Sucesso do cliente", "Gestor de tráfego", "Social media",
                  "Designer", "Financeiro", "Administrativo",
                  "Profissional que executa o serviço", "Acumula mais de uma função"]


# O que a B3 Sales vende. "Outro" abre campo livre no cadastro do cliente.
TIPOS_SERVICO = ["Implementação",
                 "Implementação e ferramenta",
                 "Implementação, ferramenta e time comercial",
                 "Somente ferramenta",
                 "Consultoria pontual",
                 "Outro"]

NIVEIS_EQUIPE = ["Estratégico: decide a direção",
                 "Tático: organiza e acompanha",
                 "Operacional: executa no dia a dia"]

BLOCKS = [
    # ------------------------------------------------------------------ 1
    {
        "id": "identificacao",
        "eyebrow": "Bloco 1",
        "title": "Identificação da empresa",
        "intro": "Vamos começar entendendo quem é a empresa e quem está respondendo este diagnóstico.",
        "questions": [
            {"id": "emp_nome", "type": "text", "required": True,
             "label": "Qual o nome da empresa?",
             "placeholder": "Razão social ou nome fantasia"},

            {"id": "emp_responsavel", "type": "text", "required": True,
             "label": "Quem está preenchendo este diagnóstico?",
             "placeholder": "Nome completo"},

            {"id": "emp_cargo", "type": "select", "other": True, "required": True,
             "label": "Qual a função dessa pessoa na empresa?",
             "options": ["Proprietária ou proprietário", "Sócia ou sócio",
                         "Gestora ou gestor comercial", "Líder de equipe",
                         "Vendedora ou vendedor", "Assistente ou secretária",
                         "Consultoria externa"]},

            {"id": "emp_contato", "type": "text",
             "label": "WhatsApp ou telefone para contato",
             "placeholder": "(00) 00000-0000"},

            {"id": "emp_email", "type": "text",
             "label": "E-mail principal", "placeholder": "nome@empresa.com.br"},

            {"id": "emp_segmento", "type": "select", "other": True, "required": True,
             "label": "Qual o segmento de atuação da empresa?",
             "options": ["Estética e beleza", "Saúde e odontologia", "Educação e cursos",
                         "Serviços profissionais", "Varejo físico", "E-commerce",
                         "Indústria", "Tecnologia e software", "Imobiliário",
                         "Alimentação", "Consultoria e mentoria", "Eventos"],
             "admin": {"indicador": "Aderência ao ICP",
                       "objetivo": "Classificar o negócio dentro dos segmentos já mapeados pela B3 Sales.",
                       "analise": "Comparar com a base de casos: beleza, saúde e serviços de alto ticket tem playbook próprio."}},

            {"id": "emp_cidade", "type": "text",
             "label": "Cidade e estado de operação", "placeholder": "Ex.: Goiânia - GO"},

            {"id": "emp_atuacao", "type": "multiselect", "other": True,
             "label": "Como a empresa atende os clientes hoje?",
             "options": ["Presencial em ponto físico", "Atendimento domiciliar",
                         "Online / remoto", "Híbrido", "Loja virtual", "Eventos"]},

            {"id": "emp_tempo", "type": "duration", "required": True,
             "label": "Há quantos anos e meses a empresa está em operação?",
             "help": "Informe o tempo exato. Se preferir, use o campo de data de início das atividades.",
             "example": "3 anos e 7 meses",
             "admin": {"indicador": "Maturidade do negócio",
                       "objetivo": "Medir tempo real de operação, sem faixas genéricas.",
                       "analise": "Até 24 meses: estruturação. 2 a 5 anos: organização. Acima de 5 anos: escala ou estagnação."}},

            {"id": "emp_produtos", "type": "textarea", "required": True,
             "label": "Quais produtos ou serviços a empresa vende hoje?",
             "help": "Liste os principais, do mais vendido para o menos vendido.",
             "example": "1. Protocolo facial - R$ 1.200 | 2. Pacote corporal - R$ 3.500 | 3. Manutenção mensal - R$ 400",
             "admin": {"indicador": "Portfólio e ticket",
                       "objetivo": "Mapear oferta, ancoragem e possibilidade de escada de valor.",
                       "analise": "Verificar se existe oferta de entrada, oferta principal e recorrência."}},

            {"id": "emp_carro_chefe", "type": "text",
             "label": "Qual produto ou serviço responde pela maior parte do faturamento?",
             "example": "Pacote corporal - cerca de 60% do faturamento"},
        ],
    },

    # ------------------------------------------------------------------ 2
    {
        "id": "contexto",
        "eyebrow": "Bloco 2",
        "title": "Contexto e momento do negócio",
        "intro": "Antes de olhar processo, precisamos entender onde a empresa está e para onde ela quer ir.",
        "questions": [
            {"id": "ctx_momento", "type": "radio", "other": True, "required": True,
             "label": "Qual frase descreve melhor o momento atual da empresa?",
             "options": [
                 "Estamos começando e ainda validando a oferta",
                 "Vendemos, mas de forma instável e imprevisível",
                 "Vendemos bem, porém tudo depende de mim",
                 "Temos equipe, mas falta processo e padrão",
                 "Temos estrutura e queremos escalar com previsibilidade",
                 "Estamos em queda e precisamos reverter",
             ],
             "admin": {"indicador": "Estágio ECO",
                       "objetivo": "Definir o ponto de partida do Método ECO.",
                       "analise": "Instabilidade e dependência indicam entrada por Estratégia. Falta de padrão indica entrada por Operação."}},

            {"id": "ctx_motivo", "type": "textarea", "required": True,
             "label": "O que fez você buscar a B3 Sales agora?",
             "help": "Escreva com suas palavras. Não existe resposta certa.",
             "admin": {"indicador": "Dor consciente",
                       "objetivo": "Capturar a dor que a cliente já verbaliza.",
                       "analise": "A dor declarada é o gancho de abertura da devolutiva do diagnóstico."}},

            {"id": "ctx_maior_dificuldade", "type": "select", "other": True, "required": True,
             "label": "Hoje, qual é a maior dificuldade comercial da empresa?",
             "options": ["Chegam poucos leads", "Chegam leads, mas de baixa qualidade",
                         "Demoramos para responder", "Muitos orçamentos e poucas vendas",
                         "O cliente some depois do orçamento", "Falta follow up",
                         "A equipe não segue processo", "Não temos indicadores",
                         "Tudo depende de mim", "Faltam clientes recorrentes"],
             "admin": {"indicador": "Gargalo declarado",
                       "objetivo": "Comparar o gargalo percebido com o gargalo real que aparece nos números.",
                       "analise": "Cruzar com o bloco Números. Divergência entre percebido e real e insumo de diagnóstico."}},

            {"id": "ctx_meta_12m", "type": "currency",
             "label": "Qual meta de faturamento mensal você quer alcançar nos próximos 12 meses?",
             "unknown": True, "unit": "R$ / mês",
             "admin": {"indicador": "Meta declarada",
                       "objetivo": "Comparar meta com faturamento atual e capacidade instalada.",
                       "analise": "Meta acima de 3x o atual sem estrutura indica necessidade de revisão de expectativa."}},

            {"id": "ctx_prazo", "type": "select", "other": True,
             "label": "Em quanto tempo você espera ver o primeiro resultado da implementação?",
             "options": ["Até 30 dias", "Até 60 dias", "Até 90 dias",
                         "Até 180 dias", "Não tenho prazo definido"]},

            {"id": "ctx_tentativas", "type": "multiselect", "other": True,
             "label": "O que a empresa já tentou para melhorar as vendas?",
             "options": ["Tráfego pago", "Contratar vendedores", "Trocar de equipe",
                         "Contratar agência", "Implantar CRM", "Cursos e treinamentos",
                         "Consultoria anterior", "Reduzir preço", "Nada ainda"],
             "followup": {"label": "O que funcionou e o que não funcionou?", "type": "textarea"},
             "admin": {"indicador": "Histórico de tentativas",
                       "objetivo": "Identificar crenças formadas por tentativas frustradas.",
                       "analise": "Tentativas malsucedidas geram objeção interna na implementação."}},

            {"id": "ctx_sazonalidade", "type": "textarea",
             "label": "A empresa tem meses de alta e de baixa? Quais?",
             "example": "Alta: novembro e dezembro. Baixa: janeiro e fevereiro."},
        ],
    },

    # ------------------------------------------------------------------ 3
    {
        "id": "estrutura",
        "eyebrow": "Bloco 3",
        "title": "Estrutura atual da empresa",
        "intro": "Aqui precisamos de números exatos. Se hoje uma pessoa acumula funções, conte-a em cada função que exerce.",
        "questions": [
            {"id": "est_equipe", "type": "numgroup", "required": True,
             "label": "Quantas pessoas trabalham atualmente na empresa?",
             "help": "Informe o número exato de cada categoria. Se não houver, escreva 0.",
             "fields": [
                 {"id": "socios", "label": "Sócios ou proprietários"},
                 {"id": "clt", "label": "Funcionários contratados"},
                 {"id": "prestadores", "label": "Prestadores de serviço"},
                 {"id": "parceiros", "label": "Profissionais parceiros"},
             ],
             "total": {"id": "total", "label": "Total da equipe"},
             "admin": {"indicador": "Tamanho real da operação",
                       "objetivo": "Substituir faixas genéricas por headcount exato.",
                       "analise": "Comparar o total da equipe com o faturamento para achar a receita por pessoa."}},

            {"id": "est_comercial", "type": "numgroup", "required": True,
             "label": "Como a equipe comercial está estruturada atualmente?",
             "help": "Quantidade de pessoas em cada função. Se a mesma pessoa faz duas funções, conte nas duas e informe no último campo.",
             "fields": [
                 {"id": "sdr", "label": "SDRs"},
                 {"id": "closer", "label": "Closers"},
                 {"id": "vendedor", "label": "Vendedores"},
                 {"id": "consultor", "label": "Consultores comerciais"},
                 {"id": "social", "label": "Social sellers"},
                 {"id": "atendente", "label": "Atendentes ou recepcionistas que vendem"},
                 {"id": "gestor", "label": "Gestores comerciais"},
                 {"id": "acumulo", "label": "Pessoas acumulando mais de uma função"},
             ],
             "admin": {"indicador": "Desenho do time comercial",
                       "objetivo": "Verificar se existe função definida ou acumulo generalizado.",
                       "analise": "Acúmulo alto com zero gestor indica operação dependente da dona."}},

            {"id": "est_etapas", "type": "matrix", "required": True,
             "label": "Quem realiza cada etapa do processo comercial?",
             "help": "Preencha linha por linha. Se a etapa não existe hoje, marque 'Ninguém faz'.",
             "rows": [
                 "Geração ou captação de leads", "Primeiro atendimento", "Qualificação",
                 "Agendamento", "Reunião ou avaliação", "Apresentação da proposta",
                 "Follow up", "Fechamento", "Pós venda ou recompra",
             ],
             "responsaveis": ["Proprietária ou proprietário", "Sócio", "Gestor comercial",
                              "SDR", "Closer", "Vendedor", "Social seller",
                              "Atendente ou recepção", "Agencia externa",
                              "Ninguém faz", "Outro"],
             "admin": {"indicador": "Mapa de responsabilidade",
                       "objetivo": "Localizar etapas órfãs e concentração de responsabilidade.",
                       "analise": "Etapa sem responsável é vazamento direto. Etapa sem substituto é risco de continuidade."}},

            {"id": "est_dona_participa", "type": "radio", "other": True, "required": True,
             "label": "A proprietária ou principal responsável participa diretamente do processo comercial?",
             "options": ["Sim, participa de todas as etapas",
                         "Sim, participa das etapas principais",
                         "Participa apenas de negociações específicas",
                         "Não participa da operação diária"],
             "followup": {"label": "Em quais etapas participa?", "type": "textarea"},
             "admin": {"indicador": "Dependência da dona",
                       "objetivo": "Medir o quanto a operação depende de uma única pessoa.",
                       "analise": "Participação em todas as etapas trava escala e e prioridade de Operação."}},

            {"id": "est_horas_dona", "type": "number", "unit": "horas por semana", "unknown": True,
             "label": "Quantas horas por semana a proprietária ou principal responsável dedica ao comercial?",
             "help": "Informe o número exato de horas por semana.",
             "example": "18",
             "admin": {"indicador": "Horas da liderança no comercial",
                       "objetivo": "Quantificar custo de oportunidade da liderança.",
                       "analise": "Acima de 20h/semana em execução comercial indica gargalo de delegação."}},

            {"id": "est_turnover", "type": "number", "unit": "pessoas", "unknown": True,
             "label": "Quantas pessoas saíram da equipe comercial nos últimos 12 meses?",
             "admin": {"indicador": "Turnover comercial",
                       "objetivo": "Avaliar estabilidade do time.",
                       "analise": "Turnover alto costuma indicar ausência de processo, meta ou treinamento."}},

            {"id": "est_remuneracao", "type": "multiselect", "other": True,
             "label": "Como a equipe comercial é remunerada hoje?",
             "options": ["Somente fixo", "Fixo mais comissão", "Somente comissão",
                         "Comissão por meta batida", "Premiação por campanha",
                         "Não temos equipe comercial"],
             "admin": {"indicador": "Modelo de remuneração",
                       "objetivo": "Verificar se o incentivo esta alinhado ao resultado desejado.",
                       "analise": "Somente fixo sem meta remove urgência comercial."}},
        ],
    },

    # ------------------------------------------------------------------ 4
    {
        "id": "estrategia",
        "eyebrow": "E · Método ECO",
        "title": "Estratégia",
        "intro": "Antes de crescer, precisamos enxergar com clareza: onde estamos, onde queremos chegar, quais são os gargalos e o que atacar primeiro.",
        "questions": [
            {"id": "e_icp", "type": "textarea", "required": True,
             "label": "Quem é o cliente ideal da empresa hoje?",
             "help": "Descreva perfil, momento de vida ou de negócio, capacidade de compra e principal dor.",
             "admin": {"indicador": "ICP definido",
                       "objetivo": "Verificar se existe clareza de público ou atendimento indiscriminado.",
                       "analise": "Resposta genérica indica ausência de ICP e explica leads desqualificados."}},

            {"id": "e_icp_documentado", "type": "yesno",
             "label": "Esse cliente ideal está documentado em algum lugar que a equipe consulta?",
             "admin": {"indicador": "ICP documentado",
                       "objetivo": "Distinguir clareza mental da dona de clareza institucional.",
                       "analise": "Não documentado significa que só a dona sabe qualificar."}},

            {"id": "e_diferencial", "type": "textarea", "required": True,
             "label": "Por que um cliente escolhe a sua empresa e não a concorrência?",
             "admin": {"indicador": "Proposta de valor",
                       "objetivo": "Avaliar se existe diferencial percebido ou disputa por preço.",
                       "analise": "Respostas centradas em preço ou atendimento genérico indicam ausência de posicionamento."}},

            {"id": "e_objecoes", "type": "multiselect", "other": True,
             "label": "Quais objeções mais aparecem nas negociações?",
             "options": ["Está caro", "Vou pensar", "Preciso falar com meu cônjuge ou sócio",
                         "Não é o momento", "Já tenho fornecedor", "Não confio no resultado",
                         "Não tenho tempo", "Vou pesquisar outros orçamentos"],
             "admin": {"indicador": "Mapa de objeções",
                       "objetivo": "Alimentar o script de contorno e a fase de Condução.",
                       "analise": "'Vou pensar' em primeiro lugar normalmente e falha de construção de valor, não de preço."}},

            {"id": "e_canais", "type": "multiselect", "other": True, "required": True,
             "label": "De onde vem os clientes hoje?",
             "options": ["Indicação", "Instagram orgânico", "Tráfego pago",
                         "Google", "WhatsApp", "Base antiga de clientes",
                         "Eventos", "Parcerias", "Passagem em loja física", "Prospecção ativa"],
             "admin": {"indicador": "Matriz de aquisição",
                       "objetivo": "Identificar concentração e fragilidade de canal.",
                       "analise": "Dependência de um único canal e risco estratégico."}},

            {"id": "e_canal_principal", "type": "text",
             "label": "Qual desses canais traz mais clientes hoje?",
             "example": "Indicação - cerca de 70%"},

            {"id": "e_meta_definida", "type": "yesno", "required": True,
             "label": "A empresa tem meta comercial definida para o mês?",
             "followup": {"label": "Qual é a meta e como ela foi calculada?", "type": "textarea"},
             "admin": {"indicador": "Existência de meta",
                       "objetivo": "Verificar se existe direção numérica.",
                       "analise": "Sem meta não existe desvio, e sem desvio não existe correção."}},

            {"id": "e_meta_equipe", "type": "yesno",
             "label": "A equipe sabe qual é a meta e como ela é acompanhada?",
             "show_if": {"q": "e_meta_definida", "in": ["Sim"]}},

            {"id": "e_gargalos", "type": "multiselect", "other": True, "required": True,
             "label": "Onde você sente que a empresa mais perde dinheiro hoje?",
             "help": "Pode marcar mais de uma.",
             "options": ["Leads que nunca são respondidos", "Demora no primeiro contato",
                         "Atendimento sem padrão", "Falta de qualificação",
                         "Proposta mal conduzida", "Ausência de follow up",
                         "Cliente que some", "Equipe sem preparo",
                         "Base antiga esquecida", "Falta de gestão e indicadores"],
             "admin": {"indicador": "Radar de risco",
                       "objetivo": "Cruzar com o funil real de perdas.",
                       "analise": "Comparar com o bloco Números para separar percepção de evidência."}},

            {"id": "e_prioridade", "type": "textarea", "required": True,
             "label": "Se você pudesse resolver apenas uma coisa nos próximos 30 dias, qual seria?",
             "admin": {"indicador": "Prioridade percebida",
                       "objetivo": "Ancorar o plano de ação no que a cliente considera urgente.",
                       "analise": "Alinhar prioridade percebida com prioridade técnica para gerar adesao."}},
        ],
    },

    # ------------------------------------------------------------------ 5
    {
        "id": "conducao",
        "eyebrow": "C · Método ECO",
        "title": "Condução",
        "intro": "Toda oportunidade precisa ser recebida, qualificada, conduzida, acompanhada e levada até a decisão.",
        "questions": [
            {"id": "c_tempo_resposta", "type": "select", "other": True, "required": True,
             "label": "Quanto tempo a empresa leva, em média, para responder um novo lead?",
             "options": ["Até 5 minutos", "De 5 a 30 minutos", "De 30 minutos a 1 hora",
                         "De 1 a 4 horas", "No mesmo dia", "No dia seguinte",
                         "Mais de um dia", "Depende de quem está disponível"],
             "followup": {"label": "Se preferir, informe o tempo médio exato em minutos.", "type": "number"},
             "admin": {"indicador": "Velocidade de contato (VOX)",
                       "objetivo": "Medir o tempo entre entrada do lead e primeiro contato.",
                       "analise": "Acima de 30 minutos a taxa de conexão cai de forma acentuada."}},

            {"id": "c_horario", "type": "textarea",
             "label": "Existe alguém responsável por responder leads fora do horário comercial e nos fins de semana?",
             "admin": {"indicador": "Cobertura de atendimento",
                       "objetivo": "Encontrar janelas de lead sem resposta.",
                       "analise": "Leads de fim de semana sem cobertura são perda silenciosa."}},

            {"id": "c_script", "type": "radio", "other": True, "required": True,
             "label": "A empresa tem um roteiro de atendimento que a equipe segue?",
             "options": ["Sim, escrito e seguido por todos",
                         "Sim, escrito, mas cada um faz de um jeito",
                         "Existe na cabeça das pessoas, não está escrito",
                         "Não existe roteiro"],
             "admin": {"indicador": "Padrão de atendimento",
                       "objetivo": "Verificar repetibilidade do atendimento.",
                       "analise": "Sem roteiro escrito, o resultado depende do talento individual."}},

            {"id": "c_qualificacao", "type": "multiselect", "other": True,
             "label": "Quais informações a equipe levanta antes de apresentar preço?",
             "options": ["Necessidade ou dor", "Urgência", "Capacidade de investimento",
                         "Quem decide a compra", "Tentativas anteriores", "Prazo desejado",
                         "Nenhuma, já mandamos o preço"],
             "admin": {"indicador": "Profundidade de qualificação",
                       "objetivo": "Medir se existe construção de valor antes do preço.",
                       "analise": "Envio de preço sem qualificação é a principal causa de 'vou pensar'."}},

            {"id": "c_agendamento", "type": "yesno", "required": True,
             "label": "A empresa trabalha com agendamento de reunião, avaliação ou visita?",
             "admin": {"indicador": "Existência de etapa de agendamento",
                       "objetivo": "Identificar se existe compromisso formal na jornada.",
                       "analise": "Sem agendamento não existe controle de comparecimento."}},

            {"id": "c_confirmacao", "type": "multiselect", "other": True,
             "label": "O que a empresa faz entre o agendamento e a reunião?",
             "show_if": {"q": "c_agendamento", "in": ["Sim"]},
             "options": ["Confirmação no dia anterior", "Confirmação no mesmo dia",
                         "Lembrete automático", "Áudio ou vídeo de aquecimento",
                         "Envio de material", "Nada é feito"],
             "admin": {"indicador": "Aquecimento (NOUS)",
                       "objetivo": "Reduzir no show no intervalo entre agendamento e reunião.",
                       "analise": "'Nada é feito' explica a maior parte dos no shows."}},

            {"id": "c_proposta", "type": "radio", "other": True,
             "label": "Como a proposta chega ao cliente?",
             "options": ["Apresentada ao vivo e depois enviada",
                         "Apresentada ao vivo, sem envio",
                         "Enviada por mensagem sem apresentação",
                         "Enviada por e-mail", "Não usamos proposta formal"],
             "admin": {"indicador": "Qualidade da apresentação",
                       "objetivo": "Verificar se existe condução ou apenas envio de preço.",
                       "analise": "Proposta enviada sem apresentação reduz conversão de forma significativa."}},

            {"id": "c_followup_existe", "type": "radio", "other": True, "required": True,
             "label": "Existe follow up estruturado depois da proposta?",
             "options": ["Sim, com cadência definida e registrada",
                         "Sim, mas cada um faz do seu jeito",
                         "Apenas quando lembramos",
                         "Não fazemos follow up"],
             "admin": {"indicador": "Cadência de follow up",
                       "objetivo": "Mapear a maior fonte de receita não capturada.",
                       "analise": "Follow up por memória e igual a follow up inexistente na pratica."}},

            {"id": "c_followup_tentativas", "type": "number", "unit": "tentativas", "unknown": True,
             "label": "Quantas tentativas de contato são feitas antes de considerar a oportunidade perdida?",
             "admin": {"indicador": "Número de toques",
                       "objetivo": "Comparar com a cadência mínima recomendada.",
                       "analise": "Abaixo de 5 tentativas normalmente deixa receita na mesa."}},

            {"id": "c_motivo_perda", "type": "yesno", "required": True,
             "label": "A empresa registra o motivo da perda quando um cliente não fecha?",
             "admin": {"indicador": "Registro de perda",
                       "objetivo": "Sem motivo de perda não existe correção de rota.",
                       "analise": "Ausência de registro impede priorização baseada em evidência."}},

            {"id": "c_reativacao", "type": "radio", "other": True,
             "label": "A empresa trabalha a base de clientes antigos e orçamentos não fechados?",
             "options": ["Sim, com rotina definida", "Já fizemos algumas vezes",
                         "Nunca fizemos", "Não temos essa base organizada"],
             "admin": {"indicador": "Reativação de base",
                       "objetivo": "Encontrar receita já existente dentro da empresa.",
                       "analise": "Base fria organizada costuma ser a primeira vitória rápida do ciclo."}},
        ],
    },

    # ------------------------------------------------------------------ 6
    {
        "id": "operacao",
        "eyebrow": "O · Método ECO",
        "title": "Operação",
        "intro": "É aqui que instalamos processo, pessoas e rotina para transformar execução em resultado.",
        "questions": [
            {"id": "o_crm", "type": "radio", "other": True, "required": True,
             "label": "A empresa usa CRM ou alguma ferramenta para registrar as oportunidades?",
             "options": ["Sim, e toda a equipe usa todos os dias",
                         "Sim, mas o uso é irregular",
                         "Temos, mas ninguém usa",
                         "Usamos planilha", "Usamos caderno ou agenda",
                         "Está tudo no WhatsApp", "Não registramos nada"],
             "followup": {"label": "Qual ferramenta?", "type": "text"},
             "admin": {"indicador": "Registro de oportunidade",
                       "objetivo": "Verificar se a operação vive na ferramenta ou na memória.",
                       "analise": "WhatsApp e memória como único registro impedem qualquer gestão por indicador."}},

            {"id": "o_ferramentas", "type": "multiselect", "other": True,
             "label": "Quais ferramentas a empresa usa hoje no comercial?",
             "options": ["WhatsApp Business", "Instagram Direct", "CRM",
                         "Planilha de controle", "Agenda online", "Disparo em massa",
                         "Automação de mensagens", "Sistema de gestão ou ERP",
                         "Emissor de propostas", "Nenhuma"]},

            {"id": "o_rotina", "type": "multiselect", "other": True, "required": True,
             "label": "Quais rotinas comerciais existem hoje na empresa?",
             "options": ["Reunião diária rápida", "Reunião semanal de resultados",
                         "Fechamento mensal com números", "Acompanhamento individual",
                         "Feedback estruturado", "Treinamento recorrente",
                         "Auditoria de atendimentos", "Nenhuma rotina definida"],
             "admin": {"indicador": "Rotina de gestão",
                       "objetivo": "Verificar se existe cadência de acompanhamento.",
                       "analise": "Sem rotina, a operação só vira problema no fim do mês."}},

            {"id": "o_indicadores", "type": "multiselect", "other": True, "required": True,
             "label": "Quais indicadores a empresa acompanha hoje?",
             "options": ["Leads recebidos", "Tempo de resposta", "Agendamentos",
                         "Comparecimento e no show", "Propostas enviadas",
                         "Taxa de conversão", "Ticket médio", "Motivo de perda",
                         "Faturamento por canal", "Nenhum indicador"],
             "admin": {"indicador": "Maturidade de gestão (PALANTIR)",
                       "objetivo": "Medir capacidade de gestão por número.",
                       "analise": "Menos de três indicadores acompanhados indica gestão por percepção."}},

            {"id": "o_onde_indicadores", "type": "text",
             "label": "Onde esses números ficam registrados?",
             "example": "Planilha no Google Drive, atualizada toda sexta",
             "show_if": {"q": "o_indicadores", "not_in": ["Nenhum indicador"]}},

            {"id": "o_treinamento", "type": "radio", "other": True,
             "label": "Como uma pessoa nova é treinada quando entra na equipe?",
             "options": ["Temos material e trilha de treinamento",
                         "Acompanha alguém por alguns dias",
                         "Aprende na pratica, sozinha",
                         "Eu mesma treino, uma a uma",
                         "Nunca contratamos ninguém"],
             "admin": {"indicador": "Onboarding interno",
                       "objetivo": "Avaliar replicabilidade do time.",
                       "analise": "Treinamento sem material impede escala e mantem dependência da dona."}},

            {"id": "o_documentacao", "type": "multiselect", "other": True,
             "label": "O que já está documentado na empresa?",
             "options": ["Script de atendimento", "Fluxo do processo comercial",
                         "Política de desconto", "Descrição de funções",
                         "Cadência de follow up", "Modelo de proposta",
                         "Manual de objeções", "Nada está documentado"],
             "admin": {"indicador": "Ativos de processo",
                       "objetivo": "Levantar o que já existe antes de construir do zero.",
                       "analise": "O que já existe deve ser corrigido, não substituido."}},

            {"id": "o_gestao", "type": "yesno", "required": True,
             "label": "Existe alguém que acompanha os resultados da equipe todos os dias?",
             "followup": {"label": "Quem faz esse acompanhamento?", "type": "text"},
             "admin": {"indicador": "Gestão ativa",
                       "objetivo": "Verificar se existe correção dentro do mês.",
                       "analise": "Sem acompanhamento diário, o desvio só aparece quando o mês já acabou."}},

            {"id": "o_disponibilidade", "type": "select", "other": True, "required": True,
             "label": "Quanto tempo por semana você consegue dedicar a implementação do que for definido no diagnóstico?",
             "options": ["Até 2 horas", "De 2 a 5 horas", "De 5 a 10 horas",
                         "Mais de 10 horas", "Vou delegar para outra pessoa"],
             "followup": {"label": "Se preferir, informe o número exato de horas por semana.", "type": "number"},
             "admin": {"indicador": "Capacidade de execução",
                       "objetivo": "Dimensionar o plano ao tempo real disponível.",
                       "analise": "Plano acima da capacidade de execução gera frustração e abandono."}},

            {"id": "o_quem_executa", "type": "text",
             "label": "Quem será a pessoa responsável por executar as ações dentro da empresa?",
             "example": "Eu e a gerente Camila"},
        ],
    },

    # ------------------------------------------------------------------ 7
    {
        "id": "numeros",
        "eyebrow": "Bloco 7",
        "title": "Números e indicadores",
        "intro": "Este bloco constrói o retrato real da operação. Prefira o número exato. Se a empresa não acompanha algum dado, marque a opção correspondente. Essa informação também é importante.",
        "questions": [
            {"id": "n_periodo", "type": "select", "required": True,
             "label": "Os números abaixo se referem a qual período?",
             "options": ["Último mês fechado", "Média dos últimos 3 meses",
                         "Média dos últimos 6 meses", "Último mês em andamento"]},

            {"id": "n_faturamento", "type": "currency", "unknown": True, "required": True,
             "label": "Qual o faturamento mensal da empresa?", "unit": "R$",
             "admin": {"indicador": "Faturamento",
                       "objetivo": "Base de cálculo de todo o diagnóstico.",
                       "analise": "Cruzar com headcount, ticket e volume de leads."}},

            {"id": "n_fat_comercial", "type": "currency", "unknown": True,
             "label": "Desse total, quanto vem de vendas ativas (prospecção, atendimento, negociação)?", "unit": "R$",
             "admin": {"indicador": "Receita ativa x passiva",
                       "objetivo": "Separar receita construida de receita que apenas acontece.",
                       "analise": "Alta dependência de receita passiva indica fragilidade de aquisição."}},

            {"id": "n_ticket", "type": "currency", "unknown": True, "required": True,
             "label": "Qual o ticket médio por venda?", "unit": "R$",
             "admin": {"indicador": "Ticket médio",
                       "objetivo": "Definir o esforço comercial que a venda comporta.",
                       "analise": "Ticket baixo com processo longo indica desalinhamento de esforço."}},

            {"id": "n_leads", "type": "number", "unknown": True, "required": True,
             "label": "Quantos leads ou contatos novos a empresa recebe por mês?", "unit": "leads / mês",
             "admin": {"indicador": "Volume de entrada",
                       "objetivo": "Topo do funil real.",
                       "analise": "Comparar com atendimentos para achar leads sem resposta."}},

            {"id": "n_atendidos", "type": "number", "unknown": True,
             "label": "Desses, quantos são efetivamente atendidos ou respondidos?", "unit": "por mês",
             "admin": {"indicador": "Taxa de atendimento",
                       "objetivo": "Medir o primeiro vazamento do funil.",
                       "analise": "Diferença entre leads e atendidos e dinheiro perdido antes da venda começar."}},

            {"id": "n_agendamentos", "type": "number", "unknown": True,
             "label": "Quantas reuniões, avaliações ou visitas são agendadas por mês?", "unit": "por mês",
             "admin": {"indicador": "Agendamentos",
                       "objetivo": "Medir conversão de atendimento em compromisso."}},

            {"id": "n_comparecimentos", "type": "number", "unknown": True,
             "label": "Quantas dessas realmente acontecem?", "unit": "por mês",
             "admin": {"indicador": "Comparecimento",
                       "objetivo": "Calcular a taxa de no show."}},

            {"id": "n_noshow", "type": "number", "unknown": True,
             "label": "Quantos no shows acontecem por mês?", "unit": "por mês",
             "admin": {"indicador": "No show",
                       "objetivo": "Dimensionar a perda no intervalo entre agendamento e reunião.",
                       "analise": "Acima de 30% indica ausência de aquecimento e confirmação."}},

            {"id": "n_propostas", "type": "number", "unknown": True,
             "label": "Quantas propostas ou orçamentos são enviados por mês?", "unit": "por mês",
             "admin": {"indicador": "Propostas emitidas"}},

            {"id": "n_vendas", "type": "number", "unknown": True, "required": True,
             "label": "Quantas vendas são fechadas por mês?", "unit": "vendas / mês",
             "admin": {"indicador": "Vendas",
                       "objetivo": "Fechamento do funil.",
                       "analise": "Com leads e vendas calculamos a conversão real ponta a ponta."}},

            {"id": "n_followups", "type": "number", "unknown": True,
             "label": "Quantos follow ups a equipe faz por mês?", "unit": "por mês",
             "admin": {"indicador": "Volume de follow up"}},

            {"id": "n_recuperadas", "type": "number", "unknown": True,
             "label": "Quantas vendas foram recuperadas por follow up ou reativação no último mês?", "unit": "vendas",
             "admin": {"indicador": "Receita recuperada",
                       "objetivo": "Medir o retorno do trabalho de base.",
                       "analise": "Zero aqui com base grande e a oportunidade mais rápida do ciclo."}},

            {"id": "n_clientes_ativos", "type": "number", "unknown": True,
             "label": "Quantos clientes ativos a empresa tem hoje?", "unit": "clientes",
             "admin": {"indicador": "Carteira ativa"}},

            {"id": "n_clientes_recorrentes", "type": "number", "unknown": True,
             "label": "Quantos desses compram de forma recorrente?", "unit": "clientes",
             "admin": {"indicador": "Recorrência",
                       "objetivo": "Medir previsibilidade de receita.",
                       "analise": "Baixa recorrência obriga aquisição constante e encarece o crescimento."}},

            {"id": "n_base_total", "type": "number", "unknown": True,
             "label": "Quantos contatos existem na base total da empresa, somando clientes antigos e orçamentos não fechados?", "unit": "contatos",
             "admin": {"indicador": "Base para reativação",
                       "objetivo": "Dimensionar a receita adormecida.",
                       "analise": "Base grande e reativação zero e a vitória rápida do Dia 0 ao Dia 30."}},

            {"id": "n_tempo_fechamento", "type": "number", "unknown": True,
             "label": "Em média, quantos dias se passam entre o primeiro contato e o fechamento da venda?", "unit": "dias",
             "admin": {"indicador": "Ciclo de venda",
                       "objetivo": "Definir a cadência de follow up adequada."}},

            {"id": "n_invest_marketing", "type": "currency", "unknown": True,
             "label": "Quanto a empresa investe por mês em marketing e tráfego pago?", "unit": "R$ / mês",
             "admin": {"indicador": "Investimento em aquisição",
                       "objetivo": "Calcular custo por lead e por venda.",
                       "analise": "Investir mais em tráfego com funil furado amplia o vazamento."}},

            {"id": "n_confianca", "type": "scale", "required": True,
             "label": "O quanto você confia nos números que acabou de informar?",
             "help": "1 significa que são estimativas. 10 significa que são dados registrados e conferidos.",
             "admin": {"indicador": "Confiabilidade do dado",
                       "objetivo": "Calibrar o peso do diagnóstico quantitativo.",
                       "analise": "Confiança abaixo de 5 indica que instalar medição e a primeira entrega."}},
        ],
    },

    # ------------------------------------------------------------------ 8
    {
        "id": "anexos",
        "eyebrow": "Bloco 8",
        "title": "Complementos e anexos",
        "intro": "Se você quiser complementar alguma resposta, este é o espaço. Você pode anexar documentos, planilhas, prints, scripts e fotos.",
        "questions": [
            {"id": "ax_observacoes", "type": "textarea",
             "label": "Existe algo importante sobre a empresa que não foi perguntado aqui?",
             "help": "Use este espaço livremente."},

            {"id": "ax_expectativa", "type": "textarea",
             "label": "O que precisa acontecer nos próximos 180 dias para você considerar que valeu a pena?",
             "admin": {"indicador": "Critério de sucesso",
                       "objetivo": "Definir com a cliente o que será considerado resultado.",
                       "analise": "Este é o critério de comparação do Dia 0 contra o Dia 180."}},

            {"id": "ax_arquivos", "type": "files",
             "label": "Anexe aqui o que ajudar a entender a operação",
             "help": "Sugestões: scripts de atendimento, planilhas de controle, prints do CRM, propostas, tabela de preços, fotos do ponto, relatórios de tráfego. Até 20 MB por arquivo."},
        ],
    },
]

CICLOS = ["Dia 0", "Dia 30", "Dia 60", "Dia 90", "Dia 120", "Dia 150", "Dia 180"]

STATUS = ["Não iniciado", "Em preenchimento", "Aguardando conclusão",
          "Enviado pelo cliente", "Em análise pela B3 Sales", "Diagnóstico concluído"]


def blocos_do_ciclo(ciclo=None):
    """O Dia 0 registra o cenario. Os demais ciclos medem a transformacao."""
    return ciclos.MENSAIS.get(ciclo, BLOCKS)


def titulo_do_ciclo(ciclo=None):
    return ciclos.TITULOS.get(ciclo, "Diagnóstico Comercial ECO")


def abertura_do_ciclo(ciclo=None):
    return ciclos.ABERTURA.get(
        ciclo, "Vamos entender o momento atual da sua empresa para identificar "
               "gargalos, oportunidades e prioridades comerciais.")


def client_blocks(ciclo=None):
    """Copia do banco de perguntas sem nenhum campo interno da B3 Sales."""
    out = []
    for b in blocos_do_ciclo(ciclo):
        qs = []
        for q in b["questions"]:
            qs.append({k: v for k, v in q.items() if k != "admin"})
        out.append({**b, "questions": qs})
    return out


def all_questions(ciclo=None):
    for b in blocos_do_ciclo(ciclo):
        for q in b["questions"]:
            yield b, q


def question_map(ciclo=None):
    return {q["id"]: (b, q) for b, q in all_questions(ciclo)}


def required_ids(ciclo=None):
    return [q["id"] for _, q in all_questions(ciclo) if q.get("required")]
