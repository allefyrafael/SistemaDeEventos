import { z } from 'zod';

/**
 * Certificado emitido para participante que concluiu 100% dos itens
 * obrigatorios do passaporte. O `code` e publico e identifica unicamente
 * o certificado (qualquer pessoa com o codigo pode validar via
 * GET /certificates/:code, sem auth).
 */

export const certificateDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(6),
  eventId: z.string().uuid(),
  eventNome: z.string(),
  eventStartsAt: z.string().datetime(),
  eventEndsAt: z.string().datetime(),
  studentId: z.string().uuid(),
  studentNome: z.string(),
  studentMatricula: z.string().nullable(),
  studentTipo: z.enum(['INTERNAL', 'EXTERNAL']),
  generatedAt: z.string().datetime(),
  /** Quantos carimbos obrigatorios o aluno completou (>= total). */
  totalRequired: z.number().int().nonnegative(),
  totalCompleted: z.number().int().nonnegative(),
});
export type CertificateDto = z.infer<typeof certificateDtoSchema>;
