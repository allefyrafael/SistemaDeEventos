'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { clsx } from 'clsx';
import {
  FEATURE_MODULE_ADMIN_SETUP,
  FEATURE_MODULE_CATEGORY_LABEL,
  FEATURE_MODULE_META,
  type FeatureModule,
  type FeatureModuleMeta,
} from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { ErrorBanner, SuccessBanner } from '../../../../../components/form';

const CATEGORIES: FeatureModuleMeta['category'][] = [
  'participante',
  'empresa',
  'organizador',
];

function setupHref(eventId: string, id: FeatureModule): Route {
  const seg = FEATURE_MODULE_ADMIN_SETUP[id]?.segment ?? '';
  return (seg ? `/admin/eventos/${eventId}/${seg}` : `/admin/eventos/${eventId}`) as Route;
}

export default function EventModulesPage() {
  const { event, reload } = useEventFromParams();
  const [toggling, setToggling] = useState<FeatureModule | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!event) return null;

  const enabled = new Set<FeatureModule>(event.modules);
  const activeList = event.modules
    .map((id) => FEATURE_MODULE_META[id])
    .filter(Boolean);

  async function toggle(meta: FeatureModuleMeta) {
    if (!event) return;
    const turningOn = !enabled.has(meta.id);

    if (turningOn && meta.requires) {
      const missing = meta.requires.filter((r) => !enabled.has(r));
      if (missing.length > 0) {
        setErr(
          `Para ativar "${meta.label}" voce precisa ativar antes: ${missing
            .map((m) => FEATURE_MODULE_META[m].label)
            .join(', ')}.`,
        );
        return;
      }
    }
    if (!turningOn) {
      const dependents = Object.values(FEATURE_MODULE_META).filter(
        (other) =>
          other.id !== meta.id &&
          enabled.has(other.id) &&
          other.requires?.includes(meta.id),
      );
      if (dependents.length > 0) {
        setErr(
          `Nao e possivel desativar "${meta.label}" enquanto os modulos [${dependents
            .map((d) => d.label)
            .join(', ')}] estiverem ativos.`,
        );
        return;
      }
    }

    setErr(null);
    setOk(null);
    setToggling(meta.id);
    try {
      await api(`/events/${event.id}/modules`, {
        method: 'POST',
        body: { module: meta.id, enabled: turningOn },
      });
      setOk(`Modulo "${meta.label}" ${turningOn ? 'ativado' : 'desativado'}.`);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Cabecalho editorial */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-brand-primary/[0.06] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-brand-accent/25 blur-3xl" />
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-slate-400">
          / modulos / painel
        </span>
        <h2 className="font-display text-3xl font-semibold italic text-slate-900">
          Funcionalidades do evento
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          O painel abaixo mostra apenas o que esta <strong>ligado</strong> — com atalhos para
          configurar cada area. Em seguida, a biblioteca completa para ativar ou desativar
          modulos.
        </p>
      </header>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      {/* Painel: somente modulos ativos */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ligados agora
            </h3>
            <p className="font-display text-xl font-semibold text-slate-900">
              {activeList.length} funcionalidade{activeList.length === 1 ? '' : 's'} ativa
              {activeList.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {activeList.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-700">Nenhum modulo ativo</p>
            <p className="mt-1 text-sm text-slate-500">
              Ative itens na biblioteca abaixo para montar a experiencia deste evento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeList.map((m) => {
              const setup = FEATURE_MODULE_ADMIN_SETUP[m.id];
              return (
                <article
                  key={m.id}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-brand-primary/25 bg-white p-5 shadow-sm ring-1 ring-brand-primary/10 transition hover:border-brand-primary hover:shadow-md"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-brand-accent/15 blur-2xl transition group-hover:bg-brand-accent/25" />
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                      {FEATURE_MODULE_CATEGORY_LABEL[m.category]}
                    </span>
                  </div>
                  <h4 className="relative font-display text-lg font-semibold text-slate-900">
                    {m.label}
                  </h4>
                  <p className="relative text-sm text-slate-600 line-clamp-2">
                    {setup?.setupHint ?? m.shortDescription}
                  </p>
                  <Link
                    href={setupHref(event.id, m.id)}
                    className="relative inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.98] hover:bg-slate-800"
                  >
                    {setup?.cta ?? 'Abrir configuracao'}
                    <span aria-hidden>→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Biblioteca completa */}
      <section className="flex flex-col gap-4 border-t border-slate-200 pt-8">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Biblioteca
          </h3>
          <p className="mt-1 font-display text-xl font-semibold text-slate-900">
            Ativar ou desativar modulos
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Cada cartao explica o que a funcionalidade faz. Dependencias aparecem no texto.
          </p>
        </div>

        {CATEGORIES.map((cat) => {
          const mods = Object.values(FEATURE_MODULE_META).filter((m) => m.category === cat);
          return (
            <section key={cat} className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {FEATURE_MODULE_CATEGORY_LABEL[cat]}
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mods.map((m) => {
                  const active = enabled.has(m.id);
                  return (
                    <article
                      key={m.id}
                      className={clsx(
                        'flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm transition',
                        active
                          ? 'border-brand-primary ring-1 ring-brand-primary/20'
                          : 'border-slate-200',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-base font-bold text-slate-900">{m.label}</h5>
                          <p className="text-xs text-slate-500">{m.shortDescription}</p>
                        </div>
                        <ToggleButton
                          active={active}
                          loading={toggling === m.id}
                          onClick={() => void toggle(m)}
                        />
                      </div>
                      <p className="text-sm text-slate-700">{m.fullDescription}</p>
                      {m.requires && m.requires.length > 0 && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold">Depende de:</span>{' '}
                          {m.requires
                            .map((r) => FEATURE_MODULE_META[r].label)
                            .join(', ')}
                        </p>
                      )}
                      {active && FEATURE_MODULE_ADMIN_SETUP[m.id] && (
                        <Link
                          href={setupHref(event.id, m.id)}
                          className="text-xs font-medium text-brand-primary hover:underline"
                        >
                          Ir para {FEATURE_MODULE_ADMIN_SETUP[m.id]?.cta ?? 'configuracao'} →
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}

function ToggleButton({
  active,
  loading,
  onClick,
}: {
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition disabled:opacity-60',
        active
          ? 'border-brand-primary bg-brand-primary'
          : 'border-slate-300 bg-slate-200',
      )}
      aria-pressed={active}
      title={active ? 'Desativar modulo' : 'Ativar modulo'}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
          active ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}
