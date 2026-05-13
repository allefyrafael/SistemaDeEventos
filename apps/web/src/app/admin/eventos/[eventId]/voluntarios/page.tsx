'use client';

import { useEffect, useState } from 'react';
import type { VolunteerDto, VolunteerScope } from '@eventpass/shared';
import { api, ApiError } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { useConfirm } from '../../../../../components/confirm-modal';
import { maskCpf } from '../../../../../lib/format';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

const SCOPE_LABEL: Record<VolunteerScope, string> = {
  VOLUNTEER_STUDENTS: 'Voluntario Estudantes',
  VOLUNTEER_COMPANIES: 'Voluntario Empresas',
};

const SCOPE_DESC: Record<VolunteerScope, string> = {
  VOLUNTEER_STUDENTS: 'Pode redefinir senhas de estudantes deste evento.',
  VOLUNTEER_COMPANIES: 'Pode cadastrar empresas e redefinir senhas dos responsaveis.',
};

export default function EventVolunteersPage() {
  const { event } = useEventFromParams();
  const confirm = useConfirm();
  const [rows, setRows] = useState<VolunteerDto[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Cadastro
  const [novo, setNovo] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    scope: 'VOLUNTEER_STUDENTS' as VolunteerScope,
  });
  const [saving, setSaving] = useState(false);

  // Reset senha
  const [resetting, setResetting] = useState<VolunteerDto | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  async function load() {
    if (!event) return;
    try {
      const data = await api<VolunteerDto[]>(`/events/${event.id}/volunteers`);
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  async function criar() {
    if (!event) return;
    setSaving(true);
    setErr(null);
    try {
      await api<VolunteerDto>(`/events/${event.id}/volunteers`, {
        method: 'POST',
        body: JSON.stringify(novo),
      });
      setOk(`Voluntario "${novo.nome}" cadastrado.`);
      setCreating(false);
      setNovo({ nome: '', cpf: '', email: '', senha: '', scope: 'VOLUNTEER_STUDENTS' });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(v: VolunteerDto) {
    if (!event) return;
    const okAnswer = await confirm({
      title: `Remover "${v.nome}"?`,
      message: `O voluntario perdera acesso a este evento (${SCOPE_LABEL[v.scope]}). A conta dele continua existindo e ele pode ser cadastrado em outro evento depois.`,
      confirmLabel: 'Remover voluntario',
    });
    if (!okAnswer) return;
    try {
      await api(`/events/${event.id}/volunteers/${v.id}`, { method: 'DELETE' });
      setOk(`Voluntario "${v.nome}" removido.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function resetSenha() {
    if (!event || !resetting) return;
    setResetSaving(true);
    setErr(null);
    try {
      await api(`/events/${event.id}/volunteers/${resetting.id}/senha`, {
        method: 'PATCH',
        body: JSON.stringify({ novaSenha }),
      });
      setOk(`Senha de ${resetting.nome} redefinida.`);
      setResetting(null);
      setNovaSenha('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setResetSaving(false);
    }
  }

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Voluntarios</h2>
          <p className="text-sm text-slate-500">
            Equipe que apoia o evento. Cada voluntario tem um escopo —{' '}
            <strong>Estudantes</strong> (reset de senha de aluno) ou{' '}
            <strong>Empresas</strong> (cadastro de empresa e reset de responsavel).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Novo voluntario</Button>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      {creating && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Novo voluntario</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome">
              <TextInput
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </Field>
            <Field label="CPF">
              <TextInput
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={novo.cpf}
                onChange={(e) => setNovo({ ...novo, cpf: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </Field>
            <Field label="Senha inicial" hint="Minimo de 8 caracteres">
              <TextInput
                type="password"
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
                minLength={8}
              />
            </Field>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-slate-700">Escopo de atuacao</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {(['VOLUNTEER_STUDENTS', 'VOLUNTEER_COMPANIES'] as VolunteerScope[]).map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                      novo.scope === s
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={novo.scope === s}
                      onChange={() => setNovo({ ...novo, scope: s })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{SCOPE_LABEL[s]}</p>
                      <p className="text-xs text-slate-500">{SCOPE_DESC[s]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              onClick={() => void criar()}
              disabled={
                saving ||
                !novo.nome ||
                !novo.cpf ||
                !novo.email ||
                novo.senha.length < 8
              }
            >
              {saving ? 'Salvando...' : 'Cadastrar voluntario'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!rows ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum voluntario cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((v) => (
            <li
              key={`${v.id}-${v.scope}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{v.nome}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{maskCpf(v.cpf)}</span>
                  {v.email && <> · {v.email}</>}
                </p>
                <p className="mt-1 text-xs">
                  <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 font-semibold text-brand-primary">
                    {SCOPE_LABEL[v.scope]}
                  </span>
                </p>
              </div>
              <div className="flex gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setResetting(v);
                    setNovaSenha('');
                    setOk(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Redefinir senha
                </button>
                <button
                  type="button"
                  onClick={() => void remove(v)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resetting && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetting(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Redefinir senha de {resetting.nome}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Combine a nova senha pessoalmente com o voluntario.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Nova senha" hint="Minimo de 8 caracteres">
                <TextInput
                  type="text"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  minLength={8}
                  autoFocus
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" type="button" onClick={() => setResetting(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void resetSenha()}
                disabled={resetSaving || novaSenha.length < 8}
              >
                {resetSaving ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
