'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Field, TextInput, Button, ErrorBanner } from '../../../components/form';

export default function StudentLoginPage() {
  const { loginStudent } = useAuth();
  const router = useRouter();
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await loginStudent(matricula, cpf);
      router.replace('/estudante');
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Login Estudante</h1>
        <p className="text-sm text-slate-600">Estudantes entram com matricula + CPF.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Matricula">
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="Ex: 202600001"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
          />
        </Field>
        <Field label="CPF">
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
          />
        </Field>
        <ErrorBanner>{err}</ErrorBanner>
        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
        <p className="text-center text-xs text-slate-400">
          Visitante externo? Procure a equipe da organizacao na entrada para fazer seu cadastro.
        </p>
      </form>
    </main>
  );
}
