'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Field, TextInput, Button, ErrorBanner } from '../../../components/form';

type Mode = 'aluno' | 'visitante';

export default function StudentLoginPage() {
  const { loginStudent, loginVisitor } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('aluno');

  // form aluno
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');

  // form visitante
  const [visitorCpf, setVisitorCpf] = useState('');
  const [senha, setSenha] = useState('');

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === 'aluno') {
        await loginStudent(matricula, cpf);
      } else {
        await loginVisitor(visitorCpf, senha);
      }
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Entrar como participante</h1>
        <p className="text-sm text-slate-600">
          {mode === 'aluno'
            ? 'Estudantes da instituicao entram com matricula + CPF.'
            : 'Visitantes externos entram com CPF + senha cadastrada.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('aluno');
            setErr(null);
          }}
          className={clsx(
            'rounded-lg py-2 text-sm font-semibold transition',
            mode === 'aluno' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500',
          )}
        >
          Sou estudante
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('visitante');
            setErr(null);
          }}
          className={clsx(
            'rounded-lg py-2 text-sm font-semibold transition',
            mode === 'visitante' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500',
          )}
        >
          Sou visitante
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'aluno' ? (
          <>
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
          </>
        ) : (
          <>
            <Field label="CPF">
              <TextInput
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={visitorCpf}
                onChange={(e) => setVisitorCpf(e.target.value)}
                required
              />
            </Field>
            <Field label="Senha">
              <TextInput
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={8}
              />
            </Field>
          </>
        )}

        <ErrorBanner>{err}</ErrorBanner>

        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        {mode === 'visitante' && (
          <p className="text-center text-sm text-slate-600">
            Ainda nao tem conta?{' '}
            <Link href="/cadastro/visitante" className="font-semibold text-brand-primary">
              Cadastre-se aqui
            </Link>
          </p>
        )}
      </form>
    </main>
  );
}
