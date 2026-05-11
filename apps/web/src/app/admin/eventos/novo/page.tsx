'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { FEATURE_MODULE_META, type FeatureModule } from '@eventpass/shared';
import { api } from '../../../../lib/api';
import {
  Button,
  ErrorBanner,
  Field,
  TextInput,
} from '../../../../components/form';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

const DEFAULT_MODULES: FeatureModule[] = Object.values(FEATURE_MODULE_META)
  .filter((m) => m.defaultEnabled)
  .map((m) => m.id);

export default function NewEventPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [descricao, setDescricao] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    // Validacoes client-side pra dar feedback inline sem precisar do roundtrip.
    if (!nome.trim()) {
      setErr('Informe o nome do evento');
      return;
    }
    if (!startsAt || !endsAt) {
      setErr('Informe as datas de inicio e fim');
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setErr('Datas invalidas');
      return;
    }
    if (end <= start) {
      setErr('A data de fim precisa ser depois da data de inicio');
      return;
    }
    setSaving(true);
    try {
      const created = await api<{ id: string }>('/events', {
        method: 'POST',
        body: {
          nome: nome.trim(),
          slug: slug || slugify(nome),
          descricao: descricao || undefined,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          modules: DEFAULT_MODULES,
        },
      });
      router.replace(`/admin/eventos/${created.id}/modulos` as Route);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={'/admin' as Route}
          className="text-sm text-slate-500 hover:text-brand-primary"
        >
          ← Voltar para eventos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Novo evento</h2>
        <p className="text-sm text-slate-600">
          Apos criar, voce sera direcionado para escolher os modulos que o evento usara.
        </p>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do evento">
            <TextInput
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              placeholder="Ex: Feira de Carreiras 2026"
            />
          </Field>
          <Field label="Slug (identificador na URL)" hint="Somente letras, numeros e -">
            <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
          <Field label="Data de inicio">
            <TextInput
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Data de fim">
            <TextInput
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descricao (opcional)">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Objetivo, publico alvo, local..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={submit} disabled={saving || !nome || !startsAt || !endsAt}>
            {saving ? 'Criando...' : 'Criar evento'}
          </Button>
          <Link href={'/admin' as Route}>
            <Button variant="secondary" type="button">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
