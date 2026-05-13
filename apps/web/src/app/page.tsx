'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicEvent } from '@eventpass/shared';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeEvent, setActiveEvent] = useState<PublicEvent | null | undefined>(undefined);

  // Pega o primeiro evento publico (RUNNING > PUBLISHED) para mostrar o
  // branding institucional sem precisar de auth. Plataforma = EventPass;
  // a "marca" do dia (UCB Eventos, etc.) vem desse evento ativo.
  useEffect(() => {
    void (async () => {
      try {
        const rows = await api<PublicEvent[]>('/events/public');
        setActiveEvent(rows[0] ?? null);
      } catch {
        setActiveEvent(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (user.tipoPerfil === 'ADMIN') router.replace('/admin');
    else if (user.tipoPerfil === 'COMPANY') router.replace('/empresa');
    else if (user.tipoPerfil === 'VOLUNTEER') router.replace('/voluntario');
    else router.replace('/estudante');
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  const publisher = activeEvent?.branding?.publisher;
  const tagline = activeEvent?.branding?.tagline ?? activeEvent?.descricao ?? undefined;
  const footer = activeEvent?.branding?.footer;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        {publisher ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {publisher}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-primary">
              {activeEvent?.nome ?? 'EventPass'}
            </h1>
            {tagline && (
              <p className="mt-2 text-sm text-slate-600">{tagline}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-brand-primary">
              {activeEvent?.nome ?? 'EventPass'}
            </h1>
            <p className="mt-2 text-slate-600">
              {tagline ?? 'Passaporte digital para eventos'}
            </p>
          </>
        )}
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
        <Link
          className="text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
          href="/cadastro"
        >
          Nao tenho cadastro
        </Link>
        <Link
          className="text-center text-xs font-medium text-slate-400 underline-offset-2 hover:underline"
          href="/login/voluntario"
        >
          Sou voluntario do evento
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        {footer ?? 'Plataforma modular para organizacao de eventos'}
      </p>
    </main>
  );
}
