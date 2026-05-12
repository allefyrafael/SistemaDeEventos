'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { EventStatus } from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { useConfirm } from '../../../../../components/confirm-modal';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

function toLocalInput(dateIso: string) {
  const d = new Date(dateIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

const STATUSES: { value: EventStatus; label: string; hint: string }[] = [
  { value: 'DRAFT', label: 'Rascunho', hint: 'Ainda em preparacao. Nao aparece para os participantes.' },
  { value: 'PUBLISHED', label: 'Publicado', hint: 'Inscricoes abertas, mas o dia do evento ainda nao comecou.' },
  { value: 'RUNNING', label: 'Em andamento', hint: 'O evento esta acontecendo agora. Scanner de QR ativo.' },
  { value: 'CLOSED', label: 'Encerrado', hint: 'Evento acabou, mas ainda consulta dados.' },
  { value: 'ARCHIVED', label: 'Arquivado', hint: 'Dados preservados apenas para historico.' },
];

export default function EventSettingsPage() {
  const router = useRouter();
  const { event, reload } = useEventFromParams();
  const confirm = useConfirm();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setNome(event.nome);
    setDescricao(event.descricao ?? '');
    setStatus(event.status);
    setStartsAt(toLocalInput(event.startsAt));
    setEndsAt(toLocalInput(event.endsAt));
  }, [event]);

  if (!event) return null;

  async function save() {
    if (!event) return;
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      await api(`/events/${event.id}`, {
        method: 'PATCH',
        body: {
          nome,
          descricao: descricao || null,
          status,
          startsAt: fromLocalInput(startsAt),
          endsAt: fromLocalInput(endsAt),
        },
      });
      setOk('Configuracoes salvas.');
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!event) return;
    const okAnswer = await confirm({
      title: `Excluir "${event.nome}"?`,
      message:
        'Empresas, participantes, carimbos e avaliacoes deste evento serao perdidos. Esta acao nao pode ser desfeita.',
      confirmLabel: 'Excluir evento',
    });
    if (!okAnswer) return;
    setDeleting(true);
    setErr(null);
    try {
      await api(`/events/${event.id}`, { method: 'DELETE' });
      router.replace('/admin' as Route);
    } catch (e) {
      setErr((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dados do evento</h2>
        <p className="text-sm text-slate-600">
          O slug nao pode ser alterado depois que o evento e criado.
        </p>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do evento">
            <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Slug" hint="Nao editavel">
            <TextInput value={event.slug} disabled />
          </Field>
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
          <div className="md:col-span-2">
            <Field label="Descricao">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Status do evento</label>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {STATUSES.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    status === s.value
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    checked={status === s.value}
                    onChange={() => setStatus(s.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{s.label}</p>
                    <p className="text-xs text-slate-500">{s.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-900">Zona de risco</h3>
        <p className="mt-1 text-xs text-red-800">
          A exclusao so e permitida em eventos em Rascunho ou Arquivado. Empresas,
          participantes e carimbos vinculados serao perdidos.
        </p>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? 'Excluindo...' : 'Excluir evento'}
        </button>
      </div>
    </div>
  );
}
