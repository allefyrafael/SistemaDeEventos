import { z } from 'zod';
import { cpfOnlyDigitsSchema } from './common';

export const companyCreateSchema = z.object({
  nome: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minusculas, numeros e hifens')
    .optional(),
  descricao: z.string().max(500).optional(),
  stand: z.string().max(40).optional(),
  responsaveis: z
    .array(
      z.object({
        nome: z.string().min(2).max(120),
        cpf: cpfOnlyDigitsSchema,
        email: z.string().email().optional(),
      }),
    )
    .min(1, 'Cadastre pelo menos 1 responsavel'),
});
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

export const companyUpdateSchema = companyCreateSchema
  .partial()
  .extend({ ativo: z.boolean().optional() });
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

export const companyDtoSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  nome: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().nullable(),
  stand: z.string().nullable(),
  descricao: z.string().nullable(),
  ativo: z.boolean(),
  responsaveis: z.array(
    z.object({
      id: z.string().uuid(),
      nome: z.string(),
      cpf: z.string(),
      email: z.string().email().nullable(),
    }),
  ),
  metricas: z
    .object({
      totalCarimbos: z.number().int().nonnegative(),
      notaMedia: z.number().nullable(),
    })
    .optional(),
});
export type CompanyDto = z.infer<typeof companyDtoSchema>;
