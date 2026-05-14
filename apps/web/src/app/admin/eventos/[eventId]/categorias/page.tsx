'use client';

import { useEffect, useState } from 'react';
import type { CompanyCategoryDto } from '@eventpass/shared';
import { Tag } from 'lucide-react';
import { api, ApiError } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { useConfirm } from '../../../../../components/confirm-modal';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

/**
 * Paleta de cores sugerida para as categorias. Hexes pre-selecionados pra
 * boa cobertura visual sem deixar o admin escolher cor "feia" no picker.
 * Categoria com `color` nulo cai no slate neutro na UI.
 */
const COLORS: { hex: string; nome: string }[] = [
  { hex: '#0EA5E9', nome: 'Azul' },        // sky-500
  { hex: '#10B981', nome: 'Verde' },       // emerald-500
  { hex: '#F59E0B', nome: 'Amarelo' },     // amber-500
  { hex: '#EF4444', nome: 'Vermelho' },    // red-500
  { hex: '#8B5CF6', nome: 'Roxo' },        // violet-500
  { hex: '#EC4899', nome: 'Rosa' },        // pink-500
  { hex: '#14B8A6', nome: 'Turquesa' },    // teal-500
  { hex: '#F97316', nome: 'Laranja' },     // orange-500
];

export default function EventCategoriesPage() {
  const { event } = useEventFromParams();
  const confirm = useConfirm();
  const [rows, setRows] = useState<CompanyCategoryDto[] | null>(null);
  const [editing, setEditing] = useState<CompanyCategoryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!event) return;
    try {
      const data = await api<CompanyCategoryDto[]>(
        `/events/${event.id}/company-categories`,
      );
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  async function remove(c: CompanyCategoryDto) {
    if (!event) return;
    const msg =
      c.totalCompanies > 0
        ? `${c.totalCompanies} empresa(s) estao nesta categoria. Elas continuarao existindo mas perderao o agrupamento. Stamps que liberavam por esta categoria voltam a usar a lista explicita de empresas autorizadas.`
        : 'Esta acao nao pode ser desfeita.';
    const okAnswer = await confirm({
      title: `Excluir categoria "${c.nome}"?`,
      message: msg,
      confirmLabel: 'Excluir categoria',
    });
    if (!okAnswer) return;
    try {
      await api(`/events/${event.id}/company-categories/${c.id}`, { method: 'DELETE' });
      setOk(`Categoria "${c.nome}" excluida.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Categorias de empresa</h2>
          <p className="text-sm text-slate-500">
            Agrupe empresas por area (ex.: <em>Tecnologia</em>, <em>Saude</em>,{' '}
            <em>Educacao</em>). Stamps podem autorizar uma categoria inteira em vez de
            empresa-por-empresa.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nova categoria</Button>
      </div>

      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      {creating && (
        <CategoryForm
          eventId={event.id}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setOk('Categoria criada');
            void load();
          }}
        />
      )}
      {editing && (
        <CategoryForm
          eventId={event.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setOk('Categoria atualizada');
            void load();
          }}
        />
      )}

      {!rows ? (
        <p className="text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <Tag size={28} className="mx-auto text-slate-400" />
          <p className="mt-3 text-base font-semibold text-slate-700">
            Nenhuma categoria cadastrada
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Crie categorias para agrupar empresas e simplificar a configuracao de
            stamps.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: c.color ?? '#64748B' }}
                  aria-hidden
                >
                  <Tag size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {c.nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.totalCompanies} empresa(s)
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="text-brand-primary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  className="text-red-600"
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

function CategoryForm({
  eventId,
  initial,
  onSaved,
  onCancel,
}: {
  eventId: string;
  initial?: CompanyCategoryDto;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [color, setColor] = useState<string | null>(initial?.color ?? COLORS[0].hex);
  const [ordem, setOrdem] = useState(initial?.ordem ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!nome.trim()) {
      setErr('Informe o nome da categoria');
      return;
    }
    setSaving(true);
    try {
      const body = { nome: nome.trim(), color, ordem: Number(ordem) };
      if (initial) {
        await api(`/events/${eventId}/company-categories/${initial.id}`, {
          method: 'PATCH',
          body,
        });
      } else {
        await api(`/events/${eventId}/company-categories`, {
          method: 'POST',
          body,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">
        {initial ? 'Editar categoria' : 'Nova categoria'}
      </h3>
      {err && (
        <div className="mt-3">
          <ErrorBanner>{err}</ErrorBanner>
        </div>
      )}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_8rem]">
        <Field label="Nome">
          <TextInput
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
          />
        </Field>
        <Field label="Ordem" hint="Posicao na listagem">
          <TextInput
            type="number"
            value={String(ordem)}
            onChange={(e) => setOrdem(Number(e.target.value))}
            min={0}
          />
        </Field>
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-slate-700">Cor (opcional)</p>
          <p className="mt-1 text-xs text-slate-500">
            Pill colorido para identificar visualmente a categoria nas listas.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-xs font-bold text-slate-500 transition ${
                color === null
                  ? 'border-brand-primary ring-2 ring-brand-primary/20'
                  : 'border-slate-200'
              }`}
              aria-label="Sem cor (neutro)"
              title="Sem cor"
            >
              ∅
            </button>
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`h-9 w-9 rounded-lg border-2 transition ${
                  color === c.hex
                    ? 'border-slate-900 ring-2 ring-slate-900/20'
                    : 'border-transparent hover:border-slate-300'
                }`}
                style={{ background: c.hex }}
                aria-label={c.nome}
                title={c.nome}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
