'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import {
  clearTokens,
  getTokens,
  setTokens,
  type AuthTokens,
  type AuthUser,
  type UserType,
} from './auth-store';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginAdmin: (cpf: string, senha: string) => Promise<AuthUser>;
  loginCompany: (cpfEmpresa: string, cpfResponsavel: string) => Promise<AuthUser>;
  loginStudent: (matricula: string, cpf: string) => Promise<AuthUser>;
  loginVisitor: (cpf: string, senha: string) => Promise<AuthUser>;
  registerVisitor: (input: {
    nome: string;
    cpf: string;
    email: string;
    senha: string;
    eventId: string;
  }) => Promise<AuthUser>;
  registerStudent: (input: {
    matricula: string;
    nome: string;
    cpf: string;
    email: string;
    senha: string;
    eventId: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sync = () => setUser(getTokens()?.user ?? null);
    sync();
    setLoading(false);
    window.addEventListener('eventpass:auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('eventpass:auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const doLogin = useCallback(async (path: string, body: Record<string, string>): Promise<AuthUser> => {
    const resp = await api<AuthTokens>(path, { method: 'POST', body: JSON.stringify(body) });
    setTokens(resp);
    setUser(resp.user);
    return resp.user;
  }, []);

  const loginAdmin = useCallback(
    (cpf: string, senha: string) => doLogin('/auth/login/admin', { cpf, senha }),
    [doLogin],
  );
  const loginCompany = useCallback(
    (cpfEmpresa: string, cpfResponsavel: string) =>
      doLogin('/auth/login/empresa', { cpfEmpresa, cpfResponsavel }),
    [doLogin],
  );
  const loginStudent = useCallback(
    (matricula: string, cpf: string) =>
      doLogin('/auth/login/estudante', { matricula, cpf }),
    [doLogin],
  );
  const loginVisitor = useCallback(
    (cpf: string, senha: string) => doLogin('/auth/login/visitante', { cpf, senha }),
    [doLogin],
  );
  const registerVisitor = useCallback(
    async (input: { nome: string; cpf: string; email: string; senha: string; eventId: string }) => {
      const resp = await api<AuthTokens>('/auth/register/visitante', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setTokens(resp);
      setUser(resp.user);
      return resp.user;
    },
    [],
  );
  const registerStudent = useCallback(
    async (input: {
      matricula: string;
      nome: string;
      cpf: string;
      email: string;
      senha: string;
      eventId: string;
    }) => {
      const resp = await api<AuthTokens>('/auth/register/estudante', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setTokens(resp);
      setUser(resp.user);
      return resp.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    const t = getTokens();
    if (t?.refreshToken) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: t.refreshToken }),
        });
      } catch {
        // ignora falhas - logout e idempotente
      }
    }
    clearTokens();
    setUser(null);
    router.replace('/');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAdmin,
        loginCompany,
        loginStudent,
        loginVisitor,
        registerVisitor,
        registerStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de <AuthProvider>');
  return ctx;
}

export function useRequireRole(allowed: UserType[]): AuthUser | null {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!allowed.includes(user.tipoPerfil)) {
      router.replace('/');
    }
  }, [loading, user, allowed, router]);
  return user;
}
