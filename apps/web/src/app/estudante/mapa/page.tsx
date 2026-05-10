'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  MAP_LOCATION_KIND_META,
  type ActivityDto,
  type MapLocationDto,
  type MapLocationKind,
  type VenueMapDto,
} from '@eventpass/shared';
import { api } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';
import {
  VenueMapCanvas,
  VenueMapDetailsPanel,
  VenueMapFilters,
} from '../../../components/venue-map';

export default function StudentMapaPage() {
  const { event, loading: eventLoading } = useActiveEvent();
  const [data, setData] = useState<VenueMapDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeKinds, setActiveKinds] = useState<MapLocationKind[]>([]);
  const [registeringIds, setRegisteringIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!event?.id) return;
    if (!event.modules?.includes('venue_map')) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const map = await api<VenueMapDto>(`/events/${event.id}/venue-map`);
      setData(map);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [event?.id, event?.modules]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => data?.locations.find((l) => l.id === selectedId) ?? null,
    [data, selectedId],
  );

  // Filtra pelo texto (aplicado apenas na "lista rapida" ao lado, nao no canvas)
  const filteredIndex = useMemo(() => {
    if (!data) return [] as MapLocationDto[];
    const q = search.trim().toLowerCase();
    if (!q) return data.locations;
    return data.locations.filter(
      (l) =>
        l.titulo.toLowerCase().includes(q) ||
        l.company?.nome.toLowerCase().includes(q) ||
        (l.descricao ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const availableKinds = useMemo(() => {
    if (!data) return [] as MapLocationKind[];
    const set = new Set<MapLocationKind>();
    data.locations.forEach((l) => set.add(l.kind as MapLocationKind));
    return Array.from(set);
  }, [data]);

  // Canvas usa filtro por kind: nao-ativos ficam dimmed
  const canvasData = useMemo(() => data ?? null, [data]);

  const register = useCallback(
    async (a: ActivityDto) => {
      if (!event?.id) return;
      setRegisteringIds((s) => [...s, a.id]);
      try {
        const updated = await api<ActivityDto>(
          `/events/${event.id}/venue-map/activities/${a.id}/register`,
          { method: 'POST' },
        );
        patchActivity(updated);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setRegisteringIds((s) => s.filter((id) => id !== a.id));
      }
    },
    [event?.id],
  );

  const unregister = useCallback(
    async (a: ActivityDto) => {
      if (!event?.id) return;
      setRegisteringIds((s) => [...s, a.id]);
      try {
        const updated = await api<ActivityDto>(
          `/events/${event.id}/venue-map/activities/${a.id}/register`,
          { method: 'DELETE' },
        );
        patchActivity(updated);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setRegisteringIds((s) => s.filter((id) => id !== a.id));
      }
    },
    [event?.id],
  );

  function patchActivity(updated: ActivityDto) {
    setData((d) =>
      d
        ? {
            ...d,
            locations: d.locations.map((l) => ({
              ...l,
              activities: l.activities.map((a) =>
                a.id === updated.id ? updated : a,
              ),
            })),
          }
        : d,
    );
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  if (eventLoading || loading) {
    return <p className="text-sm text-slate-500">Carregando mapa…</p>;
  }
  if (!event) {
    return <p className="text-sm text-slate-500">Nenhum evento disponivel.</p>;
  }
  if (!event.modules?.includes('venue_map')) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
          modulo desativado
        </p>
        <p className="mt-2 font-display text-xl font-semibold text-slate-800">
          Mapa nao disponivel neste evento
        </p>
        <p className="mt-1 text-sm text-slate-600">
          O organizador ainda nao ativou o mapa interativo para esta edicao.
        </p>
      </div>
    );
  }
  if (err) {
    return <p className="text-sm text-red-700">{err}</p>;
  }
  if (!data) return null;

  const isEmpty = data.locations.length === 0;
  const selectedKindMeta = selected
    ? MAP_LOCATION_KIND_META[selected.kind as MapLocationKind]
    : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_25px_80px_-30px_rgba(2,6,23,0.95)]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 h-64 w-64 rounded-full bg-brand-primary/25 blur-3xl" />
        <span className="relative font-mono text-[10px] uppercase tracking-[0.35em] text-white/55">
          / estudante / mapa imersivo
        </span>
        <h2 className="relative mt-2 font-display text-3xl font-semibold italic text-white md:text-4xl">
          {data.titulo ?? 'Onde tudo acontece'}
        </h2>
        <p className="relative mt-2 max-w-3xl text-sm text-white/80 md:text-[15px]">
          Explore stands, salas e auditorios por toque direto no mapa. Use filtros
          para reduzir ruido visual e abra o painel lateral para inscricao em
          atividades sem sair da tela.
        </p>
        {!isEmpty && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Pill>{data.locations.length} pontos ativos</Pill>
            <Pill>{availableKinds.length} categorias</Pill>
            <Pill>{filteredIndex.length} resultado(s) no indice</Pill>
            {selectedKindMeta && <Pill>Destaque: {selectedKindMeta.label}</Pill>}
          </div>
        )}
      </header>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Mobile-first layout */}
          <div className="flex flex-col gap-4 xl:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
                explorar mapa
              </p>
              <div className="mt-2 relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empresa, sala ou atividade..."
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                  ⌕
                </span>
              </div>
              <div className="mt-2">
                <VenueMapFilters
                  activeKinds={activeKinds}
                  onChange={setActiveKinds}
                  availableKinds={availableKinds}
                />
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {canvasData && (
                <VenueMapCanvas
                  data={canvasData}
                  mode="viewer"
                  viewportMode="mobileTall"
                  selectedId={selectedId}
                  highlightKinds={activeKinds}
                  onSelect={(l) => setSelectedId(l?.id ?? null)}
                  className="rounded-2xl"
                />
              )}
            </section>

            <QuickIndex
              items={filteredIndex}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />

            {selected ? (
              <VenueMapDetailsPanel
                location={selected}
                onClose={() => setSelectedId(null)}
                onRegisterActivity={register}
                onUnregisterActivity={unregister}
                registeringIds={registeringIds}
                className="w-full border-slate-300 shadow-none"
              />
            ) : (
              <IdleHint kinds={availableKinds} total={data.locations.length} />
            )}
          </div>

          {/* Desktop layout */}
          <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)] xl:gap-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    navegacao
                  </p>
                  <p className="text-sm text-slate-600">
                    Arraste para mover, scroll para zoom e toque nos pontos para abrir detalhes.
                  </p>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Limpar selecao
                  </button>
                )}
              </div>
              {canvasData && (
                <VenueMapCanvas
                  data={canvasData}
                  mode="viewer"
                  selectedId={selectedId}
                  highlightKinds={activeKinds}
                  onSelect={(l) => setSelectedId(l?.id ?? null)}
                  className="min-h-[620px]"
                />
              )}
            </section>

            <aside className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4 xl:sticky xl:top-[84px] xl:max-h-[calc(100dvh-120px)] xl:overflow-y-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  explorar mapa
                </p>
                <div className="mt-2 relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar empresa, sala ou atividade..."
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                    ⌕
                  </span>
                </div>
                <div className="mt-2">
                  <VenueMapFilters
                    activeKinds={activeKinds}
                    onChange={setActiveKinds}
                    availableKinds={availableKinds}
                  />
                </div>
              </div>

              <QuickIndex
                items={filteredIndex}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
              />

              {selected ? (
                <VenueMapDetailsPanel
                  location={selected}
                  onClose={() => setSelectedId(null)}
                  onRegisterActivity={register}
                  onUnregisterActivity={unregister}
                  registeringIds={registeringIds}
                  className="w-full border-slate-300 shadow-none"
                />
              ) : (
                <IdleHint kinds={availableKinds} total={data.locations.length} />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// QuickIndex (lista de pontos abaixo do canvas)
// ---------------------------------------------------------------

function QuickIndex({
  items,
  selectedId,
  onSelect,
}: {
  items: MapLocationDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
          indice rapido
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Nenhum resultado para este filtro/busca. Ajuste os filtros para voltar a
          ver os pontos do mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2">
      <div className="mb-2 px-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
          indice rapido
        </p>
      </div>
      <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1">
        {items.map((l) => {
          const active = l.id === selectedId;
          const meta = MAP_LOCATION_KIND_META[l.kind as MapLocationKind];
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(l.id)}
              className={clsx(
                'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] text-venue-canvas"
                style={{ backgroundColor: l.corHex ?? meta.defaultColor }}
              >
                {l.icone ?? meta.defaultIcon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={clsx(
                    'font-mono text-[9px] uppercase tracking-wider',
                    active ? 'text-white/70' : 'text-slate-400',
                  )}
                >
                  {meta.label}
                </span>
                <span className="truncate text-sm font-semibold">{l.titulo}</span>
                {l.company?.nome && (
                  <span
                    className={clsx(
                      'truncate text-xs',
                      active ? 'text-white/80' : 'text-slate-500',
                    )}
                  >
                    {l.company.nome}
                  </span>
                )}
                {l.activities.length > 0 && (
                  <span
                    className={clsx(
                      'font-mono text-[10px]',
                      active ? 'text-white/70' : 'text-slate-500',
                    )}
                  >
                    {l.activities.length} atividade{l.activities.length === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// IdleHint + Empty
// ---------------------------------------------------------------

function IdleHint({
  kinds,
  total,
}: {
  kinds: MapLocationKind[];
  total: number;
}) {
  return (
    <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
        tudo aqui
      </span>
      <p className="font-display text-2xl font-semibold italic leading-tight text-slate-800">
        Toque em qualquer ponto<br />do mapa
      </p>
      <div className="flex flex-col gap-1 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">{total}</strong> pontos neste
          evento
        </span>
        <span>
          {kinds.length} tipo{kinds.length === 1 ? '' : 's'} diferentes
          ({kinds.map((k) => MAP_LOCATION_KIND_META[k].label.toLowerCase()).join(' · ')})
        </span>
      </div>
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-brand-accent/10 blur-3xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
        aguardando organizador
      </p>
      <p className="mt-2 font-display text-2xl font-semibold italic text-slate-800">
        O mapa ainda nao foi publicado
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Em breve voce vera aqui a planta interativa do evento — stands,
        auditorios, salas e pontos de apoio.
      </p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/85 backdrop-blur">
      {children}
    </span>
  );
}
