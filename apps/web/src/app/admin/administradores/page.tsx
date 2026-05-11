'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { maskCpf } from '../../../lib/format';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../components/form';

interface Admin {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<Admin[]>('/admins');
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Administradores</h2>
          <p className="text-sm text-slate-600">
            Administradores da plataforma tem acesso a todos os eventos e podem criar novos
            eventos. Para delegar a gestao de um evento especifico, cadastre um administrador
            aqui e ele podera acessar qualquer evento listado em /admin.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Novo administrador</Button>
      </div>

      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      {creating && (
        <AdminForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setOk('Administrador criado com sucesso.');
            void load();
          }}
        />
      )}

      {!rows ? (
        <p className="text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhum administrador cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.nome}</td>
                  <td className="px-4 py-2 text-slate-700">{r.email}</td>
                  <td className="px-4 py-2 font-mono text-slate-700" title="Mascarado por LGPD">
                    {maskCpf(r.cpf)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      await api('/admins', {
        method: 'POST',
        body: {
          nome,
          email,
          cpf: cpf.replace(/\D/g, ''),
          senha,
        },
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Novo administrador</h3>
      {err && <div className="mt-3"><ErrorBanner>{err}</ErrorBanner></div>}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Nome completo">
          <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="CPF (so numeros)">
          <TextInput value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </Field>
        <Field label="Senha inicial" hint="Minimo 8 caracteres">
          <TextInput
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <Button
          onClick={submit}
          disabled={saving || !nome || !email || !cpf || senha.length < 8}
        >
          {saving ? 'Salvando...' : 'Criar administrador'}
        </Button>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
