'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicEvent } from '@eventpass/shared';
import { GraduationCap, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Triagem inicial para quem nao tem cadastro: pergunta se e estudante da
 * instituicao organizadora (auto-cadastro com matricula UC########) ou
 * visitante externo (auto-cadastro so com CPF + senha).
 */
export default function CadastroTriagePage() {
  const [activeEvent, setActiveEvent] = useState<PublicEvent | null | undefined>(undefined);

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

  const publisher = activeEvent?.branding?.publisher;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6 pb-12">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-brand-primary">
          &larr; Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="text-sm text-slate-600">
          Voce e estudante {publisher ? `da ${publisher.replace(/^UCB /i, 'UCB ')}` : 'da instituicao organizadora'}{' '}
          ou visitante externo?
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/cadastro/estudante"
          className="group flex items-start gap-4 rounded-xl border-2 border-brand-primary bg-white p-5 shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <GraduationCap size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-brand-primary">Sou estudante</p>
            <p className="mt-1 text-sm text-slate-600">
              Tenho matricula institucional no padrao{' '}
              <span className="font-mono font-semibold">UC + 8 digitos</span> (ex: UC24101130).
            </p>
          </div>
        </Link>

        <Link
          href="/cadastro/visitante"
          className="group flex items-start gap-4 rounded-xl border border-slate-300 bg-white p-5 shadow-sm transition hover:border-brand-primary active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <UserPlus size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">Sou visitante externo</p>
            <p className="mt-1 text-sm text-slate-600">
              Nao tenho vinculo institucional, mas vou participar do evento.
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        Ja tem cadastro?{' '}
        <Link href="/login/estudante" className="font-semibold text-brand-primary">
          Faca login
        </Link>
      </p>
    </main>
  );
}
