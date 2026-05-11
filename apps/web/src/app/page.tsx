'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.tipoPerfil === 'ADMIN') router.replace('/admin');
    else if (user.tipoPerfil === 'COMPANY') router.replace('/empresa');
    else router.replace('/estudante');
  }, [user, loading, router]);

  // Evita piscar os CTAs durante a checagem inicial de sessao ou enquanto o
  // useEffect acima ainda nao redirecionou um usuario logado.
  if (loading || user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-primary">EventPass</h1>
        <p className="mt-2 text-slate-600">Passaporte digital para eventos</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          className="rounded-xl bg-brand-primary px-4 py-4 text-center font-semibold text-white shadow-sm active:scale-[0.98]"
          href="/login/estudante"
        >
          Sou participante
        </Link>
        <Link
          className="rounded-xl border-2 border-brand-primary px-4 py-4 text-center font-semibold text-brand-primary active:scale-[0.98]"
          href="/login/empresa"
        >
          Sou empresa
        </Link>
        <Link
          className="rounded-xl bg-slate-800 px-4 py-4 text-center font-semibold text-white active:scale-[0.98]"
          href="/login/admin"
        >
          Sou administrador
        </Link>
        <Link
          className="text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
          href="/cadastro/visitante"
        >
          Visitante externo? Crie seu cadastro
        </Link>
      </div>
      <p className="text-center text-xs text-slate-400">
        Plataforma modular para organizacao de eventos
      </p>
    </main>
  );
}
