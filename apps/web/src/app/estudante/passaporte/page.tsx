'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { clsx } from 'clsx';
import { api } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';

interface PassportStatus {
  eventId: string;
  totalRequired: number;
  totalCompleted: number;
  completed: boolean;
  items: Array<{
    stampConfigId: string;
    titulo: string;
    ordem: number;
    obrigatorio: boolean;
    obtido: boolean;
    dataConclusao: string | null;
    companyId: string | null;
    companyNome: string | null;
    feedbackRespondido: boolean;
  }>;
}

export default function PassportPage() {
  const { event, loading: eventLoading } = useActiveEvent();
  const [status, setStatus] = useState<PassportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const s = await api<PassportStatus>(`/events/${event.id}/passport/me/status`);
        setStatus(s);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [event]);

  if (eventLoading || loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando passaporte...</p>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        Voce ainda nao esta inscrito em nenhum evento.
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Nao foi possivel carregar seu passaporte: {err}
      </div>
    );
  }
  if (!status) return null;

  const progress = status.totalRequired === 0
    ? 0
    : Math.min(100, (status.totalCompleted / status.totalRequired) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">Progresso</p>
          <p className="text-sm font-semibold text-slate-900">
            {status.totalCompleted}/{status.totalRequired}
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              status.completed ? 'bg-emerald-500' : 'bg-brand-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {status.completed && (
          <p className="mt-3 text-sm font-semibold text-emerald-700">
            Parabens! Voce concluiu todos os carimbos e esta apto ao certificado.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {status.items.map((item) => (
          <li
            key={item.stampConfigId}
            className={clsx(
              'flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm',
              item.obtido ? 'border-emerald-200' : 'border-slate-200',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold',
                  item.obtido
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400',
                )}
              >
                {item.obtido ? '✓' : item.ordem + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                <p className="text-xs text-slate-500">
                  {item.obtido
                    ? `Carimbado por ${item.companyNome ?? 'empresa'}`
                    : item.obrigatorio
                      ? 'Obrigatorio'
                      : 'Opcional'}
                </p>
              </div>
            </div>
            {item.obtido && !item.feedbackRespondido && item.companyId && (
              <Link
                href={`/estudante/feedback?company=${item.companyId}` as Route}
                className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Avaliar
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
