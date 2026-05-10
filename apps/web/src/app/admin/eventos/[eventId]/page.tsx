'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  FEATURE_MODULE_ADMIN_SETUP,
  FEATURE_MODULE_META,
  type DashboardSummary,
  type FeatureModule,
} from '@eventpass/shared';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { useEventFromParams } from '../../../../lib/use-event-from-params';

function setupHref(eventId: string, id: FeatureModule): Route {
  const seg = FEATURE_MODULE_ADMIN_SETUP[id]?.segment ?? '';
  return (seg ? `/admin/eventos/${eventId}/${seg}` : `/admin/eventos/${eventId}`) as Route;
}

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function EventOverviewPage() {
  const params = useParams<{ eventId: string }>();
  const { event } = useEventFromParams();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const eventId = params?.eventId;
    if (!eventId || !event) return;
    if (!event.modules.includes('dashboard_live')) {
      setSummary(null);
      return;
    }
    let alive = true;
    async function load() {
      try {
        const s = await api<DashboardSummary>(`/events/${eventId}/dashboard/summary`);
        if (alive) setSummary(s);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    }
    void load();
    const int = setInterval(() => void load(), 10_000);
    return () => {
      alive = false;
      clearInterval(int);
    };
  }, [params, event]);

  if (!event) return null;

  const hasDashboard = event.modules.includes('dashboard_live');
  const activeModules = event.modules.map((id) => FEATURE_MODULE_META[id]).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-6 top-0 h-32 w-32 rounded-full bg-brand-accent/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
              / visao geral
            </span>
            <h2 className="font-display text-2xl font-semibold italic text-slate-900">
              Funcionalidades ativas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Atalhos para configurar apenas o que esta ligado neste evento.
            </p>
          </div>
          <Link
            href={`/admin/eventos/${event.id}/modulos` as Route}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
          >
            Gerir modulos
          </Link>
        </div>
        {activeModules.length === 0 ? (
          <p className="relative mt-4 text-sm text-slate-500">
            Nenhum modulo ativo. Abra <strong>Modulos</strong> para montar o evento.
          </p>
        ) : (
          <ul className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeModules.map((m) => {
              const setup = FEATURE_MODULE_ADMIN_SETUP[m.id];
              return (
                <li key={m.id}>
                  <Link
                    href={setupHref(event.id, m.id)}
                    className="group flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-brand-primary hover:bg-white hover:shadow-md"
                  >
                    <span className="text-xs font-semibold text-slate-900">{m.label}</span>
                    <span className="text-xs text-slate-500 line-clamp-2">
                      {setup?.setupHint ?? m.shortDescription}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                      {setup?.cta ?? 'Abrir'} →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!hasDashboard && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-900">
            Dashboard em tempo real desativado
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Ative o modulo &quot;Dashboard em tempo real&quot; em{' '}
            <Link
              href={`/admin/eventos/${event.id}/modulos` as Route}
              className="underline"
            >
              Modulos
            </Link>{' '}
            para ver metricas aqui.
          </p>
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {hasDashboard && !summary && (
        <p className="text-slate-500">Carregando metricas...</p>
      )}

      {hasDashboard && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Participantes"
              value={summary.totalParticipantes}
              hint="Inscritos no evento"
            />
            <Card
              title="Ativos"
              value={summary.participantesAtivos}
              hint="Com pelo menos 1 carimbo"
            />
            <Card
              title="Concludentes"
              value={summary.concludentes}
              hint="100% dos carimbos obrigatorios"
            />
            <Card title="Carimbos totais" value={summary.totalCarimbos} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">
                Empresas mais visitadas
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {summary.empresasMaisVisitadas.length === 0 && (
                  <li className="text-sm text-slate-500">Sem dados ainda.</li>
                )}
                {summary.empresasMaisVisitadas.map((e) => (
                  <li
                    key={e.companyId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">{e.nome}</span>
                    <span className="font-semibold text-brand-primary">{e.carimbos}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Melhor avaliadas</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {summary.empresasMelhorAvaliadas.length === 0 && (
                  <li className="text-sm text-slate-500">Sem avaliacoes.</li>
                )}
                {summary.empresasMelhorAvaliadas.map((e) => (
                  <li
                    key={e.companyId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">{e.nome}</span>
                    <span className="font-semibold text-amber-600">
                      ★ {e.notaMedia.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">
                        ({e.totalAvaliacoes})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Picos por hora</h3>
            {summary.picosHorario.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Sem dados ainda.</p>
            ) : (
              <HourlyBars picos={summary.picosHorario} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HourlyBars({ picos }: { picos: DashboardSummary['picosHorario'] }) {
  const max = Math.max(...picos.map((p) => p.carimbos), 1);
  return (
    <div className="mt-4 flex items-end gap-2 overflow-x-auto">
      {picos.map((p) => {
        const pct = (p.carimbos / max) * 100;
        const date = new Date(p.hora);
        const label = `${String(date.getHours()).padStart(2, '0')}h`;
        return (
          <div key={p.hora} className="flex min-w-[40px] flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end">
              <div
                className="w-full rounded-t bg-brand-primary"
                style={{ height: `${pct}%` }}
                title={`${p.carimbos} carimbos`}
              />
            </div>
            <span className="text-[10px] text-slate-500">{label}</span>
            <span className="text-[10px] font-semibold text-slate-700">{p.carimbos}</span>
          </div>
        );
      })}
    </div>
  );
}
