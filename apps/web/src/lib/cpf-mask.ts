/**
 * Aplica a mascara visual de CPF (000.000.000-00) num input controlado.
 * Aceita qualquer entrada — descarta nao-digitos. Limita a 11 digitos.
 *
 * Use no `onChange` do input para apresentacao; envie sempre o valor
 * "limpo" (so digitos) ao backend.
 */
export function maskCpf(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Retorna so digitos do CPF (envio ao backend). */
export function stripCpf(input: string): string {
  return input.replace(/\D/g, '');
}
