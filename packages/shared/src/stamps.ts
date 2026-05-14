import { z } from 'zod';

export const stampConfigCreateSchema = z.object({
  titulo: z.string().min(2).max(80),
  descricao: z.string().max(300).optional(),
  ordem: z.number().int().min(0).default(0),
  obrigatorio: z.boolean().default(true),
  // RN02: lista de empresas autorizadas a carimbar este item.
  // Vazio (ou omitido) = qualquer empresa do evento pode carimbar.
  // Quando ha 1+ ids, somente essas empresas podem (helps explorar areas).
  authorizedCompanyIds: z.array(z.string().uuid()).optional(),
  /**
   * Atalho: libera TODAS as empresas de uma categoria como autorizadas.
   * Coexiste com `authorizedCompanyIds` — a logica final e:
   *   - se ha categoria E ha lista de empresas, ambas autorizam (uniao).
   *   - se so categoria, empresas da categoria autorizadas.
   *   - se so lista, somente essa lista.
   *   - se nem categoria nem lista, qualquer empresa do evento pode.
   */
  companyCategoryId: z.string().uuid().nullable().optional(),
  // LEGADO (1:1) — aceita por retrocompat. Quando enviado e
  // authorizedCompanyIds esta omitido, e tratado como [valor].
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
  // Lista das empresas autorizadas (RN02). Vazia = qualquer empresa pode.
  authorizedCompanies: z.array(
    z.object({ id: z.string().uuid(), nome: z.string() }),
  ),
  /**
   * Categoria autorizada (atalho que libera todas as empresas dela).
   * Coexiste com authorizedCompanies — soma de autorizacoes.
   */
  authorizedCategory: z
    .object({ id: z.string().uuid(), nome: z.string(), color: z.string().nullable() })
    .nullable(),
  // LEGADO: primeira empresa autorizada (compat com codigo antigo). Sera
  // removido em uma versao futura.
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
