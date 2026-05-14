import { z } from 'zod';

/**
 * Categoria de empresa dentro de um evento (ex.: "Tecnologia", "Saude",
 * "Educacao"). Agrupa empresas no admin e serve como atalho de autorizacao
 * em massa nos stamps (StampConfig.companyCategoryId libera todas as
 * empresas da categoria a conceder o carimbo).
 */

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hex no formato #RRGGBB');

export const companyCategoryCreateSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(60),
  color: hexColorSchema.nullable().optional(),
  ordem: z.number().int().min(0).default(0),
});
export type CompanyCategoryCreateInput = z.infer<typeof companyCategoryCreateSchema>;

export const companyCategoryUpdateSchema = companyCategoryCreateSchema.partial();
export type CompanyCategoryUpdateInput = z.infer<typeof companyCategoryUpdateSchema>;

export const companyCategoryDtoSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  nome: z.string(),
  color: z.string().nullable(),
  ordem: z.number().int(),
  /** Quantas empresas estao nesta categoria (preenchido pela API). */
  totalCompanies: z.number().int().nonnegative(),
});
export type CompanyCategoryDto = z.infer<typeof companyCategoryDtoSchema>;
