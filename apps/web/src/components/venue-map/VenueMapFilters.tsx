'use client';

import { clsx } from 'clsx';
import {
  MAP_LOCATION_KIND_META,
  MAP_LOCATION_KINDS,
  type MapLocationKind,
} from '@eventpass/shared';

interface Props {
  activeKinds: MapLocationKind[];
  onChange: (kinds: MapLocationKind[]) => void;
  availableKinds: MapLocationKind[];
  className?: string;
}

/**
 * Barra de filtros por tipo de location. Quando nenhum kind esta ativo,
 * todos sao mostrados (comportamento interpretado pelo VenueMapCanvas).
 */
export function VenueMapFilters({
  activeKinds,
  onChange,
  availableKinds,
  className,
}: Props) {
  const toggle = (k: MapLocationKind) => {
    onChange(
      activeKinds.includes(k)
        ? activeKinds.filter((x) => x !== k)
        : [...activeKinds, k],
    );
  };

  const kindsToShow = MAP_LOCATION_KINDS.filter((k) => availableKinds.includes(k));

  if (kindsToShow.length === 0) return null;

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur',
        className,
      )}
    >
      <span className="pl-3 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">
        filtrar
      </span>
      {kindsToShow.map((k) => {
        const meta = MAP_LOCATION_KIND_META[k];
        const active = activeKinds.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={clsx(
              'group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
              active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <span
              className="grid h-4 w-4 place-items-center rounded-full text-[9px] text-venue-canvas"
              style={{ backgroundColor: meta.defaultColor }}
            >
              {meta.defaultIcon}
            </span>
            {meta.label}
          </button>
        );
      })}
      {activeKinds.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-1 rounded-full px-3 py-1 text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
        >
          limpar
        </button>
      )}
    </div>
  );
}
