import { clsx } from 'clsx';
import type { VenueMapDto } from '@eventpass/shared';

interface Props {
  data: VenueMapDto;
  isEditor: boolean;
  editorTool: 'place' | 'pan';
  onEditorTool: (t: 'place' | 'pan') => void;
  zoom: number;
  onZoomDelta: (delta: number) => void;
  onZoomReset: () => void;
}

export function VenueMapEditorChrome({
  data,
  isEditor,
  editorTool,
  onEditorTool,
  zoom,
  onZoomDelta,
  onZoomReset,
}: Props) {
  return (
    <>
      <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2 sm:left-4 sm:right-4 sm:top-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-venue-ink/45">
            <span className="font-display text-base font-semibold italic tracking-normal text-venue-ink normal-case">
              {data.titulo ?? 'Mapa do evento'}
            </span>
            <span className="mt-0.5 block">
              {isEditor ? (
                <>
                  <span className="text-brand-accent/90">editor</span> · {data.viewportWidth}×
                  {data.viewportHeight}
                </>
              ) : (
                <>
                  visitante · {data.viewportWidth}×{data.viewportHeight}
                </>
              )}
            </span>
          </div>
        </div>

        {isEditor && (
          <div
            role="group"
            aria-label="Ferramentas do mapa"
            className="flex shrink-0 rounded-full border border-venue-line bg-venue-canvas2/90 p-1 shadow-lg backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => onEditorTool('place')}
              className={clsx(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]',
                editorTool === 'place'
                  ? 'bg-brand-accent text-venue-canvas shadow-md'
                  : 'text-venue-ink/70 hover:bg-venue-ink/5',
              )}
              title="Clique no mapa para adicionar o tipo escolhido na paleta"
            >
              ◎ Colocar
            </button>
            <button
              type="button"
              onClick={() => onEditorTool('pan')}
              className={clsx(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]',
                editorTool === 'pan'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-venue-ink/70 hover:bg-venue-ink/5',
              )}
              title="Arraste o fundo para navegar (nao adiciona pontos)"
            >
              ✋ Mover mapa
            </button>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-venue-line bg-venue-canvas2/80 px-1 py-1 font-mono text-[11px] text-venue-ink/80 backdrop-blur">
          <button
            type="button"
            onClick={() => onZoomDelta(-0.15)}
            className="rounded-full px-2 py-0.5 hover:bg-venue-ink/5"
            title="Diminuir zoom"
          >
            −
          </button>
          <span className="min-w-[3ch] text-center tabular-nums">{Math.round(zoom * 100)}</span>
          <button
            type="button"
            onClick={() => onZoomDelta(0.15)}
            className="rounded-full px-2 py-0.5 hover:bg-venue-ink/5"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            className="ml-1 rounded-full border-l border-venue-line px-2 py-0.5 text-[10px] uppercase tracking-wider hover:bg-venue-ink/5"
            title="Centralizar"
          >
            reset
          </button>
        </div>
      </div>

      {isEditor && (
        <p className="absolute bottom-14 left-4 right-4 z-20 mx-auto max-w-lg text-center font-mono text-[10px] uppercase tracking-[0.2em] text-venue-ink/50 sm:text-left">
          {editorTool === 'place' ? (
            <>
              <span className="text-brand-accent">Colocar</span> — clique no mapa ·{' '}
              <span className="text-venue-ink/70">arraste um ponto</span> para reposicionar
            </>
          ) : (
            <>
              <span className="text-brand-primary/90">Mover mapa</span> — arraste o fundo · volte a{' '}
              <span className="text-brand-accent">Colocar</span> para novos pontos
            </>
          )}
        </p>
      )}
    </>
  );
}
