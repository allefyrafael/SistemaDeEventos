import { z } from 'zod';

// Validacao de CPF (apenas formato - 11 digitos numericos).
// Validacao de digitos verificadores deve ser feita server-side.
export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(11, 'CPF deve ter 11 digitos'));

export const matriculaSchema = z
  .string()
  .trim()
  .min(4, 'Matricula invalida')
  .max(20);

// Tres formas de login correspondem aos tres perfis:
export const adminLoginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(8, 'Senha minima de 8 caracteres'),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const companyLoginSchema = z.object({
  cpfEmpresa: cpfSchema,       // CPF vinculado a company
  cpfResponsavel: cpfSchema,   // CPF do responsavel cadastrado pelo ADM
});
export type CompanyLoginInput = z.infer<typeof companyLoginSchema>;

export const studentLoginSchema = z.object({
  matricula: matriculaSchema,
  cpf: cpfSchema,
});
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

// Auto-cadastro de visitante externo (sem matricula). O visitante define
// uma senha, que sera usada nos proximos logins. Tambem precisa indicar
// o evento ao qual quer se inscrever.
export const visitorRegisterSchema = z.object({
  nome: z.string().trim().min(3, 'Nome muito curto').max(120),
  cpf: cpfSchema,
  email: z.string().email('Email invalido').max(120),
  senha: z.string().min(8, 'Senha minima de 8 caracteres').max(72),
  eventId: z.string().uuid('Evento invalido'),
});
export type VisitorRegisterInput = z.infer<typeof visitorRegisterSchema>;

export const visitorLoginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(8, 'Senha minima de 8 caracteres').max(72),
});
export type VisitorLoginInput = z.infer<typeof visitorLoginSchema>;

export const userTypeSchema = z.enum(['ADMIN', 'COMPANY', 'STUDENT']);
export type UserType = z.infer<typeof userTypeSchema>;
