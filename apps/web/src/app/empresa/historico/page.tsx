'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';

interface Visit {
  id: string;
  dataConclusao: string;
  feedbackRespondido: boolean;
  studentNome: string;
  studentMatricula: string | null;
  stampTitulo: string;
}

export default function CompanyHistoryPage() {
  const { event } = useActiveEvent();
  const [rows, setRows] = useState<Visit[] | null>(null);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      const data = await api<Visit[]>(`/events/${event.id}/scan/history`);
      setRows(data);
    })();
  }, [event]);

  if (!rows) return <p className="text-slate-500">Carregando...</p>;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center text-slate-500 shadow-sm">
        Ainda nao ha visitas registradas.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-600">{rows.length} visita(s) registrada(s)</p>
      <ul className="flex flex-col gap-2">
        {rows.map((v) => (
          <li
            key={v.id}
            className="flex items-start justify-between rounded-lg bg-white p-3 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{v.studentNome}</p>
              <p className="text-xs text-slate-500">
                {v.studentMatricula ? `Mat. ${v.studentMatricula} · ` : ''}
                {v.stampTitulo}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs text-slate-500">
                {new Date(v.dataConclusao).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {v.feedbackRespondido ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  avaliado
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  sem feedback
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
