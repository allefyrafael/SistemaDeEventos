import { z } from 'zod';

// Validacao de CPF (apenas formato - 11 digitos numericos).
// Validacao de digitos verificadores deve ser feita server-side.
export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(11, 'CPF deve ter 11 digitos'));

/**
 * Matricula institucional. Aceita matriculas LEGADAS (formato livre,
 * importadas via CSV pelo admin no scaffold inicial) para nao quebrar dados
 * existentes — por isso a validacao do schema continua permissiva.
 *
 * Para AUTO-cadastro de novos estudantes (rota publica), use o
 * `matriculaUcbSchema` que exige o padrao `UC` + 8 digitos.
 */
export const matriculaSchema = z
  .string()
  .trim()
  .min(4, 'Matricula invalida')
  .max(20);

/**
 * Padrao oficial da UCB para auto-cadastro de estudantes internos:
 * `UC` (maiusculas) seguido de exatamente 8 digitos. Ex.: `UC24101130`.
 * Aplicado apenas no fluxo de auto-cadastro — matriculas antigas vindas
 * de CSV podem ter formato livre.
 */
export const matriculaUcbSchema = z
  .string()
  .trim()
  .regex(/^UC\d{8}$/, 'Matricula deve seguir o padrao UC seguido de 8 digitos (ex: UC24101130)');

// Tres formas de login correspondem aos tres perfis:
export const adminLoginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(8, 'Senha minima de 8 caracteres'),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Login do responsavel de empresa. CPF + senha pessoal (bcrypt), padrao
 * moderno. Cada responsavel cadastrado por uma empresa tem sua propria
 * senha — pode haver varios responsaveis para a mesma empresa, cada um
 * acessa com seu CPF + sua senha.
 */
export const companyLoginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(8, 'Senha minima de 8 caracteres'),
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

/**
 * Auto-cadastro de ESTUDANTE INTERNO (institucional). Exige a matricula
 * no padrao UC######## e cria o User como STUDENT/INTERNAL — SEM senha.
 * O login do estudante e por matricula + CPF (loginStudent), entao a
 * senha nao e necessaria. Sem checagem externa contra base da
 * instituicao (assume confianca); o admin pode auditar a lista
 * posteriormente.
 */
export const studentRegisterSchema = z.object({
  matricula: matriculaUcbSchema,
  nome: z.string().trim().min(3, 'Nome muito curto').max(120),
  cpf: cpfSchema,
  email: z.string().email('Email invalido').max(120),
  eventId: z.string().uuid('Evento invalido'),
});
export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;

export const userTypeSchema = z.enum(['ADMIN', 'COMPANY', 'STUDENT', 'VOLUNTEER']);
export type UserType = z.infer<typeof userTypeSchema>;

/**
 * Escopo do voluntario DENTRO de um evento. Uma mesma pessoa pode ser
 * voluntaria de estudantes em um evento e de empresas em outro — por isso
 * vive em EventMember.role, nao em User.tipoPerfil.
 */
export const volunteerScopeSchema = z.enum(['VOLUNTEER_STUDENTS', 'VOLUNTEER_COMPANIES']);
export type VolunteerScope = z.infer<typeof volunteerScopeSchema>;

/**
 * Login de voluntario: CPF + senha pessoal, mesmo padrao do admin/empresa.
 * Permissoes especificas vem do EventMember.role no evento ativo.
 */
export const volunteerLoginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(8, 'Senha minima de 8 caracteres'),
});
export type VolunteerLoginInput = z.infer<typeof volunteerLoginSchema>;

/**
 * Cadastro de voluntario por admin do evento. `scope` define se ele
 * gerencia estudantes ou empresas neste evento (ou ambos, com 2 cadastros).
 */
export const volunteerCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Nome muito curto').max(120),
  cpf: cpfSchema,
  email: z.string().email('Email invalido').max(120),
  senha: z.string().min(8, 'Senha minima de 8 caracteres').max(72),
  scope: volunteerScopeSchema,
});
export type VolunteerCreateInput = z.infer<typeof volunteerCreateSchema>;

/** Reset administrativo de senha de qualquer usuario (estudante/empresa/voluntario). */
export const senhaResetSchema = z.object({
  novaSenha: z.string().min(8, 'Senha minima de 8 caracteres').max(72),
});
export type SenhaResetInput = z.infer<typeof senhaResetSchema>;

/** Item retornado por GET /events/:id/volunteers. */
export const volunteerDtoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cpf: z.string(),
  email: z.string().email().nullable(),
  scope: volunteerScopeSchema,
  ativo: z.boolean(),
  createdAt: z.string().datetime(),
});
export type VolunteerDto = z.infer<typeof volunteerDtoSchema>;
