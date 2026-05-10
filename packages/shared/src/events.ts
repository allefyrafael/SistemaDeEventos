import { z } from 'zod';

/**
 * Catalogo de modulos feature — fonte unica para API e web.
 */
export const FEATURE_MODULES = [
  'passport',
  'qr_scan',
  'feedback',
  'companies',
  'student_profile',
  'dashboard_live',
  'exports_csv',
  'certificate',
  'check_in',
  'raffle',
  'venue_map',
] as const;
export type FeatureModule = (typeof FEATURE_MODULES)[number];

/** Config JSON do evento (modulos ativos + tema + slices por feature). */
export const eventConfigSchema = z.object({
  modules: z.array(z.enum(FEATURE_MODULES)).default([]),
  theme: z
    .object({
      primary: z.string().optional(),
      logoUrl: z.string().url().optional(),
    })
    .partial()
    .optional(),
  passport: z
    .object({
      requiredStamps: z.number().int().positive().optional(),
    })
    .optional(),
  qr_scan: z
    .object({
      tokenTtlSeconds: z.number().int().min(10).max(120).default(30),
      rotateEverySeconds: z.number().int().min(5).max(60).default(20),
    })
    .optional(),
  feedback: z
    .object({
      mandatory: z.boolean().default(true),
      minQuestions: z.number().int().min(1).max(10).default(3),
    })
    .optional(),
});

export type EventConfig = z.infer<typeof eventConfigSchema>;

/**
 * Metadados apresentaveis de cada modulo. O administrador de evento usa essa
 * descricao para entender o que cada funcionalidade faz antes de ativar.
 */
export interface FeatureModuleMeta {
  id: FeatureModule;
  label: string;
  shortDescription: string;
  fullDescription: string;
  category: 'participante' | 'empresa' | 'organizador';
  requires?: FeatureModule[];
  defaultEnabled?: boolean;
}

export const FEATURE_MODULE_META: Record<FeatureModule, FeatureModuleMeta> = {
  passport: {
    id: 'passport',
    label: 'Passaporte Digital',
    shortDescription: 'Cada participante recebe um passaporte com carimbos.',
    fullDescription:
      'Cria um passaporte individual para cada participante. Voce cadastra os carimbos (visitas, palestras, itens obrigatorios) e o sistema controla automaticamente o progresso. Obrigatorio para certificados e exportacoes de concludentes.',
    category: 'participante',
    defaultEnabled: true,
  },
  qr_scan: {
    id: 'qr_scan',
    label: 'QR Code + Scanner',
    shortDescription: 'Estudante gera QR dinamico, empresa le com a camera.',
    fullDescription:
      'Habilita o QR Code dinamico de cada participante (rotaciona a cada ~20s para evitar print) e o scanner pela camera no app da empresa. O scanner funciona offline e sincroniza depois. Requer o modulo Passaporte ativo.',
    category: 'empresa',
    requires: ['passport'],
    defaultEnabled: true,
  },
  feedback: {
    id: 'feedback',
    label: 'Feedback pos-visita',
    shortDescription: 'Participante avalia cada empresa visitada.',
    fullDescription:
      'Depois que a empresa carimba o passaporte, o participante precisa responder um questionario para o carimbo ser efetivamente computado. Voce pode editar o template padrao ou definir um especifico por empresa.',
    category: 'participante',
    requires: ['qr_scan'],
    defaultEnabled: true,
  },
  companies: {
    id: 'companies',
    label: 'Cadastro de Empresas',
    shortDescription: 'Gestao dos expositores e responsaveis pelos stands.',
    fullDescription:
      'Permite cadastrar empresas expositoras com seus responsaveis (via CPF). Cada responsavel recebe acesso ao app de empresa para operar o scanner de QR. Essencial para qualquer evento com estandes.',
    category: 'empresa',
    defaultEnabled: true,
  },
  student_profile: {
    id: 'student_profile',
    label: 'Perfil do participante',
    shortDescription: 'LinkedIn e curriculo opcionais no perfil.',
    fullDescription:
      'Exibe uma tela de perfil onde o participante pode adicionar seu LinkedIn e link de curriculo. Util para eventos de carreiras onde as empresas podem acessar os dados dos visitantes.',
    category: 'participante',
    defaultEnabled: true,
  },
  dashboard_live: {
    id: 'dashboard_live',
    label: 'Dashboard em tempo real',
    shortDescription: 'Metricas do evento atualizadas automaticamente.',
    fullDescription:
      'Painel com total de inscritos, ativos, concludentes, carimbos por hora, empresas mais visitadas e melhor avaliadas. Util para apresentar resultados durante o evento.',
    category: 'organizador',
    defaultEnabled: true,
  },
  exports_csv: {
    id: 'exports_csv',
    label: 'Exportacoes em CSV',
    shortDescription: 'Baixar listas (concludentes, feedbacks) em CSV.',
    fullDescription:
      'Habilita o download de relatorios em CSV compativel com Excel. Atualmente inclui o relatorio de concludentes (participantes que completaram 100% dos carimbos obrigatorios).',
    category: 'organizador',
    defaultEnabled: true,
  },
  certificate: {
    id: 'certificate',
    label: 'Certificado digital',
    shortDescription: 'Gera certificado automatico para concludentes.',
    fullDescription:
      'Ao completar o passaporte o participante recebe um certificado digital em PDF com validacao por codigo. Requer o modulo Passaporte ativo. (Funcionalidade em implementacao.)',
    category: 'participante',
    requires: ['passport'],
    defaultEnabled: false,
  },
  check_in: {
    id: 'check_in',
    label: 'Check-in na entrada',
    shortDescription: 'Registra a entrada do participante no evento.',
    fullDescription:
      'Antes de emitir QR, o participante precisa passar por um check-in de entrada (balcao da organizacao). Util para eventos com controle de acesso fisico. (Funcionalidade em implementacao.)',
    category: 'organizador',
    defaultEnabled: false,
  },
  raffle: {
    id: 'raffle',
    label: 'Sorteio entre concludentes',
    shortDescription: 'Sorteia premios entre participantes que concluiram.',
    fullDescription:
      'Permite ao organizador realizar sorteios entre os participantes que concluiram o passaporte, com registro auditavel. (Funcionalidade em implementacao.)',
    category: 'organizador',
    requires: ['passport'],
    defaultEnabled: false,
  },
  venue_map: {
    id: 'venue_map',
    label: 'Mapa interativo do local',
    shortDescription: 'Mapa visual com stands, auditorios e atividades clicaveis.',
    fullDescription:
      'Um mapa interativo do espaco fisico do evento. O organizador marca a posicao de cada stand, sala e auditorio; participantes exploram o mapa, clicam em cada ponto e veem informacoes (empresa, descricao, atividades agendadas). Inclui inscricao em atividades de auditorios e salas, e funciona com ou sem imagem de fundo (planta baixa).',
    category: 'participante',
    defaultEnabled: false,
  },
};

export const FEATURE_MODULE_CATEGORY_LABEL: Record<
  FeatureModuleMeta['category'],
  string
> = {
  participante: 'Experiencia do participante',
  empresa: 'Operacao das empresas',
  organizador: 'Ferramentas do organizador',
};

/**
 * Onde o admin configura cada modulo no contexto do evento.
 * Usado no painel de modulos e na visao geral (somente modulos ativos).
 */
export interface FeatureModuleAdminSetup {
  /** Segmento apos /admin/eventos/[eventId]/ (vazio = raiz do evento). */
  segment: string;
  cta: string;
  setupHint: string;
}

export const FEATURE_MODULE_ADMIN_SETUP: Partial<
  Record<FeatureModule, FeatureModuleAdminSetup>
> = {
  companies: {
    segment: 'empresas',
    cta: 'Gerir empresas',
    setupHint: 'Cadastre expositores e responsaveis pelos stands.',
  },
  passport: {
    segment: 'stamps',
    cta: 'Carimbos',
    setupHint: 'Itens do passaporte, ordem e obrigatoriedade.',
  },
  exports_csv: {
    segment: 'exportar',
    cta: 'Exportar CSV',
    setupHint: 'Relatorios para Excel.',
  },
  dashboard_live: {
    segment: '',
    cta: 'Metricas ao vivo',
    setupHint: 'Picos, visitas e avaliacoes em tempo real.',
  },
  venue_map: {
    segment: 'mapa',
    cta: 'Mapa interativo',
    setupHint: 'Fundo, pins, areas, atividades por sala ou auditorio.',
  },
  feedback: {
    segment: 'empresas',
    cta: 'Empresas e visitas',
    setupHint: 'Feedback liga-se as empresas que carimbam o passaporte.',
  },
  qr_scan: {
    segment: '',
    cta: 'QR dinamico',
    setupHint: 'Disponivel no app do estudante; requer passaporte.',
  },
  student_profile: {
    segment: 'alunos',
    cta: 'Participantes',
    setupHint: 'Importacao CSV e gestao de inscritos.',
  },
};

export const eventStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'RUNNING',
  'CLOSED',
  'ARCHIVED',
]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const eventSummarySchema = z.object({
  id: z.string(),
  nome: z.string(),
  slug: z.string(),
  status: eventStatusSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  modules: z.array(z.enum(FEATURE_MODULES)),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;
