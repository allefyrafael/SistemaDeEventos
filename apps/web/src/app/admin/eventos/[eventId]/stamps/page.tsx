'use client';

import { useEffect, useState } from 'react';
import type { StampConfigDto, CompanyDto } from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

export default function EventStampsPage() {
  const { event } = useEventFromParams();
  const [rows, setRows] = useState<StampConfigDto[] | null>(null);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [editing, setEditing] = useState<StampConfigDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!event) return;
    const [stamps, comps] = await Promise.all([
      api<StampConfigDto[]>(`/events/${event.id}/passport/stamps`),
      api<CompanyDto[]>(`/events/${event.id}/companies`),
    ]);
    setRows(stamps);
    setCompanies(comps);
  }

  useEffect(() => {
    void load();
  }, [event]);

  async function remove(s: StampConfigDto) {
    if (!event) return;
    if (!confirm(`Excluir carimbo "${s.titulo}"?`)) return;
    try {
      await api(`/events/${event.id}/passport/stamps/${s.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Carimbos</h2>
          <p className="text-sm text-slate-500">
            Defina os itens do passaporte. Itens obrigatorios sao usados para calcular
            concludentes (RN03).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Novo carimbo</Button>
      </div>

      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      {creating && (
        <StampForm
          eventId={event.id}
          companies={companies}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setOk('Carimbo criado');
            void load();
          }}
        />
      )}
      {editing && (
        <StampForm
          eventId={event.id}
          companies={companies}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setOk('Carimbo atualizado');
            void load();
          }}
        />
      )}

      {!rows ? (
        <p className="text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhum carimbo configurado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  #{s.ordem + 1} · {s.titulo}
                  {s.obrigatorio && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      obrigatorio
                    </span>
                  )}
                </p>
                {s.descricao && <p className="text-xs text-slate-500">{s.descricao}</p>}
                <p className="text-xs text-slate-500">
                  {s.entidadeAutorizada
                    ? `Somente ${s.entidadeAutorizada.nome} pode carimbar (RN02)`
                    : 'Qualquer empresa pode carimbar'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="text-xs font-medium text-brand-primary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void remove(s)}
                  className="text-xs font-medium text-red-600"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StampForm({
  eventId,
  initial,
  companies,
  onSaved,
  onCancel,
}: {
  eventId: string;
  initial?: StampConfigDto;
  companies: CompanyDto[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [ordem, setOrdem] = useState(initial?.ordem ?? 0);
  const [obrigatorio, setObrigatorio] = useState(initial?.obrigatorio ?? true);
  const [entidade, setEntidade] = useState<string>(
    initial?.entidadeAutorizada?.id ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const body = {
        titulo,
        descricao: descricao || undefined,
        ordem: Number(ordem),
        obrigatorio,
        entidadeAutorizadaId: entidade || null,
      };
      if (initial) {
        await api(`/events/${eventId}/passport/stamps/${initial.id}`, {
          method: 'PATCH',
          body,
        });
      } else {
        await api(`/events/${eventId}/passport/stamps`, {
          method: 'POST',
          body,
        });
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">
        {initial ? 'Editar carimbo' : 'Novo carimbo'}
      </h3>
      {err && <div className="mt-3"><ErrorBanner>{err}</ErrorBanner></div>}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Titulo">
          <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>
        <Field label="Ordem" hint="Define a posicao no passaporte (0, 1, 2...)">
          <TextInput
            type="number"
            value={String(ordem)}
            onChange={(e) => setOrdem(Number(e.target.value))}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Descricao (opcional)">
            <textarea
              value={descricao ?? ''}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </Field>
        </div>
        <Field label="Entidade autorizada" hint="Deixe vazio para permitir qualquer empresa">
          <select
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-brand-primary focus:outline-none"
          >
            <option value="">— Qualquer empresa —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={obrigatorio}
            onChange={(e) => setObrigatorio(e.target.checked)}
            className="h-4 w-4"
          />
          Obrigatorio (conta para certificado)
        </label>
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
