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

  useEffect(() => {
    void load();
  }, [event]);

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Carimbos</h2>
          <p className="text-sm text-slate-500">
            Defina os itens do passaporte. Para cada item, escolha quais
            empresas podem carimba-lo (RN02). Itens obrigatorios contam para
            calcular concludentes (RN03).
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
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  #{s.ordem + 1} · {s.titulo}
                  {s.obrigatorio && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      obrigatorio
                    </span>
                  )}
                </p>
                {s.descricao && <p className="text-xs text-slate-500">{s.descricao}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {s.authorizedCompanies.length === 0 ? (
                    <span className="text-slate-500">
                      Qualquer empresa pode carimbar
                    </span>
                  ) : (
                    <span>
                      So{' '}
                      <span className="font-semibold text-slate-700">
                        {s.authorizedCompanies.map((c) => c.nome).join(', ')}
                      </span>{' '}
                      pode carimbar (RN02)
                    </span>
                  )}
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
  const [authorizedIds, setAuthorizedIds] = useState<Set<string>>(
    () => new Set(initial?.authorizedCompanies.map((c) => c.id) ?? []),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleCompany(id: string) {
    setAuthorizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setErr(null);
    if (!titulo.trim()) {
      setErr('Informe o titulo');
      return;
    }
    setSaving(true);
    try {
      const body = {
        titulo: titulo.trim(),
        descricao: descricao || undefined,
        ordem: Number(ordem),
        obrigatorio,
        authorizedCompanyIds: Array.from(authorizedIds),
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
      {err && (
        <div className="mt-3">
          <ErrorBanner>{err}</ErrorBanner>
        </div>
      )}

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

        <div className="md:col-span-2">
          <p className="text-sm font-medium text-slate-700">Empresas autorizadas</p>
          <p className="mt-1 text-xs text-slate-500">
            Marque as empresas que podem conceder este carimbo. Deixe vazio
            para permitir que QUALQUER empresa do evento carimbe (util para
            visitas livres).
          </p>
          {companies.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
              Nenhuma empresa cadastrada neste evento ainda. Cadastre na aba
              Empresas para poder restringir.
            </p>
          ) : (
            <ul className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
              {companies.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={authorizedIds.has(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="truncate">{c.nome}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {authorizedIds.size === 0
              ? 'Qualquer empresa pode carimbar este item.'
              : `${authorizedIds.size} empresa(s) selecionada(s).`}
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            checked={obrigatorio}
            onChange={(e) => setObrigatorio(e.target.checked)}
            className="h-4 w-4"
          />
          Obrigatorio (conta para certificado de concludente)
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
