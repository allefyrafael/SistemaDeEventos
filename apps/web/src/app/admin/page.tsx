'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { clsx } from 'clsx';
import type { EventStatus, FeatureModule } from '@eventpass/shared';
import { api } from '../../lib/api';
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR } from '../../lib/event-status';
import { Button } from '../../components/form';

interface EventRow {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  modules: FeatureModule[];
}

export default function AdminHomePage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api<EventRow[]>('/events');
        setEvents(rows);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Eventos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre um evento e entre nele para gerenciar empresas, participantes,
            carimbos e funcionalidades especificas.
          </p>
        </div>
        <Link href={'/admin/eventos/novo' as Route}>
          <Button>+ Novo evento</Button>
        </Link>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {!events ? (
        <p className="text-slate-500">Carregando...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-700">
            Nenhum evento cadastrado
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Crie seu primeiro evento para comecar a configurar empresas, carimbos e modulos.
          </p>
          <Link
            href={'/admin/eventos/novo' as Route}
            className="mt-4 inline-block rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Criar primeiro evento
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/eventos/${e.id}` as Route}
              className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-brand-primary">
                    {e.nome}
                  </h3>
                  <p className="text-xs text-slate-500">/{e.slug}</p>
                </div>
                <span
                  className={clsx(
                    'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    EVENT_STATUS_COLOR[e.status],
                  )}
                >
                  {EVENT_STATUS_LABEL[e.status]}
                </span>
              </div>
              {e.descricao && (
                <p className="line-clamp-2 text-sm text-slate-600">{e.descricao}</p>
              )}
              <p className="text-xs text-slate-500">
                {new Date(e.startsAt).toLocaleDateString('pt-BR')} ate{' '}
                {new Date(e.endsAt).toLocaleDateString('pt-BR')}
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  {e.modules.length} modulo(s) ativo(s)
                </span>
                <span className="text-xs font-semibold text-brand-primary">
                  Gerenciar →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
