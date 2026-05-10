'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  MAP_LOCATION_KIND_META,
  MAP_LOCATION_KINDS,
  type ActivityDto,
  type MapLocationDto,
  type MapLocationKind,
  type VenueMapDto,
} from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import {
  VenueMapCanvas,
  VenueMapDetailsPanel,
} from '../../../../../components/venue-map';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

interface CompanyOption {
  id: string;
  nome: string;
}

export default function MapaEditorPage() {
  const { event, eventId } = useEventFromParams();
  const [data, setData] = useState<VenueMapDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextKind, setNextKind] = useState<MapLocationKind>('COMPANY_STAND');
  const [nextCompanyId, setNextCompanyId] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  const selected = useMemo(
    () => data?.locations.find((l) => l.id === selectedId) ?? null,
    [data, selectedId],
  );

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setErr(null);
    try {
      const [map, comps] = await Promise.all([
        api<VenueMapDto>(`/events/${eventId}/venue-map`),
        api<{ id: string; nome: string }[]>(`/events/${eventId}/companies`),
      ]);
      setData(map);
      const companyOptions = comps.map((c) => ({ id: c.id, nome: c.nome }));
      setCompanies(companyOptions);
      if (companyOptions.length === 1) {
        setNextCompanyId(companyOptions[0].id);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------

  const handleCanvasClick = useCallback(
    async ({ x, y }: { x: number; y: number }) => {
      if (!eventId) return;
      try {
        setErr(null);
        if (nextKind === 'COMPANY_STAND' && !nextCompanyId) {
          setErr('Selecione a empresa vinculada antes de adicionar um stand.');
          return;
        }
        const meta = MAP_LOCATION_KIND_META[nextKind];
        const created = await api<MapLocationDto>(
          `/events/${eventId}/venue-map/locations`,
          {
            method: 'POST',
            body: {
              kind: nextKind,
              companyId:
                nextKind === 'COMPANY_STAND' ? nextCompanyId : undefined,
              titulo: `Novo ${meta.label}`,
              x: Number(x.toFixed(2)),
              y: Number(y.toFixed(2)),
            },
          },
        );
        setData((d) =>
          d ? { ...d, locations: [...d.locations, created] } : d,
        );
        setSelectedId(created.id);
        setOk(`${meta.label} adicionado. Clique para editar.`);
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [eventId, nextCompanyId, nextKind],
  );

  const handleDragEnd = useCallback(
    async ({ locationId, x, y }: { locationId: string; x: number; y: number }) => {
      if (!eventId) return;
      try {
        const updated = await api<MapLocationDto>(
          `/events/${eventId}/venue-map/locations/${locationId}`,
          { method: 'PATCH', body: { x, y } },
        );
        setData((d) =>
          d
            ? {
                ...d,
                locations: d.locations.map((l) =>
                  l.id === locationId ? updated : l,
                ),
              }
            : d,
        );
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [eventId],
  );

  const patchLocation = useCallback(
    async (id: string, patch: Partial<MapLocationDto>) => {
      if (!eventId) return;
      const updated = await api<MapLocationDto>(
        `/events/${eventId}/venue-map/locations/${id}`,
        { method: 'PATCH', body: patch },
      );
      setData((d) =>
        d
          ? {
              ...d,
              locations: d.locations.map((l) => (l.id === id ? updated : l)),
            }
          : d,
      );
    },
    [eventId],
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      if (!eventId) return;
      if (!confirm('Remover este ponto do mapa?')) return;
      try {
        await api(`/events/${eventId}/venue-map/locations/${id}`, {
          method: 'DELETE',
        });
        setData((d) =>
          d ? { ...d, locations: d.locations.filter((l) => l.id !== id) } : d,
        );
        setSelectedId(null);
        setOk('Ponto removido.');
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [eventId],
  );

  const addActivity = useCallback(
    async (locationId: string, input: Record<string, unknown>): Promise<ActivityDto> => {
      if (!eventId) throw new Error('Evento indisponivel');
      const activity = await api<ActivityDto>(
        `/events/${eventId}/venue-map/locations/${locationId}/activities`,
        { method: 'POST', body: input },
      );
      setData((d) =>
        d
          ? {
              ...d,
              locations: d.locations.map((l) =>
                l.id === locationId
                  ? { ...l, activities: [...l.activities, activity] }
                  : l,
              ),
            }
          : d,
      );
      return activity;
    },
    [eventId],
  );

  const deleteActivity = useCallback(
    async (locationId: string, activityId: string) => {
      if (!eventId) throw new Error('Evento indisponivel');
      await api(`/events/${eventId}/venue-map/activities/${activityId}`, {
        method: 'DELETE',
      });
      setData((d) =>
        d
          ? {
              ...d,
              locations: d.locations.map((l) =>
                l.id === locationId
                  ? { ...l, activities: l.activities.filter((a) => a.id !== activityId) }
                  : l,
              ),
            }
          : d,
      );
    },
    [eventId],
  );

  const saveConfig = useCallback(
    async (patch: {
      titulo?: string | null;
      backgroundUrl?: string | null;
      viewportWidth?: number;
      viewportHeight?: number;
    }) => {
      if (!eventId) return;
      try {
        const updated = await api<VenueMapDto>(`/events/${eventId}/venue-map`, {
          method: 'PUT',
          body: patch,
        });
        setData(updated);
        setOk('Configuracao do mapa salva.');
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [eventId],
  );

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  if (loading || !data || !event) {
    return <p className="text-sm text-slate-500">Carregando mapa…</p>;
  }

  if (!event.modules.includes('venue_map')) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-slate-800">
          Modulo de Mapa desativado
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Ative o modulo <strong>Mapa interativo do local</strong> em
          <span className="mx-1 font-mono text-xs">Modulos</span>
          para comecar a posicionar os stands deste evento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecalho editorial */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
            / mapa / editor
          </span>
          <h2 className="font-display text-3xl font-semibold italic text-slate-900">
            {data.titulo ?? 'Cartografia do evento'}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Fluxo:</span> escolha o tipo na paleta → no
            mapa, deixe <span className="font-mono text-xs text-brand-primary">◎ Colocar</span> ativo e{' '}
            <strong className="text-slate-800">clique</strong> no local exato → para navegar pela planta,
            troque para <span className="font-mono text-xs text-brand-primary">✋ Mover mapa</span> e
            arraste o fundo → para corrigir um ponto, <strong className="text-slate-800">arraste-o</strong>{' '}
            (clique leve só seleciona).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            {showConfig ? 'Fechar ajustes' : 'Ajustes do mapa'}
          </button>
          <span className="rounded-full bg-slate-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white">
            {data.locations.length} pontos
          </span>
        </div>
      </header>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      {showConfig && (
        <MapConfigForm data={data} onSave={saveConfig} />
      )}

      <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/[0.04] p-4 ring-1 ring-brand-primary/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Lembrete
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Com <span className="font-semibold">Colocar</span>, o mapa usa mira e{' '}
          <span className="font-semibold">nao</span> desloca ao arrastar o fundo — assim o clique nao
          compete com a &quot;maozinha&quot;. Zoom continua na barra superior direita.
        </p>
      </div>

      {/* Paleta de tipos */}
      <KindPalette active={nextKind} onChange={setNextKind} />
      {nextKind === 'COMPANY_STAND' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Field
            label="Empresa vinculada no proximo stand"
            hint="Obrigatorio para kind COMPANY_STAND."
          >
            <select
              value={nextCompanyId}
              onChange={(e) => setNextCompanyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base"
            >
              <option value="">— selecione uma empresa —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          {companies.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Nenhuma empresa cadastrada para este evento. Cadastre em "Empresas"
              antes de posicionar stands.
            </p>
          )}
        </div>
      )}

      {/* Grid canvas + painel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <VenueMapCanvas
          data={data}
          mode="editor"
          selectedId={selectedId}
          onSelect={(l) => setSelectedId(l?.id ?? null)}
          onCanvasClick={handleCanvasClick}
          onLocationDragEnd={handleDragEnd}
          emptyHint={`Clique para adicionar o primeiro ${MAP_LOCATION_KIND_META[nextKind].label.toLowerCase()}`}
        />

        {selected ? (
          <VenueMapDetailsPanel
            location={selected}
            onClose={() => setSelectedId(null)}
            headerActions={
              <button
                type="button"
                onClick={() => deleteLocation(selected.id)}
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            }
            footer={
              <LocationEditForm
                key={selected.id}
                location={selected}
                companies={companies}
                onPatch={(patch) => patchLocation(selected.id, patch)}
                onAddActivity={(input) => addActivity(selected.id, input)}
                onDeleteActivity={(activityId) =>
                  deleteActivity(selected.id, activityId)
                }
              />
            }
          />
        ) : (
          <EmptyHint />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// KindPalette
// ---------------------------------------------------------------

function KindPalette({
  active,
  onChange,
}: {
  active: MapLocationKind;
  onChange: (k: MapLocationKind) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <span className="pl-3 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
        proximo ponto
      </span>
      {MAP_LOCATION_KINDS.map((k) => {
        const meta = MAP_LOCATION_KIND_META[k];
        const selected = k === active;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={clsx(
              'group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition',
              selected
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
            title={meta.description}
          >
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-xs text-venue-canvas"
              style={{ backgroundColor: meta.defaultColor }}
            >
              {meta.defaultIcon}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-semibold">{meta.label}</span>
              <span
                className={clsx(
                  'font-mono text-[9px] uppercase tracking-wider',
                  selected ? 'text-white/60' : 'text-slate-400',
                )}
              >
                {k.toLowerCase()}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// EmptyHint
// ---------------------------------------------------------------

function EmptyHint() {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
        painel de edicao
      </span>
      <p className="font-display text-xl font-semibold italic text-slate-800">
        Selecione um ponto no mapa
      </p>
      <p className="text-sm text-slate-600">
        Cada ponto vira um card clicavel para os participantes. Ao selecionar
        um ponto voce pode editar nome, descricao, cor e cadastrar atividades
        (para auditorios e salas).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// MapConfigForm
// ---------------------------------------------------------------

function MapConfigForm({
  data,
  onSave,
}: {
  data: VenueMapDto;
  onSave: (patch: {
    titulo?: string | null;
    backgroundUrl?: string | null;
    viewportWidth?: number;
    viewportHeight?: number;
  }) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(data.titulo ?? '');
  const [backgroundUrl, setBackgroundUrl] = useState(data.backgroundUrl ?? '');
  const [w, setW] = useState(String(data.viewportWidth));
  const [h, setH] = useState(String(data.viewportHeight));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        titulo: titulo.trim() ? titulo.trim() : null,
        backgroundUrl: backgroundUrl.trim() ? backgroundUrl.trim() : null,
        viewportWidth: Number(w) || 1200,
        viewportHeight: Number(h) || 800,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1fr_auto_auto]">
      <Field label="Titulo do mapa" hint="Ex: Pavilhao central, Bloco K">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Field>
      <Field label="URL da imagem de fundo" hint="Opcional. Planta baixa, render, foto aerea.">
        <TextInput
          value={backgroundUrl}
          onChange={(e) => setBackgroundUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <Field label="Largura">
        <TextInput
          type="number"
          value={w}
          onChange={(e) => setW(e.target.value)}
        />
      </Field>
      <Field label="Altura">
        <TextInput
          type="number"
          value={h}
          onChange={(e) => setH(e.target.value)}
        />
      </Field>
      <div className="md:col-span-4">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar ajustes'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// LocationEditForm
// ---------------------------------------------------------------

function LocationEditForm({
  location,
  companies,
  onPatch,
  onAddActivity,
  onDeleteActivity,
}: {
  location: MapLocationDto;
  companies: CompanyOption[];
  onPatch: (patch: Partial<MapLocationDto>) => Promise<void>;
  onAddActivity: (input: Record<string, unknown>) => Promise<ActivityDto>;
  onDeleteActivity: (activityId: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(location.titulo);
  const [descricao, setDescricao] = useState(location.descricao ?? '');
  const [kind, setKind] = useState<MapLocationKind>(location.kind);
  const [companyId, setCompanyId] = useState<string | ''>(
    location.companyId ?? '',
  );
  const [corHex, setCorHex] = useState(location.corHex ?? '');
  const [icone, setIcone] = useState(location.icone ?? '');
  const [larguraPct, setLarguraPct] = useState(
    location.larguraPct !== null ? String(location.larguraPct) : '',
  );
  const [alturaPct, setAlturaPct] = useState(
    location.alturaPct !== null ? String(location.alturaPct) : '',
  );
  const [saving, setSaving] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onPatch({
        titulo,
        descricao: descricao.trim() ? descricao : null,
        kind,
        companyId: kind === 'COMPANY_STAND' && companyId ? companyId : null,
        corHex: corHex.trim() ? corHex : null,
        icone: icone.trim() ? icone : null,
        larguraPct: larguraPct ? Number(larguraPct) : null,
        alturaPct: alturaPct ? Number(alturaPct) : null,
      });
    } finally {
      setSaving(false);
    }
  }

  const kindAllowsActivities =
    kind === 'THEATER' || kind === 'ROOM' || kind === 'AREA';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Titulo">
          <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MapLocationKind)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base"
          >
            {MAP_LOCATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {MAP_LOCATION_KIND_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descricao" hint="Texto que o participante vera.">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
        {kind === 'COMPANY_STAND' && (
          <Field label="Empresa vinculada">
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base"
            >
              <option value="">— selecione —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Cor (hex)" hint="#RRGGBB. Deixa em branco para usar o default.">
          <TextInput
            value={corHex}
            onChange={(e) => setCorHex(e.target.value)}
            placeholder="#F0B323"
          />
        </Field>
        <Field label="Icone" hint="1 caractere (emoji/glifo).">
          <TextInput
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
            placeholder="◈"
          />
        </Field>
        <Field label="Largura (%)" hint="Preencha para virar retangulo de area.">
          <TextInput
            type="number"
            step="0.5"
            value={larguraPct}
            onChange={(e) => setLarguraPct(e.target.value)}
          />
        </Field>
        <Field label="Altura (%)">
          <TextInput
            type="number"
            step="0.5"
            value={alturaPct}
            onChange={(e) => setAlturaPct(e.target.value)}
          />
        </Field>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar alteracoes'}
      </Button>

      {kindAllowsActivities && (
        <div className="rounded-xl bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="font-display text-base font-semibold text-slate-800">
              Atividades
            </h5>
            <button
              type="button"
              onClick={() => setActivityOpen((v) => !v)}
              className="text-xs font-medium text-brand-primary"
            >
              {activityOpen ? 'Fechar' : '+ Nova atividade'}
            </button>
          </div>
          {activityOpen && (
            <ActivityForm
              onSubmit={async (input) => {
                await onAddActivity(input);
                setActivityOpen(false);
              }}
              onCancel={() => setActivityOpen(false)}
            />
          )}
          <ul className="mt-2 flex flex-col gap-1">
            {location.activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5"
              >
                <span className="truncate text-xs">
                  <strong className="font-semibold text-slate-800">{a.titulo}</strong>
                  <span className="ml-2 font-mono text-[10px] text-slate-500">
                    {new Date(a.startsAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteActivity(a.id)}
                  className="text-xs font-medium text-red-600"
                >
                  Excluir
                </button>
              </li>
            ))}
            {location.activities.length === 0 && !activityOpen && (
              <li className="text-xs text-slate-500">
                Nenhuma atividade cadastrada.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActivityForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [palestrante, setPalestrante] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [permitirInscricao, setPermitirInscricao] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!titulo.trim() || !startsAt || !endsAt) {
      setErr('Titulo, inicio e fim sao obrigatorios.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        palestrante: palestrante.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        capacidade: capacidade ? Number(capacidade) : null,
        permitirInscricao,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3">
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <Field label="Titulo">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Field>
      <Field label="Descricao">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Inicio">
          <TextInput
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Fim">
          <TextInput
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Palestrante / responsavel">
        <TextInput
          value={palestrante}
          onChange={(e) => setPalestrante(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 items-end gap-2">
        <Field label="Capacidade">
          <TextInput
            type="number"
            value={capacidade}
            onChange={(e) => setCapacidade(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 py-3 text-sm">
          <input
            type="checkbox"
            checked={permitirInscricao}
            onChange={(e) => setPermitirInscricao(e.target.checked)}
          />
          Permitir inscricao
        </label>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Criando…' : 'Criar atividade'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
