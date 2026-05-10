'use client';

import { clsx } from 'clsx';
import {
  MAP_LOCATION_KIND_META,
  type ActivityDto,
  type MapLocationDto,
  type MapLocationKind,
} from '@eventpass/shared';

interface Props {
  location: MapLocationDto | null;
  onClose: () => void;
  /** Render livre de acoes no cabecalho (ex: editar/excluir para admin). */
  headerActions?: React.ReactNode;
  /** Callback de inscricao em atividade (estudante). */
  onRegisterActivity?: (activity: ActivityDto) => Promise<void> | void;
  /** Callback de cancelamento de inscricao. */
  onUnregisterActivity?: (activity: ActivityDto) => Promise<void> | void;
  /** Estado de loading por activity id. */
  registeringIds?: string[];
  /** Render extra dentro do painel (ex: formulario de atividade no editor). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Painel de detalhes de uma location. Visual claro (design system)
 * contrastando com o canvas escuro do mapa. Desliza da direita no desktop
 * e sobe como bottom-sheet no mobile.
 */
export function VenueMapDetailsPanel({
  location,
  onClose,
  headerActions,
  onRegisterActivity,
  onUnregisterActivity,
  registeringIds = [],
  footer,
  className,
}: Props) {
  if (!location) return null;

  const meta = MAP_LOCATION_KIND_META[location.kind as MapLocationKind];
  const color = location.corHex ?? meta.defaultColor;

  return (
    <aside
      className={clsx(
        'relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-fade-up',
        'md:max-w-sm',
        className,
      )}
    >
      {/* Faixa de cor no topo */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}00)`,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <span
              className="grid h-3 w-3 place-items-center rounded-full text-[9px] text-venue-canvas"
              style={{ backgroundColor: color }}
            >
              {location.icone ?? meta.defaultIcon}
            </span>
            {meta.label}
          </span>
          <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-slate-900">
            {location.titulo}
          </h3>
          {location.company && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-brand-primary">
              {location.company.nome}
            </p>
          )}
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            {location.x.toFixed(1)}, {location.y.toFixed(1)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      </div>

      {/* Descricao */}
      {location.descricao && (
        <div className="border-b border-slate-100 p-5 text-sm leading-relaxed text-slate-700">
          {location.descricao}
        </div>
      )}

      {/* Atividades */}
      {location.activities.length > 0 && (
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="font-display text-base font-semibold text-slate-800">
              Acontecendo aqui
            </h4>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {location.activities.length} atividades
            </span>
          </div>
          <ol className="flex flex-col gap-2">
            {location.activities.map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                accent={color}
                loading={registeringIds.includes(a.id)}
                onRegister={onRegisterActivity}
                onUnregister={onUnregisterActivity}
              />
            ))}
          </ol>
        </div>
      )}

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-5">{footer}</div>
      )}
    </aside>
  );
}

function ActivityItem({
  activity,
  accent,
  loading,
  onRegister,
  onUnregister,
}: {
  activity: ActivityDto;
  accent: string;
  loading: boolean;
  onRegister?: (a: ActivityDto) => Promise<void> | void;
  onUnregister?: (a: ActivityDto) => Promise<void> | void;
}) {
  const start = new Date(activity.startsAt);
  const end = new Date(activity.endsAt);
  const fullLotado =
    activity.capacidade !== null &&
    activity.totalInscritos >= activity.capacidade &&
    !activity.jaInscrito;

  return (
    <li className="relative rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300">
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start gap-3 pl-3">
        <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 px-2 py-1 text-center">
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
            {start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </span>
          <span className="font-display text-xl font-semibold leading-none text-slate-900">
            {start.getDate()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 line-clamp-2">
            {activity.titulo}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {formatTime(start)} – {formatTime(end)}
            {activity.palestrante && <> · {activity.palestrante}</>}
          </p>
          {activity.descricao && (
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">
              {activity.descricao}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {activity.capacidade !== null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {activity.totalInscritos}/{activity.capacidade} vagas
              </span>
            )}
            {activity.jaInscrito && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                inscrito
              </span>
            )}
            {fullLotado && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                lotado
              </span>
            )}
            {activity.permitirInscricao && onRegister && !activity.jaInscrito && !fullLotado && (
              <button
                type="button"
                onClick={() => onRegister(activity)}
                disabled={loading}
                className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Inscrevendo…' : 'Inscrever-me'}
              </button>
            )}
            {activity.jaInscrito && onUnregister && (
              <button
                type="button"
                onClick={() => onUnregister(activity)}
                disabled={loading}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {loading ? '…' : 'Cancelar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
