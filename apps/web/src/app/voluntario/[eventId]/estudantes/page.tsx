'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '../../../../lib/api';
import { useRequireRole } from '../../../../lib/auth-context';
import { maskCpf } from '../../../../lib/format';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../components/form';

interface Student {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  matricula: string | null;
  studentKind: 'INTERNAL' | 'EXTERNAL';
}

/**
 * Voluntario Estudantes: lista estudantes do evento e oferece reset de
 * senha. Nao mostra a senha atual — so atribui uma nova (Voluntario de
 * Gestao nunca visualiza senha).
 */
export default function VolunteerStudentsPage() {
  useRequireRole(['VOLUNTEER']);
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const [rows, setRows] = useState<Student[] | null>(null);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Student | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    if (!eventId) return;
    try {
      const data = await api<Student[]>(`/events/${eventId}/students`);
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const filtered = rows?.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      r.nome.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.matricula ?? '').toLowerCase().includes(q)
    );
  });

  async function resetar() {
    if (!eventId || !resetting) return;
    setSaving(true);
    setErr(null);
    try {
      await api(`/events/${eventId}/students/${resetting.id}/senha`, {
        method: 'PATCH',
        body: JSON.stringify({ novaSenha }),
      });
      setOk(`Senha de ${resetting.nome} redefinida.`);
      setResetting(null);
      setNovaSenha('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-6">
      <div>
        <Link href="/voluntario" className="text-sm text-slate-500 hover:text-brand-primary">
          &larr; Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Estudantes do evento</h1>
        <p className="text-sm text-slate-600">
          Use o botao "Redefinir senha" para gerar uma nova senha ao estudante.
          A senha atual nao e exibida.
        </p>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      <TextInput
        placeholder="Buscar por nome, email ou matricula"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {!filtered ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum estudante encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{s.nome}</p>
                <p className="text-xs text-slate-500">
                  {s.matricula ?? '—'} · {s.email} ·{' '}
                  <span className="font-mono">{maskCpf(s.cpf)}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {s.studentKind === 'INTERNAL' ? 'Estudante interno' : 'Visitante externo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetting(s);
                  setNovaSenha('');
                  setOk(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Redefinir senha
              </button>
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
              Defina a nova senha que o estudante usara para entrar. Combine pessoalmente
              com ele — voce nao ve a senha atual.
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
                onClick={() => void resetar()}
                disabled={saving || novaSenha.length < 8}
              >
                {saving ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
