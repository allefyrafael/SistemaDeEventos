import { z } from 'zod';

export const stampConfigCreateSchema = z.object({
  titulo: z.string().min(2).max(80),
  descricao: z.string().max(300).optional(),
  ordem: z.number().int().min(0).default(0),
  obrigatorio: z.boolean().default(true),
  // Se null => qualquer empresa pode carimbar. Se preenchido => RN02.
  entidadeAutorizadaId: z.string().uuid().nullable().optional(),
});
export type StampConfigCreateInput = z.infer<typeof stampConfigCreateSchema>;

export const stampConfigUpdateSchema = stampConfigCreateSchema.partial();
export type StampConfigUpdateInput = z.infer<typeof stampConfigUpdateSchema>;

export const stampConfigDtoSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  ordem: z.number().int(),
  obrigatorio: z.boolean(),
  entidadeAutorizada: z
    .object({ id: z.string().uuid(), nome: z.string() })
    .nullable(),
});
export type StampConfigDto = z.infer<typeof stampConfigDtoSchema>;

export const passportStatusSchema = z.object({
  eventId: z.string().uuid(),
  totalRequired: z.number().int().nonnegative(),
  totalCompleted: z.number().int().nonnegative(),
  completed: z.boolean(),
  items: z.array(
    z.object({
      stampConfigId: z.string().uuid(),
      titulo: z.string(),
      ordem: z.number().int(),
      obrigatorio: z.boolean(),
      obtido: z.boolean(),
      dataConclusao: z.string().datetime().nullable(),
      companyId: z.string().uuid().nullable(),
      companyNome: z.string().nullable(),
      feedbackRespondido: z.boolean(),
    }),
  ),
});
export type PassportStatus = z.infer<typeof passportStatusSchema>;
