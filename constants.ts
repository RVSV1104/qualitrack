
import { Section, SOP, TrainingVideo, User, UserRole, WorkflowStatus, Consultant, PDI } from './types';

export const FORM_SECTIONS: Section[] = [
  {
    id: 'pre_atendimento',
    title: 'Pré-atendimento',
    weight: 20,
    questions: [
      { id: 'intro', text: 'O consultor inicia a ligação com uma introdução clara, mencionando seu nome, empresa e o motivo do contato?' },
      { id: 'momento', text: 'Ele verifica rapidamente se é um bom momento para o cliente conversar?' },
      { id: 'espera', text: 'Mantém o cliente informado caso seja necessário colocá-lo em espera, justificando o motivo e o tempo estimado?' },
      { id: 'linguagem_acolhedora', text: 'Ele utiliza uma linguagem acolhedora e positiva, demonstrando entusiasmo e interesse pelo cliente desde o início da ligação?' },
      { id: 'tom_voz', text: 'O consultor utilizou um tom de voz acolhedor e entusiasmado, transmitindo energia positiva ao cliente?' },
      { id: 'foco', text: 'O consultor foi capaz de redirecionar a conversa sempre que o cliente tentou desviar o foco, mantendo o atendimento dentro do objetivo principal?' }
    ]
  },
  {
    id: 'diagnostico',
    title: 'Diagnóstico',
    weight: 20,
    questions: [
      { id: 'perguntas_abertas', text: 'O consultor fez perguntas abertas para entender as necessidades, expectativas e preocupações do cliente?' },
      { id: 'detalhes', text: 'Ele investigou informações mais detalhadas sobre o cliente, como contexto, objetivos e problemas específicos?' },
      { id: 'validacao', text: 'Ele validou as informações obtidas, confirmando que compreendeu corretamente?' }
    ]
  },
  {
    id: 'negociacao',
    title: 'Negociação',
    weight: 40,
    questions: [
      { id: 'solucoes', text: 'O consultor apresentou soluções personalizadas, destacando como elas atendem às necessidades específicas do cliente?' },
      { id: 'alternativas', text: 'Ele explorou alternativas, mostrando flexibilidade e oferecendo opções (ex.: diferentes pacotes, modalidades ou prazos)?' },
      { id: 'exemplos', text: 'Ele utilizou exemplos reais, histórias de sucesso ou depoimentos de outros clientes para criar confiança e conexão?' },
      { id: 'objecoes', text: 'Ele lidou com objeções de maneira profissional, contra-argumentando com benefícios claros e objetivos?' },
      { id: 'persistencia', text: 'Houve persistência em caso de negativa/ausência de resposta?' }
    ]
  },
  {
    id: 'encerramento',
    title: 'Encerramento',
    weight: 10,
    questions: [
      { id: 'proximos_passos', text: 'O consultor informou claramente os próximos passos, como prazos, ações ou requisitos para continuidade?' },
      { id: 'reforco', text: 'Ele reforçou os benefícios da decisão do cliente, assegurando que sua escolha foi a melhor?' },
      { id: 'confirmacao', text: 'Ele confirmou o entendimento do cliente sobre as informações fornecidas e os próximos passos?' },
      { id: 'finalizacao', text: 'Ele finalizou a ligação de forma positiva, agradecendo pelo tempo do cliente e deixando portas abertas para contato futuro?' }
    ]
  },
  {
    id: 'compliance',
    title: 'Compliance e Operacional',
    weight: 10,
    questions: [
      { id: 'registro', text: 'O consultor passou todas as informações / registrou todas as informações do atendimento corretamente no sistema, garantindo integridade e continuidade do processo?' },
      { id: 'linguagem_prof', text: 'Ele utilizou uma linguagem profissional, sem gírias, vícios de linguagem ou tom inadequado?' },
      { id: 'atendimento_candidato', text: 'O consultor prestou o atendimento ao candidato?' }
    ]
  }
];

export const CRITICAL_FAILURES = [
    'Prometer algo que o curso não oferece',
    'Tratar cliente com ironia/desrespeito/grosseira',
    'Informar valor ou condição de pagamento errada',
    'Não registrar o atendimento (Venda sem registro)',
    'Vender sem consentimento explícito',
    'Divulgar dados sensíveis do cliente (LGPD)',
    'Abandonar o cliente na linha/chat sem justificativa'
];

export const REASONS_NO_SALE = [
  'Falta de tempo',
  'Proposta comercial enviada',
  'Direcionado para whatsapp',
  'Se matriculou em outra IES',
  'Modalidade não oferecida',
  'Financeiro',
  'Contato finalizado pelo cliente',
  'Contato sem sucesso / Ligação caiu',
  'Parou de responder',
  'Faltou engajamento do consultor',
  'Acha que o curso não faz diferença na carreira',
  'Recebeu indicação de outro curso',
  'Não conhece a instituição',
  'Receio de não acompanhar as aulas',
  'Desinteresse genérico (resposta vaga)',
  'Está esperando um momento melhor',
  'Ja é aluno',
  'Fora de perfil',
  'Passou na prova / Concurso',
  'Promessa de pagamento',
  'Inscrição/ Matrícula realizada',
  'Interesse em próximo semestre/ano/turma',
  'Problema técnico',
  'Não vai pagar agora',
  'Tratativa em andamento / ligação reagendada',
  'Aguardando abrir inscrição/matricula'
];

export const EVALUATION_CYCLES = [
  '1°Ciclo',
  '2°Ciclo',
  '3°Ciclo',
  '4°Ciclo',
  'Ciclo Complementar',
  '1° Monitoria Supervisão',
  '2° Monitoria Supervisão',
  'Calibração'
];

export const CALL_CENTERS = [
  'Insper',
  'Insper - Pós graduação',
  'Insper - Graduação',
  'Mackenzie',
  'Fundacred'
];

export const BASES = [
  'Receptivo',
  'Ativo',
  'Retenção',
  'Base OAB',
  'Base Graduação'
];

export const SHIFTS = ['Manhã', 'Tarde', 'Integral'];

export const CHANNELS = ['Telefone', 'E-mail', 'Whatsapp', 'Chat', 'Omnichannel'];

export const WORKFLOW_STATUSES: { status: WorkflowStatus; label: string; color: string }[] = [
    { status: 'Monitorado', label: 'Monitorado', color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { status: 'Revisado', label: 'Revisado', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { status: 'Aguardando evidência', label: 'Aguardando evidência', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { status: 'Aguardando consultor', label: 'Aguardando consultor', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { status: 'Aguardando supervisão', label: 'Aguardando supervisão', color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

export const MOCK_PDIS: PDI[] = [
    {
        id: 'pdi1',
        consultantName: 'Alicia Souza da Silva',
        title: 'Treinamento de Sondagem',
        actionPlan: 'Revisar módulo de perguntas abertas e aplicar em 50% das ligações.',
        deadline: '2025-03-01',
        status: 'Em Andamento',
        createdAt: '2025-02-15',
        priority: 'Média',
        responsible: 'Consultor',
        attachments: ['script_sondagem_v2.pdf']
    },
    {
        id: 'pdi2',
        consultantName: 'Adrian Magalhães',
        title: 'Reciclagem de Produto',
        actionPlan: 'Assistir vídeos sobre novos cursos e realizar quiz.',
        deadline: '2025-02-28',
        status: 'Pendente',
        createdAt: '2025-02-20',
        priority: 'Alta',
        responsible: 'Supervisor'
    }
];

export const MOCK_SOPS: SOP[] = [
  {
    id: '1',
    title: 'Fluxo de Objeção Financeira',
    category: 'Vendas',
    content: 'Quando o cliente alegar falta de recursos, apresentar as opções de parcelamento estudantil e bolsas disponíveis...',
    lastUpdated: '2023-10-15'
  },
  {
    id: '2',
    title: 'Script de Sondagem Inicial',
    category: 'Atendimento',
    content: 'O objetivo da sondagem é entender o momento de vida do candidato. Perguntas chaves: "O que te motivou a procurar este curso agora?"...',
    lastUpdated: '2023-11-02'
  },
  {
    id: '3',
    title: 'Procedimento de Registro no CRM',
    category: 'Sistemas',
    content: 'Todo contato deve ser tabulado. Se houve agendamento, usar a tabulação "Agendamento Futuro" e inserir data/hora...',
    lastUpdated: '2023-09-20'
  }
];

export const MOCK_TRAININGS: TrainingVideo[] = [
  {
    id: '1',
    title: 'Técnicas de Persuasão Avançada',
    thumbnail: 'https://picsum.photos/300/200?random=1',
    duration: '45 min',
    tags: ['Vendas', 'Soft Skills']
  },
  {
    id: '2',
    title: 'Domínio do Sistema Acadêmico',
    thumbnail: 'https://picsum.photos/300/200?random=2',
    duration: '20 min',
    tags: ['Operacional', 'Sistemas']
  },
  {
    id: '3',
    title: 'Escuta Ativa e Empatia',
    thumbnail: 'https://picsum.photos/300/200?random=3',
    duration: '30 min',
    tags: ['Comportamental']
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Gabriel Leal', role: UserRole.MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gabriel' },
  { id: 'u2', name: 'Raul Valério', role: UserRole.MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raul' },
  { id: 'u3', name: 'Alicia Souza', role: UserRole.CONSULTANT, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alicia' },
  { id: 'u4', name: 'Matteo Creso', role: UserRole.CONSULTANT, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo' }
];

export const MOCK_CONSULTANTS: Consultant[] = [
    { id: 'c1', name: 'Alicia Souza da Silva', email: 'alicia@empresa.com', team: 'Gabriel Leal', center: 'Q Concursos', hireDate: '2023-01-10', status: 'Ativo' },
    { id: 'c2', name: 'Matteo Creso Di Iorio Martinelli', email: 'matteo@empresa.com', team: 'Gabriel Leal', center: 'Q Concursos', hireDate: '2023-02-15', status: 'Ativo' },
    { id: 'c3', name: 'Caroline Pereira', email: 'caroline@empresa.com', team: 'Gabriel Leal', center: 'Q Concursos', hireDate: '2023-03-01', status: 'Ativo' },
    { id: 'c4', name: 'Adrian Magalhães', email: 'adrian@empresa.com', team: 'Raul Valério', center: 'Mackenzie', hireDate: '2023-05-20', status: 'Ativo' },
    { id: 'c5', name: 'Camila Soares', email: 'camila@empresa.com', team: 'Eduardo Kiss', center: 'Fundacred', hireDate: '2023-06-10', status: 'Ativo' }
];

export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
