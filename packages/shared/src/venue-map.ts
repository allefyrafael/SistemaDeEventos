import { z } from 'zod';

/**
 * Modulo "venue_map": mapa interativo do espaco fisico do evento.
 *
 * Desenhado para ser REUTILIZAVEL em qualquer tipo de evento — feira,
 * congresso, workshop, hackathon — e nao apenas na este evento.
 *
 * Coordenadas sao sempre em PORCENTAGEM (0-100) do viewport configurado
 * no VenueMap, de modo que o mapa se adapta a qualquer tamanho de tela
 * sem perder a proporcao visual dos pins.
 */

export const MAP_LOCATION_KINDS = [
  'COMPANY_STAND',
  'THEATER',
  'ROOM',
  'AREA',
  'POI',
  'CUSTOM',
] as const;

export type MapLocationKind = (typeof MAP_LOCATION_KINDS)[number];

export interface MapLocationKindMeta {
  id: MapLocationKind;
  label: string;
  description: string;
  defaultColor: string;
  defaultIcon: string;
}

export const MAP_LOCATION_KIND_META: Record<MapLocationKind, MapLocationKindMeta> = {
  COMPANY_STAND: {
    id: 'COMPANY_STAND',
    label: 'Stand de empresa',
    description: 'Stand de uma empresa expositora. Vincula-se a um cadastro de empresa.',
    defaultColor: '#F0B323',
    defaultIcon: '⌂',
  },
  THEATER: {
    id: 'THEATER',
    label: 'Auditorio / Teatro',
    description: 'Espaco com palestras e atividades agendadas (capacidade e inscricao).',
    defaultColor: '#22D3EE',
    defaultIcon: '◈',
  },
  ROOM: {
    id: 'ROOM',
    label: 'Sala / Laboratorio',
    description: 'Sala com oficinas, workshops ou atendimentos.',
    defaultColor: '#A78BFA',
    defaultIcon: '▣',
  },
  AREA: {
    id: 'AREA',
    label: 'Area livre',
    description: 'Area aberta (praca de alimentacao, coworking, credenciamento).',
    defaultColor: '#34D399',
    defaultIcon: '◉',
  },
  POI: {
    id: 'POI',
    label: 'Ponto de interesse',
    description: 'Ponto de apoio: banheiros, cafe, entrada principal, acessibilidade.',
    defaultColor: '#94A3B8',
    defaultIcon: '•',
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Personalizado',
    description: 'Marcador livre definido pelo organizador.',
    defaultColor: '#F472B6',
    defaultIcon: '★',
  },
};

// -----------------------------------------------------------------
// VenueMap (container por evento)
// -----------------------------------------------------------------

export const venueMapConfigSchema = z.object({
  titulo: z.string().max(120).nullable().optional(),
  backgroundUrl: z.string().url().nullable().optional(),
  viewportWidth: z.number().int().min(400).max(8000).default(1200),
  viewportHeight: z.number().int().min(300).max(8000).default(800),
  theme: z
    .object({
      accent: z.string().optional(),
      gridOn: z.boolean().default(true),
      noiseOn: z.boolean().default(true),
    })
    .partial()
    .optional(),
});

export type VenueMapConfigInput = z.infer<typeof venueMapConfigSchema>;

// -----------------------------------------------------------------
// MapLocation (pin / zona)
// -----------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser hex de 6 digitos (ex: #F0B323)');

export const mapLocationCreateSchema = z.object({
  kind: z.enum(MAP_LOCATION_KINDS),
  companyId: z.string().uuid().nullable().optional(),
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000).nullable().optional(),
  corHex: hexColor.nullable().optional(),
  icone: z.string().max(8).nullable().optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  larguraPct: z.number().min(0).max(100).nullable().optional(),
  alturaPct: z.number().min(0).max(100).nullable().optional(),
  rotacaoDeg: z.number().int().min(-180).max(180).default(0).optional(),
  ordem: z.number().int().default(0).optional(),
});

export const mapLocationUpdateSchema = mapLocationCreateSchema.partial();

export type MapLocationCreateInput = z.infer<typeof mapLocationCreateSchema>;
export type MapLocationUpdateInput = z.infer<typeof mapLocationUpdateSchema>;

export interface MapLocationDto {
  id: string;
  kind: MapLocationKind;
  companyId: string | null;
  company: { id: string; nome: string; slug: string } | null;
  titulo: string;
  descricao: string | null;
  corHex: string | null;
  icone: string | null;
  x: number;
  y: number;
  larguraPct: number | null;
  alturaPct: number | null;
  rotacaoDeg: number;
  ordem: number;
  activities: ActivityDto[];
}

// -----------------------------------------------------------------
// Activity (atividades dentro de uma location)
// -----------------------------------------------------------------

export const activityCreateSchema = z
  .object({
    titulo: z.string().min(1).max(160),
    descricao: z.string().max(2000).nullable().optional(),
    palestrante: z.string().max(160).nullable().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    capacidade: z.number().int().positive().nullable().optional(),
    permitirInscricao: z.boolean().default(true).optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'endsAt deve ser maior que startsAt',
    path: ['endsAt'],
  });

export const activityUpdateSchema = z.object({
  titulo: z.string().min(1).max(160).optional(),
  descricao: z.string().max(2000).nullable().optional(),
  palestrante: z.string().max(160).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  capacidade: z.number().int().positive().nullable().optional(),
  permitirInscricao: z.boolean().optional(),
});

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export interface ActivityDto {
  id: string;
  titulo: string;
  descricao: string | null;
  palestrante: string | null;
  startsAt: string;
  endsAt: string;
  capacidade: number | null;
  permitirInscricao: boolean;
  totalInscritos: number;
  jaInscrito: boolean;
}

// -----------------------------------------------------------------
// VenueMap completo (payload do GET)
// -----------------------------------------------------------------

export interface VenueMapDto {
  id: string;
  eventId: string;
  titulo: string | null;
  backgroundUrl: string | null;
  viewportWidth: number;
  viewportHeight: number;
  theme: {
    accent?: string;
    gridOn?: boolean;
    noiseOn?: boolean;
  };
  locations: MapLocationDto[];
}
