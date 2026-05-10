import { z } from 'zod';
import { FEATURE_MODULES } from './events';

export const eventCreateSchema = z.object({
  nome: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minusculas, numeros e hifens'),
  descricao: z.string().max(500).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  modules: z.array(z.enum(FEATURE_MODULES)).default([]),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const eventUpdateSchema = z.object({
  nome: z.string().min(3).max(120).optional(),
  descricao: z.string().max(500).nullable().optional(),
  status: z
    .enum(['DRAFT', 'PUBLISHED', 'RUNNING', 'CLOSED', 'ARCHIVED'])
    .optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  modules: z.array(z.enum(FEATURE_MODULES)).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

export const eventDetailSchema = z.object({
  // UUID v7 (Prisma) — nao restringir a v4
  id: z.string().min(1),
  nome: z.string(),
  slug: z.string(),
  descricao: z.string().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'RUNNING', 'CLOSED', 'ARCHIVED']),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  modules: z.array(z.enum(FEATURE_MODULES)),
  config: z.record(z.string(), z.unknown()),
});
export type EventDetail = z.infer<typeof eventDetailSchema>;
