# -*- coding: utf-8 -*-
"""
Acompanhamentos mensais do Método ECO - Grupo B3 Sales.

O Dia 0 registra o cenário e mora em questions.py.
Aqui ficam os seis ciclos que medem a transformação, de 30 a 180 dias.

Cada ciclo segue a mesma espinha:
  1. o que foi planejado
  2. o que foi implementado
  3. o que mudou nos indicadores
  4. o que ainda trava
  5. qual a próxima prioridade

Tipos próprios destes ciclos (resolvidos no momento da publicação do link):
  acoes_status     -> lista as ações do ciclo anterior, cada uma com seu status
  prioridades_prev -> prioridades definidas antes, para confirmar ou trocar
  indicador_ref    -> apenas os indicadores que a empresa cadastrou no Dia 0
"""

ESCALA_5 = ["1", "2", "3", "4", "5"]

STATUS_ACAO = ["Concluída", "Em andamento", "Não iniciada", "Bloqueada",
               "Cancelada", "Não se aplica"]

PILARES_ECO = ["Estratégia", "Condução", "Operação"]

ETAPAS_FUNIL = ["Entrada do lead", "Primeiro atendimento", "Qualificação",
                "Agendamento", "Confirmação", "Reunião ou avaliação",
                "Apresentação da oferta", "Proposta", "Follow up",
                "Fechamento", "Pós venda", "Recompra"]

COMPORTAMENTOS = ["Agilidade", "Organização", "Perguntas", "Registro",
                  "Qualificação", "Follow up", "Apresentação", "Fechamento",
                  "Pós venda"]

OBJECOES = ["Preço", "Falta de dinheiro", "Precisa pensar",
            "Precisa falar com outra pessoa", "Falta de urgência",
            "Falta de confiança", "Comparação com concorrentes",
            "Momento inadequado"]

PROCESSOS = ["Estratégia comercial", "Atendimento", "Qualificação", "Agendamento",
             "Proposta", "Follow up", "Fechamento", "CRM",
             "Gestão de indicadores", "Treinamento", "Pós venda", "Recompra"]


# =====================================================================
# DIA 30 — Mês 1 | Diagnóstico e direção
# =====================================================================
DIA_30 = [
    {
        "id": "d30_direcao", "eyebrow": "Parte 1", "title": "Direção estratégica",
        "intro": "Vamos confirmar se o rumo definido no início continua sendo o certo.",
        "questions": [
            {"id": "c30_prioridade_ciclo", "type": "prioridades_prev", "required": True,
             "label": "Qual era a principal prioridade definida para este primeiro ciclo?",
             "help": "Marque a prioridade que guiou o mês.",
             "admin": {"indicador": "Aderência à prioridade",
                       "objetivo": "Saber se a empresa lembrou e seguiu o que foi combinado.",
                       "analise": "Se ela não reconhece a prioridade, o alinhamento falhou na origem."}},

            {"id": "c30_prioridade_segue", "type": "radio", "required": True,
             "label": "Essa prioridade continua sendo a mais importante para a empresa?",
             "options": ["Sim", "Continua importante, mas surgiu uma prioridade maior",
                         "Não, o cenário mudou", "Ainda não tenho clareza"],
             "followup": {"label": "Explique brevemente.", "type": "textarea"},
             "admin": {"indicador": "Estabilidade de foco",
                       "objetivo": "Detectar troca de prioridade no meio do caminho.",
                       "analise": "Troca constante de foco é sintoma de ausência de estratégia."}},

            {"id": "c30_mudanca_necessaria", "type": "textarea", "required": True,
             "label": "O que precisa mudar na empresa para que essa prioridade seja resolvida?",
             "placeholder": "Escreva em poucas linhas, do seu jeito.",
             "admin": {"indicador": "Consciência do gargalo",
                       "objetivo": "Comparar a percepção dela com o gargalo real do diagnóstico.",
                       "analise": "Divergência aqui indica que falta leitura do próprio negócio."}},

            {"id": "c30_pilar_atencao", "type": "radio", "required": True,
             "label": "Qual pilar do Método ECO mais precisa de atenção neste momento?",
             "options": PILARES_ECO + ["Mais de um pilar", "Ainda não sei informar"],
             "admin": {"indicador": "Autopercepção por pilar",
                       "objetivo": "Confrontar com o pilar de entrada calculado pelo score.",
                       "analise": "Se ela aponta pilar diferente do score, alinhe na reunião."}},

            {"id": "c30_clareza_direcao", "type": "scale", "required": True,
             "label": "Como você avalia a clareza da direção comercial da empresa hoje?",
             "options": ESCALA_5,
             "help": "1 é muito confusa. 5 é muito clara e já aplicada na prática.",
             "admin": {"indicador": "Clareza percebida",
                       "objetivo": "Linha de base da percepção, para comparar no Dia 180.",
                       "analise": "Subir de 2 para 4 ao longo da jornada é um bom sinal."}},
        ],
    },
    {
        "id": "d30_plano", "eyebrow": "Parte 2", "title": "Plano e implementação",
        "intro": "Agora vamos olhar o que saiu do papel.",
        "questions": [
            {"id": "c30_acoes", "type": "acoes_status", "required": True,
             "label": "Qual é o status de cada ação definida para este ciclo?",
             "help": "Marque como está cada uma. Se faltar alguma, você pode acrescentar.",
             "admin": {"indicador": "Taxa de execução do plano",
                       "objetivo": "Medir quanto do combinado virou realidade.",
                       "analise": "Abaixo de 50% concluído, o problema é capacidade ou prioridade."}},

            {"id": "c30_responsaveis", "type": "textarea",
             "label": "Quem ficou responsável por cada ação?",
             "placeholder": "Ex: script de atendimento com a Camila, CRM comigo",
             "admin": {"indicador": "Distribuição de responsabilidade",
                       "objetivo": "Ver se tudo recai sobre a mesma pessoa.",
                       "analise": "Nome único em todas as ações antecipa gargalo de execução."}},

            {"id": "c30_implementado", "type": "multiselect", "other": True, "required": True,
             "label": "O que foi efetivamente implementado até agora?",
             "options": ["Nova prioridade comercial", "Plano de ação", "Mapa do processo",
                         "Revisão da oferta", "Revisão do público", "Definição de metas",
                         "Revisão do funil", "Novo script", "Novo processo de atendimento",
                         "Novo processo de follow up", "Organização dos dados",
                         "Nada foi implementado"],
             "admin": {"indicador": "Volume de entregas do ciclo",
                       "objetivo": "Contar entregas concretas, não intenções.",
                       "analise": "Alimenta o contador de processos implantados no painel."}},

            {"id": "c30_maior_impacto", "type": "textarea",
             "label": "Qual ação teve maior impacto até agora?",
             "placeholder": "E por que você acha que foi essa.",
             "admin": {"indicador": "Alavanca percebida",
                       "objetivo": "Descobrir o que gera tração nesse negócio.",
                       "analise": "Use para dobrar a aposta no que já funcionou."}},
        ],
    },
    {
        "id": "d30_gargalos", "eyebrow": "Parte 3", "title": "Cenário e gargalos",
        "intro": "O que está travando merece o mesmo cuidado que o que avançou.",
        "questions": [
            {"id": "c30_gargalo", "type": "select", "other": True, "required": True,
             "label": "Qual é hoje o principal gargalo identificado na empresa?",
             "options": ["Estratégia", "Oferta", "Geração de oportunidades", "Atendimento",
                         "Qualificação", "Proposta", "Follow up", "Equipe",
                         "Ferramenta", "Indicadores"],
             "admin": {"indicador": "Gargalo declarado",
                       "objetivo": "Comparar com o gargalo de maior peso no score.",
                       "analise": "Convergência facilita a condução. Divergência exige alinhamento."}},

            {"id": "c30_dificuldade", "type": "multiselect", "other": True, "required": True,
             "label": "O que mais dificultou a execução neste primeiro ciclo?",
             "options": ["Falta de tempo", "Falta de clareza", "Falta de equipe",
                         "Falta de dados", "Falta de ferramenta", "Falta de prioridade",
                         "Resistência da equipe", "Excesso de demandas operacionais"],
             "admin": {"indicador": "Barreira de execução",
                       "objetivo": "Entender se o freio é de capacidade, clareza ou vontade.",
                       "analise": "Falta de tempo repetida costuma ser falta de prioridade."}},

            {"id": "c30_descoberta", "type": "textarea",
             "label": "O que a empresa descobriu sobre o próprio processo comercial?",
             "admin": {"indicador": "Aprendizado do ciclo",
                       "objetivo": "Registrar a virada de chave, quando acontece.",
                       "analise": "Material rico para o relatório de consolidação do Dia 180."}},

            {"id": "c30_falta_info", "type": "radio",
             "label": "Existe alguma informação importante que ainda falta para decidir melhor?",
             "options": ["Sim", "Não", "Não sei informar"],
             "followup": {"label": "Qual informação está faltando?", "type": "textarea"},
             "admin": {"indicador": "Lacuna de dados",
                       "objetivo": "Mapear o que impede decisão baseada em número.",
                       "analise": "Vira ação de instrumentação no ciclo seguinte."}},
        ],
    },
    {
        "id": "d30_resultado", "eyebrow": "Parte 4", "title": "Resultado e próximo ciclo",
        "intro": "Para fechar: o que você esperava, o que veio, e para onde vamos.",
        "questions": [
            {"id": "c30_esperado", "type": "textarea", "required": True,
             "label": "Qual resultado você esperava alcançar neste primeiro ciclo?",
             "admin": {"indicador": "Expectativa declarada",
                       "objetivo": "Comparar expectativa com entrega e calibrar promessas.",
                       "analise": "Expectativa fora da realidade precisa ser tratada cedo."}},

            {"id": "c30_alcancado", "type": "radio", "required": True,
             "label": "Esse resultado foi alcançado?",
             "options": ["Sim", "Parcialmente", "Não", "Ainda não é possível avaliar"],
             "admin": {"indicador": "Satisfação com o ciclo",
                       "objetivo": "Termômetro de risco de saída.",
                       "analise": "Dois ciclos seguidos com Não exige conversa de realinhamento."}},

            {"id": "c30_indicador_foco", "type": "indicador_ref", "required": True,
             "label": "Qual indicador deve ser acompanhado com mais atenção no próximo ciclo?",
             "admin": {"indicador": "Foco de medição",
                       "objetivo": "Definir o número que a próxima reunião vai cobrar.",
                       "analise": "Um indicador por ciclo. Mais que isso dispersa."}},

            {"id": "c30_proxima_prioridade", "type": "multiselect", "required": True,
             "max": 3, "other": True,
             "label": "Qual será a principal prioridade dos próximos 30 dias?",
             "help": "Escolha até três.",
             "options": ["Atrair mais leads", "Melhorar a qualidade dos leads",
                         "Responder mais rápido", "Aumentar os agendamentos",
                         "Aumentar o comparecimento", "Melhorar a apresentação da oferta",
                         "Aumentar a conversão", "Melhorar o follow up",
                         "Aumentar o ticket médio", "Organizar a equipe",
                         "Acompanhar os números", "Reduzir a dependência da proprietária"],
             "admin": {"indicador": "Prioridade do próximo ciclo",
                       "objetivo": "Alimenta as ações e a pergunta de abertura do Dia 60.",
                       "analise": "Mais de três prioridades significa nenhuma prioridade."}},

            {"id": "c30_apoio", "type": "multiselect", "other": True,
             "label": "Que apoio você precisa da B3 Sales para avançar?",
             "options": ["Clareza estratégica", "Construção de processo", "Script",
                         "Treinamento", "Análise de indicadores", "Organização da equipe",
                         "Ferramenta", "Revisão de oferta"],
             "admin": {"indicador": "Demanda de suporte",
                       "objetivo": "Dimensionar o esforço da B3 Sales no próximo mês.",
                       "analise": "Pedido recorrente vira entregável fixo da rota."}},

            {"id": "c30_anexos", "type": "files",
             "label": "Anexe documentos ou evidências criados neste ciclo.",
             "help": "Plano de ação, mapa do processo, nova oferta, apresentação, script, relatório."},
        ],
    },
]


# =====================================================================
# DIA 60 — Mês 2 | Processos e condução
# =====================================================================
DIA_60 = [
    {
        "id": "d60_processo", "eyebrow": "Parte 1", "title": "Estrutura do processo",
        "intro": "Vamos ver o que do processo comercial saiu da cabeça e virou combinado.",
        "questions": [
            {"id": "c60_etapas_revisadas", "type": "multiselect", "other": True, "required": True,
             "label": "Quais etapas do processo comercial foram revisadas neste ciclo?",
             "options": ETAPAS_FUNIL,
             "admin": {"indicador": "Cobertura da revisão",
                       "objetivo": "Ver se a revisão foi ponta a ponta ou pontual.",
                       "analise": "Revisar só o fim do funil não resolve entrada fraca."}},

            {"id": "c60_etapa_foco", "type": "select", "required": True,
             "label": "Qual etapa recebeu maior atenção?",
             "options": ETAPAS_FUNIL,
             "admin": {"indicador": "Etapa priorizada",
                       "objetivo": "Confirmar se atacou onde o número dói.",
                       "analise": "Compare com a etapa de maior perda nos indicadores."}},

            {"id": "c60_documentado", "type": "radio", "required": True,
             "label": "O processo comercial está documentado?",
             "options": ["Sim, está completo", "Está parcialmente documentado",
                         "Existem orientações informais", "Ainda não está documentado",
                         "Não sei informar"],
             "admin": {"indicador": "Maturidade documental",
                       "objetivo": "Documentação é o que torna o processo replicável.",
                       "analise": "Sem documento, a saída de uma pessoa leva o processo junto."}},

            {"id": "c60_equipe_sabe", "type": "radio", "required": True,
             "label": "A equipe sabe qual é o próximo passo em cada etapa?",
             "options": ["Sim, claramente", "Na maioria das vezes",
                         "Apenas algumas pessoas sabem", "Não", "Não sei informar"],
             "admin": {"indicador": "Clareza operacional",
                       "objetivo": "Documento existir não significa equipe saber.",
                       "analise": "Gap entre documentado e sabido indica falha de treino."}},

            {"id": "c60_adequado", "type": "radio",
             "label": "O processo atual está adequado ao tipo de cliente da empresa?",
             "options": ["Sim", "Parcialmente", "Não", "Ainda estamos validando"],
             "followup": {"label": "O que precisa ser ajustado?", "type": "textarea"},
             "admin": {"indicador": "Aderência ao ICP",
                       "objetivo": "Processo genérico costuma converter mal.",
                       "analise": "Reveja o ICP do Dia 0 antes de ajustar o processo."}},
        ],
    },
    {
        "id": "d60_atendimento", "eyebrow": "Parte 2", "title": "Atendimento e qualificação",
        "intro": "O primeiro contato define o resto da conversa.",
        "questions": [
            {"id": "c60_mudou_atendimento", "type": "multiselect", "other": True, "required": True,
             "label": "O que mudou no primeiro atendimento desde o início da implementação?",
             "options": ["A resposta está mais rápida", "O atendimento está mais organizado",
                         "A equipe faz mais perguntas", "O atendimento está mais personalizado",
                         "O cliente recebe informações mais claras", "Nada mudou ainda"],
             "admin": {"indicador": "Mudança na porta de entrada",
                       "objetivo": "Primeira resposta é onde mais se perde venda.",
                       "analise": "Nada mudou aqui no Dia 60 é sinal de alerta."}},

            {"id": "c60_investiga", "type": "multiselect", "other": True, "required": True,
             "label": "Quais informações a equipe passou a investigar antes de apresentar a oferta?",
             "options": ["Necessidade", "Problema", "Objetivo", "Urgência", "Prazo",
                         "Investimento", "Autoridade de decisão", "Histórico",
                         "Expectativa de resultado", "Nenhuma"],
             "admin": {"indicador": "Profundidade de qualificação",
                       "objetivo": "Comparar com a resposta do Dia 0.",
                       "analise": "Menos de três itens ainda é preço sem diagnóstico."}},

            {"id": "c60_qualifica_melhor", "type": "scale", "required": True,
             "label": "A equipe está qualificando melhor as oportunidades?",
             "options": ESCALA_5,
             "help": "1 é nada mudou. 5 é mudou muito.",
             "admin": {"indicador": "Evolução da qualificação",
                       "objetivo": "Percepção da liderança sobre o time.",
                       "analise": "Cruze com a conversão de proposta para validar."}},

            {"id": "c60_dificuldade_qualif", "type": "select", "other": True,
             "label": "Qual é a principal dificuldade na qualificação?",
             "options": ["O lead não responde", "A equipe não faz perguntas",
                         "A equipe tem medo de perguntar sobre investimento",
                         "O cliente não demonstra urgência", "Não existe padrão",
                         "O lead não possui perfil"],
             "admin": {"indicador": "Trava de qualificação",
                       "objetivo": "Separar problema de origem de problema de condução.",
                       "analise": "Medo de falar de dinheiro se resolve com treino e script."}},

            {"id": "c60_gargalo_ate_proposta", "type": "select", "other": True, "required": True,
             "label": "Qual é o principal gargalo atual entre o primeiro contato e a proposta?",
             "options": ["Tempo de resposta", "Qualificação", "Agendamento",
                         "Comparecimento", "Diagnóstico", "Apresentação"],
             "admin": {"indicador": "Gargalo do meio de funil",
                       "objetivo": "Onde a oportunidade morre antes de virar proposta.",
                       "analise": "Direciona o foco de condução do próximo ciclo."}},
        ],
    },
    {
        "id": "d60_proposta", "eyebrow": "Parte 3", "title": "Proposta e follow up",
        "intro": "Proposta enviada sem conversa é orçamento. Vamos ver como está.",
        "questions": [
            {"id": "c60_proposta_como", "type": "select", "other": True, "required": True,
             "label": "Como a proposta está sendo apresentada atualmente?",
             "options": ["Reunião estruturada", "Apresentação personalizada", "WhatsApp",
                         "E-mail", "Página ou checkout", "Ainda não existe padrão"],
             "admin": {"indicador": "Forma de apresentação",
                       "objetivo": "Proposta ao vivo converte mais que proposta enviada.",
                       "analise": "Migrar de WhatsApp para reunião costuma ser ganho rápido."}},

            {"id": "c60_proposta_mudou", "type": "multiselect", "other": True,
             "label": "O que foi alterado na proposta ou apresentação comercial?",
             "options": ["Estrutura", "Clareza da oferta", "Benefícios", "Entregáveis",
                         "Preço", "Formas de pagamento", "Provas", "Objeções",
                         "Chamada para decisão", "Nada foi alterado"],
             "admin": {"indicador": "Evolução da oferta",
                       "objetivo": "Registrar o trabalho feito sobre a peça comercial.",
                       "analise": "Alimenta o comparativo de materiais do relatório."}},

            {"id": "c60_followup_cadencia", "type": "radio", "required": True,
             "label": "O follow up passou a ter uma cadência definida?",
             "options": ["Sim, está sendo seguido", "Sim, mas ainda de forma irregular",
                         "Está em construção", "Ainda não", "Não se aplica"],
             "admin": {"indicador": "Cadência de follow up",
                       "objetivo": "Follow up estruturado é a maior alavanca de conversão.",
                       "analise": "Compare com a resposta do Dia 0 para medir avanço."}},

            {"id": "c60_objecao", "type": "select", "other": True, "required": True,
             "label": "Qual é a principal objeção que continua aparecendo?",
             "options": OBJECOES,
             "admin": {"indicador": "Objeção dominante",
                       "objetivo": "Objeção repetida é falha de etapa anterior.",
                       "analise": "Preço no fim quase sempre é valor mal construído no início."}},

            {"id": "c60_trata_objecao", "type": "textarea",
             "label": "Como a equipe está tratando essa objeção?",
             "placeholder": "Escreva como a conversa costuma ir.",
             "admin": {"indicador": "Qualidade da quebra",
                       "objetivo": "Insumo direto para escrever a quebra de objeção.",
                       "analise": "Se a resposta for desconto, há problema de ancoragem."}},
        ],
    },
    {
        "id": "d60_indicadores", "eyebrow": "Parte 4", "title": "Indicadores e próximos passos",
        "intro": "Fechando o ciclo com número e direção.",
        "questions": [
            {"id": "c60_indicadores_acomp", "type": "indicador_ref", "multi": True,
             "required": True,
             "label": "Quais indicadores foram acompanhados neste ciclo?",
             "admin": {"indicador": "Disciplina de medição",
                       "objetivo": "Ver se o indicador escolhido no Dia 30 foi mesmo seguido.",
                       "analise": "Indicador escolhido e não acompanhado é rotina que não pegou."}},

            {"id": "c60_mudanca_numeros", "type": "textarea",
             "label": "Qual foi a principal mudança nos números?",
             "placeholder": "Pode ser uma melhora ou uma piora. As duas ensinam.",
             "admin": {"indicador": "Leitura do resultado",
                       "objetivo": "Comparar a percepção com o comparativo automático.",
                       "analise": "Percepção descolada do dado indica falta de painel."}},

            {"id": "c60_etapa_corrigir", "type": "select", "required": True,
             "label": "Qual etapa do processo ainda precisa ser corrigida?",
             "options": ETAPAS_FUNIL,
             "admin": {"indicador": "Dívida de processo",
                       "objetivo": "Entra direto na rota do Dia 90.",
                       "analise": "Mesma etapa por dois ciclos vira prioridade obrigatória."}},

            {"id": "c60_prioridade_conducao", "type": "multiselect", "max": 3, "other": True,
             "required": True,
             "label": "Qual será a prioridade de condução para os próximos 30 dias?",
             "help": "Escolha até três.",
             "options": ["Padronizar o atendimento", "Melhorar a qualificação",
                         "Estruturar o follow up", "Reescrever a proposta",
                         "Treinar quebra de objeção", "Organizar o CRM",
                         "Aumentar o comparecimento", "Reduzir tempo de resposta"],
             "admin": {"indicador": "Prioridade de condução",
                       "objetivo": "Define o foco do ciclo de time e execução.",
                       "analise": "Alimenta as ações do Dia 90."}},

            {"id": "c60_anexos", "type": "files",
             "label": "Anexe os scripts, propostas, fluxos ou materiais atualizados neste ciclo."},
        ],
    },
]


# =====================================================================
# DIA 90 — Mês 3 | Time e execução
# =====================================================================
DIA_90 = [
    {
        "id": "d90_pessoas", "eyebrow": "Parte 1", "title": "Pessoas e responsabilidades",
        "intro": "Processo bom com papel indefinido não anda.",
        "questions": [
            {"id": "c90_responsabilidades", "type": "radio", "required": True,
             "label": "As responsabilidades comerciais estão claras para a equipe?",
             "options": ["Sim, para todos", "Para a maioria", "Parcialmente",
                         "Não estão claras"],
             "admin": {"indicador": "Clareza de papéis",
                       "objetivo": "Papel difuso gera oportunidade sem dono.",
                       "analise": "Cruze com oportunidades paradas no funil."}},

            {"id": "c90_dono_etapa", "type": "radio", "required": True,
             "label": "Cada etapa possui uma pessoa responsável?",
             "options": ["Sim", "Parcialmente", "Não", "Não sei informar"],
             "admin": {"indicador": "Cobertura de responsabilidade",
                       "objetivo": "Etapa sem dono é etapa que ninguém melhora.",
                       "analise": "Base para desenhar o organograma comercial."}},

            {"id": "c90_acumulo", "type": "radio", "required": True,
             "label": "Existem pessoas acumulando funções que estão prejudicando a execução?",
             "options": ["Sim", "Não", "Talvez", "Não sei informar"],
             "followup": {"label": "Quais funções estão acumuladas?", "type": "textarea"},
             "admin": {"indicador": "Sobrecarga",
                       "objetivo": "Acúmulo é a causa silenciosa de plano não executado.",
                       "analise": "Compare com a estrutura declarada no Dia 0."}},

            {"id": "c90_recursos", "type": "radio",
             "label": "A equipe possui os recursos necessários para executar o processo?",
             "options": ["Sim", "Parcialmente", "Não", "Não sei informar"],
             "admin": {"indicador": "Suficiência de recursos",
                       "objetivo": "Separar falta de querer de falta de poder.",
                       "analise": "Cobrar execução sem recurso quebra a confiança do time."}},

            {"id": "c90_funcao_faltando", "type": "textarea",
             "label": "Qual função ainda está faltando ou precisa ser melhor estruturada?",
             "admin": {"indicador": "Lacuna de time",
                       "objetivo": "Antecipa a conversa de contratação.",
                       "analise": "Insumo para o plano de estrutura do Dia 150."}},
        ],
    },
    {
        "id": "d90_treino", "eyebrow": "Parte 2", "title": "Treinamento e adesão",
        "intro": "Treino sem aplicação é custo. Vamos medir a adesão.",
        "questions": [
            {"id": "c90_quem_treinou", "type": "multiselect", "required": True,
             "label": "Quem recebeu treinamento sobre o processo comercial?",
             "options": ["Toda a equipe", "Apenas o gestor", "Apenas os vendedores",
                         "Apenas o atendimento", "Parte da equipe", "Ninguém",
                         "Não se aplica"],
             "admin": {"indicador": "Alcance do treinamento",
                       "objetivo": "Treinar só o gestor não muda o atendimento.",
                       "analise": "Cobertura parcial explica execução irregular."}},

            {"id": "c90_temas", "type": "multiselect", "other": True,
             "label": "Quais temas foram trabalhados no treinamento?",
             "options": ["Atendimento", "Qualificação", "Oferta", "Objeções",
                         "Follow up", "CRM", "Indicadores", "Pós venda"],
             "admin": {"indicador": "Conteúdo aplicado",
                       "objetivo": "Registrar a trilha construída até aqui.",
                       "analise": "Entra no relatório de materiais entregues."}},

            {"id": "c90_aplicando", "type": "scale", "required": True,
             "label": "A equipe está aplicando o que foi treinado?",
             "options": ESCALA_5,
             "help": "1 é não aplica. 5 é aplica todo dia.",
             "admin": {"indicador": "Adesão ao treino",
                       "objetivo": "O número que separa treino de teatro.",
                       "analise": "Abaixo de 3 exige auditoria de conversa, não mais treino."}},

            {"id": "c90_melhorou", "type": "multiselect", "other": True, "required": True,
             "label": "Qual comportamento comercial melhorou?",
             "options": COMPORTAMENTOS,
             "admin": {"indicador": "Ganho comportamental",
                       "objetivo": "Mostrar evolução concreta do time no relatório.",
                       "analise": "Comportamento é o que sustenta o número."}},

            {"id": "c90_corrigir", "type": "multiselect", "other": True, "required": True,
             "label": "Qual comportamento ainda precisa ser corrigido?",
             "options": COMPORTAMENTOS,
             "admin": {"indicador": "Dívida comportamental",
                       "objetivo": "Pauta direta da próxima sessão de treino.",
                       "analise": "Repetição por dois ciclos indica pessoa errada na função."}},
        ],
    },
    {
        "id": "d90_execucao", "eyebrow": "Parte 3", "title": "Execução e acompanhamento",
        "intro": "O que não é acompanhado volta ao que era.",
        "questions": [
            {"id": "c90_como_acompanha", "type": "multiselect", "other": True, "required": True,
             "label": "Como a execução do processo está sendo acompanhada?",
             "options": ["Reunião diária", "Reunião semanal", "Auditoria de conversas",
                         "Relatório", "CRM", "Acompanhamento informal",
                         "Não está sendo acompanhada"],
             "admin": {"indicador": "Rotina de acompanhamento",
                       "objetivo": "Sem rotina, o processo dura três semanas.",
                       "analise": "Só informal significa que ainda não há gestão."}},

            {"id": "c90_ve_parado", "type": "radio", "required": True,
             "label": "A liderança consegue identificar rapidamente quando uma oportunidade está parada?",
             "options": ["Sim", "Parcialmente", "Não", "Não sei informar"],
             "admin": {"indicador": "Visibilidade do funil",
                       "objetivo": "Base para gestão preventiva em vez de reativa.",
                       "analise": "Não aqui costuma vir junto de CRM desatualizado."}},

            {"id": "c90_registra", "type": "radio", "required": True,
             "label": "A equipe está registrando corretamente as oportunidades?",
             "options": ["Sim", "Na maioria das vezes", "Pouco", "Não", "Não sei informar"],
             "admin": {"indicador": "Confiabilidade do dado",
                       "objetivo": "Dado ruim invalida qualquer indicador daqui pra frente.",
                       "analise": "Se o registro falha, trate antes de olhar conversão."}},

            {"id": "c90_falha_execucao", "type": "select", "other": True, "required": True,
             "label": "Qual é o principal motivo de falha na execução?",
             "options": ["Falta de treinamento", "Falta de acompanhamento",
                         "Falta de disciplina", "Falta de clareza", "Falta de ferramenta",
                         "Excesso de tarefas", "Resistência"],
             "admin": {"indicador": "Causa raiz da falha",
                       "objetivo": "Direciona se a ação é treino, gestão ou estrutura.",
                       "analise": "Resistência exige conversa individual, não processo novo."}},

            {"id": "c90_evolucao_equipe", "type": "textarea",
             "label": "Qual foi a maior evolução da equipe desde o Dia 0?",
             "admin": {"indicador": "Narrativa de evolução",
                       "objetivo": "Material para o relatório do cliente.",
                       "analise": "Guarde a frase dela. Vale mais que gráfico."}},
        ],
    },
    {
        "id": "d90_resultado", "eyebrow": "Parte 4", "title": "Resultado e próximo ciclo",
        "intro": "Metade do caminho. Vamos medir.",
        "questions": [
            {"id": "c90_indicador_melhorou", "type": "indicador_ref", "required": True,
             "label": "Qual indicador melhorou com a atuação da equipe?",
             "admin": {"indicador": "Ganho atribuível ao time",
                       "objetivo": "Conectar comportamento com resultado.",
                       "analise": "Prova concreta para sustentar a continuidade."}},

            {"id": "c90_indicador_abaixo", "type": "indicador_ref", "required": True,
             "label": "Qual indicador ainda está abaixo do esperado?",
             "admin": {"indicador": "Dívida de resultado",
                       "objetivo": "Foco do ciclo de gestão e recuperação.",
                       "analise": "Entra direto na rota do Dia 120."}},

            {"id": "c90_sem_a_dona", "type": "radio", "required": True,
             "label": "O processo funciona quando a proprietária não está acompanhando diretamente?",
             "options": ["Sim", "Parcialmente", "Não", "Ainda não foi possível avaliar"],
             "admin": {"indicador": "Independência da liderança",
                       "objetivo": "O indicador central da jornada ECO.",
                       "analise": "Compare com Dia 150 e Dia 180 para mostrar autonomia."}},

            {"id": "c90_prioridade_execucao", "type": "multiselect", "max": 3, "other": True,
             "required": True,
             "label": "Qual será a principal prioridade para melhorar a execução?",
             "help": "Escolha até três.",
             "options": ["Treinar a equipe", "Criar rotina de acompanhamento",
                         "Auditar conversas", "Redistribuir funções",
                         "Melhorar o registro no CRM", "Contratar",
                         "Definir metas individuais", "Reduzir tarefas operacionais"],
             "admin": {"indicador": "Prioridade de execução",
                       "objetivo": "Alimenta as ações do Dia 120.",
                       "analise": "Contratar sem processo pronto costuma piorar."}},

            {"id": "c90_anexos", "type": "files",
             "label": "Anexe treinamentos, auditorias, relatórios ou evidências deste ciclo."},
        ],
    },
]


# =====================================================================
# DIA 120 — Mês 4 | Gestão e recuperação
# =====================================================================
DIA_120 = [
    {
        "id": "d120_indicadores", "eyebrow": "Parte 1", "title": "Gestão dos indicadores",
        "intro": "Decisão boa nasce de número olhado com frequência.",
        "questions": [
            {"id": "c120_indicadores_freq", "type": "indicador_ref", "multi": True,
             "required": True,
             "label": "Quais indicadores passaram a ser acompanhados com mais frequência?",
             "admin": {"indicador": "Evolução da medição",
                       "objetivo": "Comparar com o Dia 0, onde muitos não acompanhavam nada.",
                       "analise": "Crescimento aqui é prova direta de maturidade."}},

            {"id": "c120_frequencia", "type": "radio", "required": True,
             "label": "Com que frequência a equipe analisa os resultados?",
             "options": ["Diariamente", "Semanalmente", "Quinzenalmente", "Mensalmente",
                         "Apenas quando surge um problema", "Ainda não analisa"],
             "admin": {"indicador": "Cadência de análise",
                       "objetivo": "Semanal é o mínimo para corrigir dentro do mês.",
                       "analise": "Mensal só permite constatar, não corrigir."}},

            {"id": "c120_decide_com_dado", "type": "radio", "required": True,
             "label": "As decisões comerciais estão sendo tomadas com base nos dados?",
             "options": ["Sim", "Parcialmente", "Não", "Não sei informar"],
             "admin": {"indicador": "Gestão por dado",
                       "objetivo": "A virada de gestão por percepção para gestão por número.",
                       "analise": "Principal marco de maturidade do pilar Operação."}},

            {"id": "c120_indicador_util", "type": "indicador_ref",
             "label": "Qual indicador mais ajuda a entender o cenário atual?",
             "admin": {"indicador": "Indicador âncora",
                       "objetivo": "Descobrir a métrica que a dona realmente usa.",
                       "analise": "Coloque esse indicador no topo do painel dela."}},

            {"id": "c120_indicador_falta", "type": "indicador_ref", "other": True,
             "label": "Qual indicador ainda não está sendo acompanhado, mas deveria?",
             "admin": {"indicador": "Lacuna de medição",
                       "objetivo": "Próxima instrumentação a construir.",
                       "analise": "Vira ação técnica no ciclo seguinte."}},
        ],
    },
    {
        "id": "d120_recuperacao", "eyebrow": "Parte 2", "title": "Follow up e recuperação",
        "intro": "O dinheiro mais barato está na base que já existe.",
        "questions": [
            {"id": "c120_trabalha_perdidas", "type": "radio", "required": True,
             "label": "A empresa está trabalhando oportunidades que não fecharam?",
             "options": ["Sim, com processo definido", "Sim, mas de forma pontual",
                         "Ainda não", "Não possui base", "Não sei informar"],
             "admin": {"indicador": "Recuperação de perdidas",
                       "objetivo": "Receita adormecida é a vitória mais rápida.",
                       "analise": "Ainda não com base grande é oportunidade imediata."}},

            {"id": "c120_clientes_antigos", "type": "radio", "required": True,
             "label": "A empresa está trabalhando clientes antigos?",
             "options": ["Sim, com frequência", "Às vezes", "Ainda não", "Não se aplica"],
             "admin": {"indicador": "Reativação de base",
                       "objetivo": "Recompra custa uma fração da aquisição.",
                       "analise": "Cruze com o tamanho da base informado no Dia 0."}},

            {"id": "c120_recuperadas", "type": "number", "unknown": True,
             "label": "Quantas oportunidades foram recuperadas neste ciclo?",
             "admin": {"indicador": "Volume recuperado",
                       "objetivo": "Número concreto de receita resgatada.",
                       "analise": "Excelente material para o relatório do cliente."}},

            {"id": "c120_vendas_reativacao", "type": "number", "unknown": True,
             "label": "Quantas vendas vieram de clientes antigos ou reativação?",
             "admin": {"indicador": "Receita de base",
                       "objetivo": "Mostra dependência de aquisição nova.",
                       "analise": "Zero aqui com base existente é gargalo evidente."}},

            {"id": "c120_estrategia_recup", "type": "select", "other": True,
             "label": "Qual estratégia de recuperação apresentou melhor resultado?",
             "options": ["Follow up", "Reativação", "Indicação", "Oferta complementar",
                         "Campanha", "Contato pessoal", "Nenhuma"],
             "admin": {"indicador": "Alavanca de recuperação",
                       "objetivo": "Descobrir o que funciona nesse negócio para repetir.",
                       "analise": "Transforme a que funcionou em rotina fixa."}},
        ],
    },
    {
        "id": "d120_rotina", "eyebrow": "Parte 3", "title": "Rotina de gestão",
        "intro": "Gestão é o que impede o processo de voltar atrás.",
        "questions": [
            {"id": "c120_rotinas", "type": "multiselect", "other": True, "required": True,
             "label": "Quais rotinas de gestão comercial estão acontecendo?",
             "options": ["Reunião de acompanhamento", "Análise de indicadores",
                         "Auditoria de conversas", "Revisão de metas", "Treinamento",
                         "Planejamento semanal", "Revisão de oportunidades", "Nenhuma"],
             "admin": {"indicador": "Densidade de rotina",
                       "objetivo": "Contar os rituais que sustentam a operação.",
                       "analise": "Menos de duas rotinas não sustenta o que foi construído."}},

            {"id": "c120_equipe_sabe_melhorar", "type": "radio",
             "label": "A equipe sabe o que precisa melhorar a cada semana?",
             "options": ["Sim", "Parcialmente", "Não", "Não sei informar"],
             "admin": {"indicador": "Clareza de melhoria",
                       "objetivo": "Feedback específico é o que muda comportamento.",
                       "analise": "Não aqui indica reunião de status, não de gestão."}},

            {"id": "c120_age_antes", "type": "radio", "required": True,
             "label": "A liderança consegue agir antes que o problema afete o resultado?",
             "options": ["Sim", "Às vezes", "Ainda não", "Não sei informar"],
             "admin": {"indicador": "Gestão preventiva",
                       "objetivo": "A diferença entre apagar incêndio e conduzir.",
                       "analise": "Sim aqui é sinal forte de operação madura."}},

            {"id": "c120_risco", "type": "select", "other": True, "required": True,
             "label": "Qual é o maior risco comercial atual?",
             "options": ["Falta de leads", "Baixa conversão", "Equipe",
                         "Dependência da proprietária", "Falta de acompanhamento",
                         "Falta de dados", "Falta de processo"],
             "admin": {"indicador": "Risco declarado",
                       "objetivo": "Antecipar o que pode derrubar o resultado.",
                       "analise": "Trate o risco antes de buscar crescimento."}},

            {"id": "c120_decisao", "type": "textarea",
             "label": "Qual decisão de gestão foi mais importante neste ciclo?",
             "admin": {"indicador": "Marco de gestão",
                       "objetivo": "Registrar a decisão que mudou o jogo.",
                       "analise": "Entra na linha do tempo do relatório final."}},
        ],
    },
    {
        "id": "d120_resultado", "eyebrow": "Parte 4", "title": "Resultado e próximo ciclo",
        "intro": "Dois terços do caminho. O que já virou resultado?",
        "questions": [
            {"id": "c120_melhorou", "type": "textarea", "required": True,
             "label": "Qual resultado melhorou depois da implantação das rotinas?",
             "admin": {"indicador": "Ganho atribuível à gestão",
                       "objetivo": "Conectar rotina com número.",
                       "analise": "Argumento central para manter a rotina viva."}},

            {"id": "c120_recuperar", "type": "indicador_ref",
             "label": "Qual resultado ainda precisa ser recuperado?",
             "followup": {"label": "O que você acha que está segurando?", "type": "textarea"},
             "admin": {"indicador": "Dívida de resultado",
                       "objetivo": "Foco do ciclo de otimização.",
                       "analise": "Entra na rota do Dia 150."}},

            {"id": "c120_area_atencao", "type": "select", "other": True, "required": True,
             "label": "Qual área precisa de maior atenção no próximo ciclo?",
             "options": PILARES_ECO + ["Time", "Gestão"],
             "admin": {"indicador": "Foco do próximo ciclo",
                       "objetivo": "Confrontar com o pilar mais fraco do score.",
                       "analise": "Alinhe divergências antes de montar a rota."}},

            {"id": "c120_prioridade", "type": "multiselect", "max": 3, "other": True,
             "required": True,
             "label": "Qual será a prioridade dos próximos 30 dias?",
             "help": "Escolha até três.",
             "options": ["Aumentar a conversão", "Recuperar oportunidades perdidas",
                         "Reativar a base", "Consolidar as rotinas de gestão",
                         "Melhorar os indicadores", "Reduzir dependência da liderança",
                         "Aumentar o ticket médio", "Estruturar o time"],
             "admin": {"indicador": "Prioridade de otimização",
                       "objetivo": "Alimenta as ações do Dia 150.",
                       "analise": "A partir daqui o foco vira autonomia."}},

            {"id": "c120_anexos", "type": "files",
             "label": "Anexe relatórios, campanhas ou evidências de recuperação."},
        ],
    },
]


# =====================================================================
# DIA 150 — Mês 5 | Otimização e autonomia
# =====================================================================
DIA_150 = [
    {
        "id": "d150_melhorias", "eyebrow": "Parte 1", "title": "Melhorias implementadas",
        "intro": "Vamos separar o que está redondo do que ainda range.",
        "questions": [
            {"id": "c150_maior_melhoria", "type": "textarea", "required": True,
             "label": "Qual foi a melhoria mais importante realizada até agora?",
             "admin": {"indicador": "Marco da jornada",
                       "objetivo": "A frase que abre o relatório de consolidação.",
                       "analise": "Guarde no texto original dela."}},

            {"id": "c150_funcionando", "type": "multiselect", "other": True, "required": True,
             "label": "Quais processos estão funcionando melhor?",
             "options": PROCESSOS,
             "admin": {"indicador": "Processos consolidados",
                       "objetivo": "Contar o que já é ativo da empresa.",
                       "analise": "Alimenta o painel de processos implantados."}},

            {"id": "c150_abaixo", "type": "select", "required": True,
             "label": "Qual processo ainda está abaixo do esperado?",
             "options": PROCESSOS,
             "admin": {"indicador": "Processo frágil",
                       "objetivo": "Último ajuste antes do encerramento.",
                       "analise": "Se não resolver aqui, entra no plano de continuidade."}},

            {"id": "c150_retrabalho", "type": "multiselect", "other": True,
             "label": "O que está gerando retrabalho?",
             "options": ["Falta de informação", "Falta de registro", "Falta de padrão",
                         "Falta de treinamento", "Falha na comunicação",
                         "Falta de ferramenta", "Excesso de aprovação"],
             "admin": {"indicador": "Fonte de desperdício",
                       "objetivo": "Retrabalho consome a capacidade de crescer.",
                       "analise": "Excesso de aprovação aponta direto para dependência."}},

            {"id": "c150_maior_ganho", "type": "textarea",
             "label": "Qual ajuste traria maior ganho para a empresa neste momento?",
             "admin": {"indicador": "Alavanca final",
                       "objetivo": "Onde concentrar o último mês de trabalho.",
                       "analise": "Priorize o que ela mesma apontou."}},
        ],
    },
    {
        "id": "d150_autonomia", "eyebrow": "Parte 2", "title": "Autonomia",
        "intro": "O objetivo sempre foi este: a operação andar sem depender de uma pessoa.",
        "questions": [
            {"id": "c150_sem_dona", "type": "multiselect", "other": True, "required": True,
             "label": "Quais atividades a equipe já executa sem depender diretamente da proprietária?",
             "options": ["Atendimento", "Qualificação", "Agendamento", "Proposta",
                         "Follow up", "Fechamento", "Atualização do CRM", "Relatórios",
                         "Pós venda", "Recompra", "Nenhuma"],
             "admin": {"indicador": "Grau de autonomia",
                       "objetivo": "O indicador mais importante da jornada.",
                       "analise": "Compare a contagem com o Dia 90 e mostre a evolução."}},

            {"id": "c150_ausencia", "type": "radio", "required": True,
             "label": "O processo comercial funcionaria durante a ausência da proprietária?",
             "options": ["Sim, normalmente", "Sim, com alguns ajustes", "Parcialmente",
                         "Não", "Não se aplica"],
             "admin": {"indicador": "Teste de ausência",
                       "objetivo": "Pergunta direta sobre dependência.",
                       "analise": "Sequência Não, Parcialmente, Sim conta a história inteira."}},

            {"id": "c150_resolve_sozinha", "type": "radio", "required": True,
             "label": "A equipe consegue identificar e resolver problemas sem esperar uma decisão da liderança?",
             "options": ["Sim", "Na maioria das vezes", "Parcialmente", "Não"],
             "admin": {"indicador": "Autonomia decisória",
                       "objetivo": "Autonomia de execução é diferente de autonomia de decisão.",
                       "analise": "Sem esta, a dona continua sendo o gargalo."}},

            {"id": "c150_concentrada", "type": "textarea",
             "label": "Qual atividade ainda está excessivamente concentrada em uma pessoa?",
             "admin": {"indicador": "Ponto único de falha",
                       "objetivo": "Risco operacional a documentar antes do fim.",
                       "analise": "Vira prioridade de documentação no Dia 180."}},

            {"id": "c150_documentar", "type": "multiselect", "other": True, "required": True,
             "label": "O que precisa ser documentado antes da consolidação?",
             "options": ["Processo", "Script", "Responsabilidades", "Indicadores",
                         "Rotinas", "Treinamentos", "Follow up"],
             "admin": {"indicador": "Dívida documental",
                       "objetivo": "Lista de entrega do último mês.",
                       "analise": "Documentação é o que fica depois que a B3 Sales sai."}},
        ],
    },
    {
        "id": "d150_crescimento", "eyebrow": "Parte 3", "title": "Oportunidades de crescimento",
        "intro": "Com a casa em ordem, dá para olhar para frente.",
        "questions": [
            {"id": "c150_oportunidade", "type": "select", "other": True, "required": True,
             "label": "Qual oportunidade de crescimento ficou mais clara durante a implementação?",
             "options": ["Novo produto", "Novo serviço", "Venda complementar", "Recompra",
                         "Indicação", "Novo canal", "Expansão de equipe", "Novo público"],
             "admin": {"indicador": "Vetor de crescimento",
                       "objetivo": "Insumo para a proposta de continuidade.",
                       "analise": "Conecte com a esteira de produtos do Dia 0."}},

            {"id": "c150_oferta_foco", "type": "textarea",
             "label": "Qual oferta deveria receber mais atenção comercial?",
             "admin": {"indicador": "Foco de oferta",
                       "objetivo": "Concentrar esforço no que tem melhor margem e giro.",
                       "analise": "Cruze com o ticket médio por produto."}},

            {"id": "c150_canal", "type": "select", "other": True,
             "label": "Qual canal apresenta maior potencial de crescimento?",
             "options": ["Instagram", "WhatsApp", "Google", "Indicação", "Tráfego pago",
                         "Prospecção", "Base antiga", "Parcerias"],
             "admin": {"indicador": "Canal de expansão",
                       "objetivo": "Onde investir no próximo semestre.",
                       "analise": "Compare com os canais declarados no Dia 0."}},

            {"id": "c150_recurso_falta", "type": "select", "other": True,
             "label": "Qual recurso está faltando para aproveitar essa oportunidade?",
             "options": ["Pessoas", "Processo", "Ferramenta", "Investimento",
                         "Treinamento", "Oferta", "Tempo"],
             "admin": {"indicador": "Restrição de crescimento",
                       "objetivo": "O que destravar para escalar.",
                       "analise": "Base da proposta de continuidade."}},

            {"id": "c150_ajuste_final", "type": "textarea",
             "label": "O que precisa ser ajustado antes do encerramento dos 180 dias?",
             "admin": {"indicador": "Pendência de encerramento",
                       "objetivo": "Evitar surpresa na reunião final.",
                       "analise": "Resolva no mês seguinte, sem exceção."}},
        ],
    },
    {
        "id": "d150_resultado", "eyebrow": "Parte 4", "title": "Resultado e próximo ciclo",
        "intro": "Reta final.",
        "questions": [
            {"id": "c150_maior_evolucao", "type": "indicador_ref", "required": True,
             "label": "Qual indicador apresentou a maior evolução até agora?",
             "admin": {"indicador": "Prova de resultado",
                       "objetivo": "O número que sustenta o caso de sucesso.",
                       "analise": "Puxe o comparativo automático com o Dia 0."}},

            {"id": "c150_atencao", "type": "indicador_ref", "required": True,
             "label": "Qual indicador ainda precisa de atenção?",
             "admin": {"indicador": "Pendência de número",
                       "objetivo": "O que ainda não virou resultado.",
                       "analise": "Trate com honestidade na reunião final."}},

            {"id": "c150_nivel_autonomia", "type": "scale", "required": True,
             "label": "Como você avalia o nível de autonomia atual da empresa?",
             "options": ESCALA_5,
             "help": "1 é tudo depende de mim. 5 é a operação anda sozinha.",
             "admin": {"indicador": "Autonomia percebida",
                       "objetivo": "Compare com a mesma escala no Dia 180.",
                       "analise": "É a métrica que resume a entrega da B3 Sales."}},

            {"id": "c150_prioridade_final", "type": "multiselect", "max": 3, "other": True,
             "required": True,
             "label": "Qual será a prioridade final antes do encerramento?",
             "help": "Escolha até três.",
             "options": ["Documentar tudo", "Treinar a equipe no que falta",
                         "Consolidar indicadores", "Reduzir dependência da liderança",
                         "Fechar o ciclo de vendas pendentes",
                         "Preparar o plano de continuidade", "Estruturar contratação"],
             "admin": {"indicador": "Prioridade de encerramento",
                       "objetivo": "Alimenta as ações do Dia 180.",
                       "analise": "Documentação costuma ser a mais negligenciada."}},

            {"id": "c150_anexos", "type": "files",
             "label": "Anexe documentos, processos ou materiais atualizados neste ciclo."},
        ],
    },
]


# =====================================================================
# DIA 180 — Mês 6 | Consolidação e continuidade
# =====================================================================
DIA_180 = [
    {
        "id": "d180_comparacao", "eyebrow": "Parte 1", "title": "Comparação com o cenário inicial",
        "intro": "Seis meses depois. Vamos olhar de onde a empresa saiu e onde ela chegou.",
        "questions": [
            {"id": "c180_mudou", "type": "multiselect", "other": True, "required": True,
             "label": "O que mudou na empresa desde o Dia 0?",
             "options": ["Mais clareza estratégica", "Processo comercial mais organizado",
                         "Atendimento mais padronizado", "Melhor qualificação",
                         "Melhor follow up", "Equipe mais preparada",
                         "Indicadores mais claros", "Maior autonomia",
                         "Mais previsibilidade", "Aumento de vendas",
                         "Aumento de faturamento"],
             "admin": {"indicador": "Transformação percebida",
                       "objetivo": "A lista que abre o relatório final.",
                       "analise": "Compare com o que foi prometido no Dia 0."}},

            {"id": "c180_maior_transformacao", "type": "textarea", "required": True,
             "label": "Qual foi a maior transformação percebida?",
             "admin": {"indicador": "Depoimento espontâneo",
                       "objetivo": "Frase de depoimento, se ela autorizar o uso.",
                       "analise": "Não edite. O texto dela vale mais."}},

            {"id": "c180_comprova", "type": "indicador_ref", "required": True,
             "label": "Qual resultado mais comprova a evolução da empresa?",
             "followup": {"label": "Conte um pouco sobre esse resultado.", "type": "textarea"},
             "admin": {"indicador": "Prova principal",
                       "objetivo": "O número do caso de sucesso.",
                       "analise": "Puxe o comparativo Dia 0 contra Dia 180."}},

            {"id": "c180_nao_alcancado", "type": "textarea",
             "label": "Qual resultado ainda não foi alcançado?",
             "admin": {"indicador": "Expectativa em aberto",
                       "objetivo": "Tratar com honestidade sustenta a renovação.",
                       "analise": "Vira escopo da proposta de continuidade."}},
        ],
    },
    {
        "id": "d180_consolidacao", "eyebrow": "Parte 2", "title": "Consolidação do ECO",
        "intro": "O que ficou instalado na empresa.",
        "questions": [
            {"id": "c180_implantados", "type": "multiselect", "other": True, "required": True,
             "label": "Quais processos estão implantados e funcionando atualmente?",
             "options": PROCESSOS,
             "admin": {"indicador": "Processos entregues",
                       "objetivo": "Inventário final da implementação.",
                       "analise": "Compare com o Dia 0 para mostrar o antes e o depois."}},

            {"id": "c180_acompanhar", "type": "multiselect", "max": 3, "required": True,
             "label": "Quais processos ainda precisam de acompanhamento?",
             "help": "Escolha até três.",
             "options": PROCESSOS,
             "admin": {"indicador": "Escopo de continuidade",
                       "objetivo": "Base direta da proposta de renovação.",
                       "analise": "Três processos frágeis justificam continuidade."}},

            {"id": "c180_autonomia_equipe", "type": "radio", "required": True,
             "label": "A equipe consegue executar o processo comercial com autonomia?",
             "options": ["Sim", "Na maior parte", "Parcialmente", "Ainda não"],
             "admin": {"indicador": "Autonomia final",
                       "objetivo": "Fechamento do indicador central da jornada.",
                       "analise": "Compare com Dia 90 e Dia 150."}},

            {"id": "c180_sem_b3", "type": "textarea", "required": True,
             "label": "O que a empresa consegue fazer hoje sem depender diretamente da B3 Sales?",
             "admin": {"indicador": "Independência da consultoria",
                       "objetivo": "Prova de que a entrega foi capacitação, não muleta.",
                       "analise": "É o que diferencia implementação de terceirização."}},

            {"id": "c180_depende_dona", "type": "textarea",
             "label": "Qual parte da operação ainda depende mais da proprietária?",
             "admin": {"indicador": "Dependência residual",
                       "objetivo": "O que sobrou para o próximo ciclo.",
                       "analise": "Sempre sobra algo. Nomear é mais honesto que esconder."}},
        ],
    },
    {
        "id": "d180_continuidade", "eyebrow": "Parte 3", "title": "Continuidade",
        "intro": "O que sustenta o que foi construído.",
        "questions": [
            {"id": "c180_manter", "type": "textarea", "required": True,
             "label": "O que precisa ser mantido nos próximos 90 dias?",
             "admin": {"indicador": "Rotinas a preservar",
                       "objetivo": "O que não pode parar quando a B3 Sales sair.",
                       "analise": "Vira checklist do plano de continuidade."}},

            {"id": "c180_desenvolver", "type": "textarea", "required": True,
             "label": "O que precisa ser desenvolvido nos próximos 90 dias?",
             "admin": {"indicador": "Próximo escopo",
                       "objetivo": "Insumo comercial para a renovação.",
                       "analise": "Conecte com as oportunidades do Dia 150."}},

            {"id": "c180_prioridade_estrategica", "type": "multiselect", "max": 3, "other": True,
             "required": True,
             "label": "Qual será a próxima prioridade estratégica da empresa?",
             "help": "Escolha até três.",
             "options": ["Escalar o time", "Abrir novo canal", "Lançar novo produto",
                         "Aumentar ticket médio", "Estruturar pós venda",
                         "Expandir para novo público", "Consolidar previsibilidade",
                         "Reduzir custo de aquisição"],
             "admin": {"indicador": "Direção seguinte",
                       "objetivo": "Alinhar a proposta ao que ela já quer.",
                       "analise": "Proposta que responde ao desejo declarado converte mais."}},

            {"id": "c180_pilar_continuidade", "type": "select", "other": True, "required": True,
             "label": "Qual processo deve receber mais atenção na continuidade?",
             "options": PILARES_ECO + ["Gestão", "Time"],
             "admin": {"indicador": "Pilar de continuidade",
                       "objetivo": "Foco do próximo contrato.",
                       "analise": "Compare com o pilar de entrada do Dia 0."}},

            {"id": "c180_indicador_fixo", "type": "indicador_ref", "multi": True,
             "required": True,
             "label": "Qual indicador continuará sendo acompanhado obrigatoriamente?",
             "admin": {"indicador": "Métrica permanente",
                       "objetivo": "O que fica no painel dela para sempre.",
                       "analise": "Dois ou três indicadores. Mais que isso não se sustenta."}},
        ],
    },
    {
        "id": "d180_percepcao", "eyebrow": "Parte 4", "title": "Percepção e evidências",
        "intro": "Para fechar, queremos ouvir você.",
        "questions": [
            {"id": "c180_valor", "type": "textarea", "required": True,
             "label": "Qual foi o principal valor percebido durante a implementação?",
             "admin": {"indicador": "Valor percebido",
                       "objetivo": "Descobrir o que ela realmente comprou.",
                       "analise": "Ajuste o discurso comercial com base nisso."}},

            {"id": "c180_diferente", "type": "textarea",
             "label": "O que poderia ter sido feito de forma diferente?",
             "admin": {"indicador": "Crítica construtiva",
                       "objetivo": "Melhoria do método para os próximos clientes.",
                       "analise": "Leia sem defensiva. É o feedback mais caro que existe."}},

            {"id": "c180_evidencias", "type": "files",
             "label": "Quais materiais comprovam a evolução da empresa?",
             "help": "Indicadores, relatórios, processos, scripts, treinamentos, antes e depois."},

            {"id": "c180_recomendaria", "type": "scale", "required": True,
             "label": "Você recomendaria a implementação comercial da B3 Sales para outra empresa?",
             "options": ESCALA_5,
             "help": "1 é não recomendaria. 5 é recomendaria sem pensar.",
             "admin": {"indicador": "Recomendação",
                       "objetivo": "Termômetro de indicação e de renovação.",
                       "analise": "4 ou 5 é a hora de pedir a indicação."}},

            {"id": "c180_estudo_caso", "type": "radio", "required": True,
             "label": "Você autoriza o Grupo B3 Sales a utilizar sua evolução como estudo de caso?",
             "options": ["Sim, autorizo",
                         "Sim, desde que os dados sejam anonimizados",
                         "Ainda quero avaliar", "Não autorizo"],
             "admin": {"indicador": "Autorização de uso",
                       "objetivo": "Permissão formal para material comercial.",
                       "analise": "Respeite a resposta. Sempre."}},
        ],
    },
]


# Mensagem que abre cada link, para o cliente saber por que está respondendo.
ABERTURA = {
    "Dia 30": "Vamos revisar a direção e confirmar o início da implementação.",
    "Dia 60": "Agora vamos entender como os processos e a condução comercial estão evoluindo.",
    "Dia 90": "Neste ciclo, vamos avaliar o time, a execução e a aplicação prática do processo.",
    "Dia 120": "Agora vamos analisar os indicadores, a gestão e a recuperação de oportunidades.",
    "Dia 150": "Neste momento, vamos identificar ajustes, autonomia e oportunidades de crescimento.",
    "Dia 180": "Chegamos à consolidação. Vamos comparar o cenário inicial com o momento atual "
               "e definir a continuidade.",
}

TITULOS = {
    "Dia 30": "Mês 1 · Diagnóstico e direção",
    "Dia 60": "Mês 2 · Processos e condução",
    "Dia 90": "Mês 3 · Time e execução",
    "Dia 120": "Mês 4 · Gestão e recuperação",
    "Dia 150": "Mês 5 · Otimização e autonomia",
    "Dia 180": "Mês 6 · Consolidação e continuidade",
}

MENSAIS = {
    "Dia 30": DIA_30,
    "Dia 60": DIA_60,
    "Dia 90": DIA_90,
    "Dia 120": DIA_120,
    "Dia 150": DIA_150,
    "Dia 180": DIA_180,
}
