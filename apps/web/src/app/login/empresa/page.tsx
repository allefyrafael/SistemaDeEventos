'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Field, TextInput, Button, ErrorBanner } from '../../../components/form';

export default function CompanyLoginPage() {
  const { loginCompany } = useAuth();
  const router = useRouter();
  const [cpfEmpresa, setCpfEmpresa] = useState('');
  const [cpfResponsavel, setCpfResponsavel] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await loginCompany(cpfEmpresa, cpfResponsavel);
      router.replace('/empresa');
    } catch (error) {
      const e = error as ApiError;
      setErr(e.message ?? 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <Link href="/" className="text-sm text-slate-500">&larr; Voltar</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Login Empresa</h1>
        <p className="text-sm text-slate-600">Dois CPFs de responsaveis previamente cadastrados pelo administrador.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="CPF da Empresa (responsavel 1)">
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfEmpresa}
            onChange={(e) => setCpfEmpresa(e.target.value)}
            required
          />
        </Field>
        <Field label="CPF do Responsavel (responsavel 2)">
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfResponsavel}
            onChange={(e) => setCpfResponsavel(e.target.value)}
            required
          />
        </Field>
        <ErrorBanner>{err}</ErrorBanner>
        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </main>
  );
}
