// Storage simples de tokens. Em producao trocar por cookie httpOnly com refresh no servidor.
// Por enquanto localStorage atende o escopo PWA e permite dev rapido.

export type UserType = 'ADMIN' | 'COMPANY' | 'STUDENT' | 'VOLUNTEER';

export interface AuthUser {
  id: string;
  nome: string;
  tipoPerfil: UserType;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const KEY = 'eventpass.auth';

export function getTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(t: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(t));
  window.dispatchEvent(new Event('eventpass:auth-change'));
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('eventpass:auth-change'));
}
