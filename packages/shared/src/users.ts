import { z } from 'zod';
import { cpfOnlyDigitsSchema } from './common';

export const studentCsvRowSchema = z.object({
  matricula: z.string().trim().min(4).max(20),
  nome: z.string().trim().min(2).max(120),
  cpf: cpfOnlyDigitsSchema,
  email: z.string().email(),
});
export type StudentCsvRow = z.infer<typeof studentCsvRowSchema>;

export const studentImportResultSchema = z.object({
  totalLinhas: z.number().int().nonnegative(),
  criados: z.number().int().nonnegative(),
  atualizados: z.number().int().nonnegative(),
  ignorados: z.number().int().nonnegative(),
  erros: z.array(
    z.object({
      linha: z.number().int().positive(),
      mensagem: z.string(),
    }),
  ),
});
export type StudentImportResult = z.infer<typeof studentImportResultSchema>;

export const externalStudentSignupSchema = z.object({
  nome: z.string().min(2).max(120),
  cpf: cpfOnlyDigitsSchema,
  email: z.string().email(),
});
export type ExternalStudentSignupInput = z.infer<typeof externalStudentSignupSchema>;

export const adminCreateSchema = z.object({
  nome: z.string().min(2).max(120),
  cpf: cpfOnlyDigitsSchema,
  email: z.string().email(),
  senha: z.string().min(8).max(64),
});
export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

export const studentProfileUpdateSchema = z.object({
  linkedinUrl: z
    .string()
    .url()
    .refine((v) => /linkedin\.com/i.test(v), 'Deve ser um link do LinkedIn')
    .optional()
    .nullable(),
  curriculoKey: z.string().max(300).nullable().optional(),
});
export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;
