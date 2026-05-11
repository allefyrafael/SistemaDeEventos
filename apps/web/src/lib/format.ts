/**
 * Mascara CPF para exibicao publica/listagens (LGPD).
 * Mostra apenas primeiros 3 e ultimos 2 digitos: 123.***.**89
 */
export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.**${digits.slice(9)}`;
}

/**
 * Formata CPF com pontuacao para exibicao em tela do dono (sem mascara).
 * Ex: 12345678901 → 123.456.789-01
 */
export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
