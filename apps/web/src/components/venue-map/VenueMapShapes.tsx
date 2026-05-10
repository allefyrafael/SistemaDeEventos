import { clsx } from 'clsx';
import type { MapLocationDto, MapLocationKind } from '@eventpass/shared';
import type { VenueMapMode } from './types';
import { handleEditorShapePointerDown } from './venue-map-canvas-pointer';

export interface ShapeProps {
  loc: MapLocationDto;
  pos: { x: number; y: number };
  color: string;
  icon: string;
  selected: boolean;
  dimmed: boolean;
  mode: VenueMapMode;
  onSelect?: (l: MapLocationDto | null) => void;
  onStartDrag: (id: string) => void;
}

export function PinShape({
  loc,
  pos,
  color,
  icon,
  selected,
  dimmed,
  mode,
  onSelect,
  onStartDrag,
}: ShapeProps) {
  const common = clsx(
    'group absolute -translate-x-1/2 -translate-y-1/2 transition-opacity',
    dimmed ? 'opacity-25' : 'opacity-100',
  );

  if (mode === 'viewer') {
    return (
      <button
        type="button"
        className={clsx(common, 'cursor-pointer')}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(loc);
        }}
        aria-label={loc.titulo}
      >
        <PinBody color={color} icon={icon} selected={selected} title={loc.titulo} />
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        common,
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60',
      )}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(loc);
        }
      }}
      onMouseDown={(e) => handleEditorShapePointerDown(e, loc, onSelect, onStartDrag)}
      aria-label={loc.titulo}
    >
      <PinBody color={color} icon={icon} selected={selected} title={loc.titulo} />
    </div>
  );
}

function PinBody({
  color,
  icon,
  selected,
  title,
}: {
  color: string;
  icon: string;
  selected: boolean;
  title: string;
}) {
  return (
    <>
      <span
        className="absolute left-1/2 top-1/2 block h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pin-pulse"
        style={{ backgroundColor: color }}
      />
      <span
        className="absolute left-1/2 top-1/2 block h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
        style={{ backgroundColor: color, opacity: 0.45 }}
      />
      {selected && (
        <>
          <span
            className="absolute left-1/2 top-1/2 block h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed animate-orbit"
            style={{ borderColor: color }}
          />
          <span
            className="absolute left-1/2 top-1/2 block h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: `${color}18` }}
          />
        </>
      )}
      <span
        className={clsx(
          'relative grid h-9 w-9 place-items-center rounded-full text-sm font-semibold shadow-lg ring-2 ring-venue-canvas transition-transform group-hover:scale-110',
          selected && 'scale-110 ring-brand-accent/40',
        )}
        style={{
          backgroundColor: color,
          color: '#0B1220',
          boxShadow: `0 0 28px 3px ${color}55`,
        }}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap rounded-lg border border-venue-line bg-venue-canvas/95 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-venue-ink/90 shadow-md backdrop-blur transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {title}
      </span>
    </>
  );
}

export function AreaShape({
  loc,
  pos,
  color,
  icon,
  selected,
  dimmed,
  mode,
  onSelect,
  onStartDrag,
}: ShapeProps) {
  const width = loc.larguraPct ?? 10;
  const height = loc.alturaPct ?? 6;
  const common = clsx(
    'group absolute -translate-x-1/2 -translate-y-1/2 transition-opacity',
    dimmed ? 'opacity-25' : 'opacity-100',
  );

  const style = {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: `translate(-50%, -50%) rotate(${loc.rotacaoDeg}deg)`,
  };

  if (mode === 'viewer') {
    return (
      <button
        type="button"
        className={clsx(common, 'cursor-pointer')}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(loc);
        }}
        aria-label={loc.titulo}
      >
        <AreaFill color={color} icon={icon} selected={selected} title={loc.titulo} />
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        common,
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60',
      )}
      style={style}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(loc);
        }
      }}
      onMouseDown={(e) => handleEditorShapePointerDown(e, loc, onSelect, onStartDrag)}
      aria-label={loc.titulo}
    >
      <AreaFill color={color} icon={icon} selected={selected} title={loc.titulo} />
    </div>
  );
}

function AreaFill({
  color,
  icon,
  selected,
  title,
}: {
  color: string;
  icon: string;
  selected: boolean;
  title: string;
}) {
  return (
    <>
      <span
        className={clsx(
          'absolute inset-0 rounded-lg border-2 transition',
          selected ? 'border-solid' : 'border-dashed group-hover:border-solid',
        )}
        style={{
          borderColor: color,
          backgroundColor: `${color}22`,
          boxShadow: selected ? `0 0 32px 6px ${color}44` : undefined,
        }}
      />
      {selected && (
        <span
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
          aria-hidden
        >
          <span
            className="absolute inset-x-0 top-0 h-[28%] animate-scanline"
            style={{
              background: `linear-gradient(180deg, transparent, ${color}35, transparent)`,
            }}
          />
        </span>
      )}
      <span className="absolute left-2 top-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-venue-ink/95">
        <span
          className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-venue-canvas shadow-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        {title}
      </span>
    </>
  );
}
