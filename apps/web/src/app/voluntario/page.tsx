'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { GraduationCap, Building2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useRequireRole, useAuth } from '../../lib/auth-context';
import { ErrorBanner } from '../../components/form';

interface VolunteerScopeRow {
  eventId: string;
  eventNome: string;
  scopes: Array<'VOLUNTEER_STUDENTS' | 'VOLUNTEER_COMPANIES'>;
}

/**
 * Dashboard do voluntario. Lista os eventos em que ele atua e os escopos
 * disponiveis (estudantes, empresas, ou ambos). Cada card leva a uma
 * tela especifica de gestao.
 */
export default function VolunteerHomePage() {
  const user = useRequireRole(['VOLUNTEER']);
  const { logout } = useAuth();
  const [rows, setRows] = useState<VolunteerScopeRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await api<VolunteerScopeRow[]>('/auth/me/volunteer-scopes');
        setRows(data);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Area do voluntario
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{user.nome}</h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          Sair
        </button>
      </header>

      {err && <ErrorBanner>{err}</ErrorBanner>}

      {rows === null ? (
        <p className="text-sm text-slate-500">Carregando eventos...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">Sem eventos atribuidos</p>
          <p className="mt-1 text-xs text-slate-500">
            Voce ainda nao foi vinculado como voluntario em nenhum evento ativo.
            Procure o admin do evento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <section
              key={row.eventId}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">Evento</p>
              <h2 className="text-lg font-bold text-slate-900">{row.eventNome}</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <ActionCard
                  enabled={row.scopes.includes('VOLUNTEER_STUDENTS')}
                  href={`/voluntario/${row.eventId}/estudantes` as Route}
                  icon={<GraduationCap size={22} />}
                  title="Estudantes"
                  description="Reset de senha de estudantes deste evento."
                />
                <ActionCard
                  enabled={row.scopes.includes('VOLUNTEER_COMPANIES')}
                  href={`/voluntario/${row.eventId}/empresas` as Route}
                  icon={<Building2 size={22} />}
                  title="Empresas"
                  description="Cadastro de empresas e reset de senha dos responsaveis."
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function ActionCard({
  enabled,
  href,
  icon,
  title,
  description,
}: {
  enabled: boolean;
  href: Route;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  if (!enabled) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 opacity-60">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-slate-400">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">Sem permissao neste evento</p>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-brand-primary/30 bg-white p-4 transition hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-primary">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
