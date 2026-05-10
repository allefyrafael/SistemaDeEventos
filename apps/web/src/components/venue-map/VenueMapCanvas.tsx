'use client';

import { clsx } from 'clsx';
import {
  MAP_LOCATION_KIND_META,
  type MapLocationDto,
  type MapLocationKind,
} from '@eventpass/shared';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { VenueMapEditorChrome } from './VenueMapEditorChrome';
import { AreaShape, PinShape } from './VenueMapShapes';
import type {
  VenueMapClickEvent,
  VenueMapDragEvent,
  VenueMapProps,
} from './types';

/**
 * Canvas do VenueMap — cartografia editorial noturna (frontend-design)
 * com tokens da marca no contraste painel/claro (design-system).
 *
 * Editor:
 * - **Colocar**: clique no mapa vazio adiciona ponto; cursor mira; sem pan acidental.
 * - **Mover mapa**: cursor mao; arrastar desloca o mapa (como ferramentas de design).
 * - Pins: clique leve seleciona; arrastar (passou do limiar) move o ponto.
 */
export function VenueMapCanvas({
  data,
  mode = 'viewer',
  viewportMode = 'default',
  selectedId = null,
  highlightKinds,
  onSelect,
  onCanvasClick,
  onLocationDragEnd,
  emptyHint,
  className,
}: VenueMapProps) {
  const gridOn = data.theme?.gridOn ?? true;
  const noiseOn = data.theme?.noiseOn ?? true;
  const gridPatternId = useId().replace(/:/g, '');

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pinDragLatestRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressBoardClickRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  /** No editor: 'place' = clique coloca ponto; 'pan' = arrastar move o mapa. */
  const [editorTool, setEditorTool] = useState<'place' | 'pan'>('place');
  const [dragState, setDragState] = useState<
    | { kind: 'pan'; startX: number; startY: number; origX: number; origY: number }
    | { kind: 'pin'; locationId: string }
    | null
  >(null);
  const [draftPos, setDraftPos] = useState<Record<string, { x: number; y: number }>>(
    {},
  );

  const aspectRatio = data.viewportWidth / data.viewportHeight;
  const isEditor = mode === 'editor';
  const isMobileTall = viewportMode === 'mobileTall';

  const pctFromClient = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Em dispositivos touch, o scroll vertical da pagina nao deve virar zoom do mapa.
    const isCoarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    if (isCoarsePointer) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const next = z - e.deltaY * 0.001;
        return Math.min(3, Math.max(0.5, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      if (mode === 'viewer' || (isEditor && editorTool === 'pan')) {
        suppressBoardClickRef.current = false;
        setDragState({
          kind: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          origX: pan.x,
          origY: pan.y,
        });
      }
    },
    [mode, isEditor, editorTool, pan.x, pan.y],
  );

  useEffect(() => {
    if (!dragState) return;
    function onMove(e: MouseEvent) {
      if (!dragState) return;
      if (dragState.kind === 'pan') {
        const nx = dragState.origX + (e.clientX - dragState.startX);
        const ny = dragState.origY + (e.clientY - dragState.startY);
        if (
          Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY) >
          4
        ) {
          suppressBoardClickRef.current = true;
        }
        setPan({ x: nx, y: ny });
      } else if (dragState.kind === 'pin' && boardRef.current) {
        const p = pctFromClient(e.clientX, e.clientY);
        setDraftPos((d) => ({
          ...d,
          [dragState.locationId]: p,
        }));
        pinDragLatestRef.current = {
          id: dragState.locationId,
          x: Number(p.x.toFixed(2)),
          y: Number(p.y.toFixed(2)),
        };
      }
    }
    function onUp() {
      if (dragState?.kind === 'pin') {
        const latest = pinDragLatestRef.current;
        if (latest && latest.id === dragState.locationId) {
          onLocationDragEnd?.({
            locationId: latest.id,
            x: latest.x,
            y: latest.y,
          });
        }
        pinDragLatestRef.current = null;
      }
      if (dragState?.kind === 'pan') {
        window.setTimeout(() => {
          suppressBoardClickRef.current = false;
        }, 320);
      }
      setDragState(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, onLocationDragEnd, pctFromClient]);

  const onBoardClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditor || editorTool !== 'place') return;
      if (suppressBoardClickRef.current) return;
      if (e.target !== e.currentTarget) return;
      const { x, y } = pctFromClient(e.clientX, e.clientY);
      const ev: VenueMapClickEvent = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
      onCanvasClick?.(ev);
    },
    [isEditor, editorTool, onCanvasClick, pctFromClient],
  );

  const visibleLocations = highlightKinds?.length
    ? data.locations
    : data.locations;

  const dimmedId = (loc: MapLocationDto): boolean => {
    if (!highlightKinds || highlightKinds.length === 0) return false;
    return !highlightKinds.includes(loc.kind as MapLocationKind);
  };

  const outerCursor =
    mode === 'viewer' || (isEditor && editorTool === 'pan')
      ? 'cursor-grab active:cursor-grabbing'
      : isEditor && editorTool === 'place'
        ? 'cursor-crosshair'
        : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-venue-canvas text-venue-ink',
        'border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(240,179,35,0.12)]',
        className,
      )}
    >
      {/* Brilho de canto (identidade da marca) */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand-primary/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-brand-accent/20 blur-3xl"
        aria-hidden
      />

      <VenueMapEditorChrome
        data={data}
        isEditor={isEditor}
        editorTool={editorTool}
        onEditorTool={setEditorTool}
        zoom={zoom}
        onZoomDelta={(delta) => setZoom((z) => Math.min(3, Math.max(0.5, z + delta)))}
        onZoomReset={resetView}
      />

      <div
        className={clsx(
          'relative w-full select-none overflow-hidden pt-14 pb-12',
          isMobileTall ? 'h-[70svh] min-h-[430px] md:h-[72svh]' : 'aspect-[3/2]',
          outerCursor,
        )}
        style={{ aspectRatio: isMobileTall ? undefined : aspectRatio }}
      >
        <div
          ref={boardRef}
          data-testid="venue-map-board"
          onMouseDown={onBoardMouseDown}
          onClick={onBoardClick}
          className={clsx(
            'absolute inset-0 origin-center transition-transform duration-100 ease-out',
            dragState?.kind === 'pan' && '!duration-0',
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            touchAction: isEditor ? 'none' : 'pan-y pinch-zoom',
          }}
        >
          {data.backgroundUrl ? (
            <img
              src={data.backgroundUrl}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-85"
              draggable={false}
            />
          ) : (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 25% 15%, rgba(240,179,35,0.12), transparent 55%),' +
                  'radial-gradient(ellipse at 85% 80%, rgba(0,87,163,0.22), transparent 50%),' +
                  'linear-gradient(165deg, #0B1220 0%, #0e1628 45%, #111A2E 100%)',
              }}
            />
          )}

          {gridOn && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full text-venue-ink/[0.07]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id={`${gridPatternId}-fine`}
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </pattern>
                <pattern
                  id={`${gridPatternId}-coarse`}
                  width="200"
                  height="200"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 200 0 L 0 0 0 200"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.35"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${gridPatternId}-fine)`} />
              <rect width="100%" height="100%" fill={`url(#${gridPatternId}-coarse)`} />
            </svg>
          )}

          {noiseOn && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
              }}
            />
          )}

          {/* Mira suave no modo colocar */}
          {isEditor && editorTool === 'place' && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, transparent 49.5%, rgba(240,179,35,0.5) 50%, transparent 50.5%),' +
                  'linear-gradient(to bottom, transparent 49.5%, rgba(240,179,35,0.5) 50%, transparent 50.5%)',
                backgroundSize: '100% 100%',
              }}
              aria-hidden
            />
          )}

          <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] uppercase tracking-[0.25em] text-venue-ink/35">
            {data.viewportWidth}×{data.viewportHeight}
          </div>

          {visibleLocations.length === 0 && emptyHint && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs rounded-2xl border border-venue-line bg-venue-canvas2/75 px-5 py-3 text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-venue-ink/65 backdrop-blur">
                {emptyHint}
              </p>
            </div>
          )}

          {visibleLocations.map((loc) => {
            const meta = MAP_LOCATION_KIND_META[loc.kind as MapLocationKind];
            const color = loc.corHex ?? meta.defaultColor;
            const icon = loc.icone ?? meta.defaultIcon;
            const selected = loc.id === selectedId;
            const dimmed = dimmedId(loc);
            const pos = draftPos[loc.id] ?? { x: loc.x, y: loc.y };
            const hasArea =
              typeof loc.larguraPct === 'number' && typeof loc.alturaPct === 'number';

            return hasArea ? (
              <AreaShape
                key={loc.id}
                loc={loc}
                pos={pos}
                color={color}
                icon={icon}
                selected={selected}
                dimmed={dimmed}
                mode={mode}
                onSelect={onSelect}
                onStartDrag={(id) => {
                  pinDragLatestRef.current = {
                    id,
                    x: Number(pos.x.toFixed(2)),
                    y: Number(pos.y.toFixed(2)),
                  };
                  setDragState({ kind: 'pin', locationId: id });
                }}
              />
            ) : (
              <PinShape
                key={loc.id}
                loc={loc}
                pos={pos}
                color={color}
                icon={icon}
                selected={selected}
                dimmed={dimmed}
                mode={mode}
                onSelect={onSelect}
                onStartDrag={(id) => {
                  pinDragLatestRef.current = {
                    id,
                    x: Number(pos.x.toFixed(2)),
                    y: Number(pos.y.toFixed(2)),
                  };
                  setDragState({ kind: 'pin', locationId: id });
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_100px_24px_rgba(0,0,0,0.55)]" />
    </div>
  );
}
