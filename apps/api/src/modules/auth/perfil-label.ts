import { UserType } from '@prisma/client';

/**
 * Rotulo legivel (pt-BR) de cada tipo de perfil. Usado em mensagens de
 * conflito ("Este CPF ja esta cadastrado como <label>") para que o erro
 * seja inequivoco — em vez do generico "outro perfil".
 */
const LABELS: Record<UserType, string> = {
  ADMIN: 'administrador',
  COMPANY: 'empresa',
  STUDENT: 'participante (estudante ou visitante)',
  VOLUNTEER: 'voluntario',
};

export function perfilLabel(tipo: UserType): string {
  return LABELS[tipo] ?? 'outro perfil';
}
