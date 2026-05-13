'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CompanyDto } from '@eventpass/shared';
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

interface NovoResponsavel {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
}

/**
 * Voluntario Empresas: lista empresas do evento, cadastra novas e redefine
 * a senha de responsaveis. Reaproveita os mesmos endpoints do admin —
 * permissao validada no backend via VolunteersService.assertScopeInEvent.
 */
export default function VolunteerCompaniesPage() {
  useRequireRole(['VOLUNTEER']);
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;

  const [rows, setRows] = useState<CompanyDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Formulario de criacao
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [stand, setStand] = useState('');
  const [descricao, setDescricao] = useState('');
  const [resp, setResp] = useState<NovoResponsavel>({ nome: '', cpf: '', email: '', senha: '' });
  const [saving, setSaving] = useState(false);

  // Reset de senha de responsavel
  const [resetting, setResetting] = useState<{
    companyId: string;
    companyNome: string;
    userId: string;
    userNome: string;
  } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  async function load() {
    if (!eventId) return;
    try {
      const data = await api<CompanyDto[]>(`/events/${eventId}/companies`);
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function criar() {
    if (!eventId) return;
    setSaving(true);
    setErr(null);
    try {
      await api(`/events/${eventId}/companies`, {
        method: 'POST',
        body: JSON.stringify({
          nome,
          stand: stand || undefined,
          descricao: descricao || undefined,
          responsaveis: [
            {
              nome: resp.nome,
              cpf: resp.cpf,
              email: resp.email || undefined,
              senha: resp.senha,
            },
          ],
        }),
      });
      setOk(`Empresa "${nome}" cadastrada.`);
      setCreating(false);
      setNome('');
      setStand('');
      setDescricao('');
      setResp({ nome: '', cpf: '', email: '', senha: '' });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function resetSenhaResp() {
    if (!eventId || !resetting) return;
    setResetSaving(true);
    setErr(null);
    try {
      await api(
        `/events/${eventId}/companies/${resetting.companyId}/responsaveis/${resetting.userId}/senha`,
        {
          method: 'PATCH',
          body: JSON.stringify({ novaSenha }),
        },
      );
      setOk(`Senha de ${resetting.userNome} redefinida.`);
      setResetting(null);
      setNovaSenha('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setResetSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/voluntario" className="text-sm text-slate-500 hover:text-brand-primary">
            &larr; Voltar
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Empresas do evento</h1>
          <p className="text-sm text-slate-600">
            Cadastre novas empresas e redefina a senha de responsaveis existentes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nova empresa</Button>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      {creating && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Nova empresa</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome da empresa">
              <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="Stand (opcional)">
              <TextInput value={stand} onChange={(e) => setStand(e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descricao (opcional)">
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </Field>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-800">Responsavel inicial</p>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome do responsavel">
              <TextInput
                value={resp.nome}
                onChange={(e) => setResp((r) => ({ ...r, nome: e.target.value }))}
              />
            </Field>
            <Field label="CPF do responsavel">
              <TextInput
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={resp.cpf}
                onChange={(e) => setResp((r) => ({ ...r, cpf: e.target.value }))}
              />
            </Field>
            <Field label="Email (opcional)">
              <TextInput
                type="email"
                value={resp.email}
                onChange={(e) => setResp((r) => ({ ...r, email: e.target.value }))}
              />
            </Field>
            <Field label="Senha inicial" hint="Minimo de 8 caracteres">
              <TextInput
                type="password"
                value={resp.senha}
                onChange={(e) => setResp((r) => ({ ...r, senha: e.target.value }))}
                minLength={8}
              />
            </Field>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              onClick={() => void criar()}
              disabled={saving || !nome || !resp.nome || !resp.cpf || resp.senha.length < 8}
            >
              {saving ? 'Salvando...' : 'Cadastrar empresa'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!rows ? (
        <p className="text-sm text-slate-500">Carregando empresas...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma empresa cadastrada neste evento.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{c.nome}</p>
              <p className="text-xs text-slate-500">
                /{c.slug}
                {c.stand ? ` · stand ${c.stand}` : ''}
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {c.responsaveis.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{r.nome}</p>
                      <p className="text-slate-500">
                        <span className="font-mono">{maskCpf(r.cpf)}</span>
                        {r.email && <> · {r.email}</>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetting({
                          companyId: c.id,
                          companyNome: c.nome,
                          userId: r.id,
                          userNome: r.nome,
                        });
                        setNovaSenha('');
                        setOk(null);
                      }}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 hover:bg-white"
                    >
                      Redefinir senha
                    </button>
                  </li>
                ))}
              </ul>
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
              Redefinir senha de {resetting.userNome}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Empresa: <strong>{resetting.companyNome}</strong>. Combine a senha
              pessoalmente — voce nao ve a senha atual.
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
                onClick={() => void resetSenhaResp()}
                disabled={resetSaving || novaSenha.length < 8}
              >
                {resetSaving ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
