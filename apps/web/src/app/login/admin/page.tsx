'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Field, TextInput, Button, ErrorBanner } from '../../../components/form';

export default function AdminLoginPage() {
  const { loginAdmin } = useAuth();
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await loginAdmin(cpf, senha);
      router.replace('/admin');
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Login Administrador</h1>
        <p className="text-sm text-slate-600">Use o CPF e a senha cadastrada.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="CPF">
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
            autoComplete="username"
          />
        </Field>
        <Field label="Senha">
          <TextInput
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
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
