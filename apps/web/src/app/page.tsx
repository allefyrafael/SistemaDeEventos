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
          Sou estudante
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
      </div>
      <p className="text-center text-xs text-slate-400">
        Plataforma modular para organizacao de eventos
      </p>
    </main>
  );
}
