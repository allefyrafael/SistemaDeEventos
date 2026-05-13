'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PublicEvent } from '@eventpass/shared';
import { useAuth } from '../../../lib/auth-context';
import { api, ApiError } from '../../../lib/api';
import { Field, TextInput, Button, ErrorBanner } from '../../../components/form';

export default function StudentRegisterPageWrapper() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-slate-500">Carregando...</main>}>
      <StudentRegisterPage />
    </Suspense>
  );
}

const MATRICULA_PATTERN = /^UC\d{8}$/;

function StudentRegisterPage() {
  const { registerStudent } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [loadEventsErr, setLoadEventsErr] = useState<string | null>(null);

  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [eventId, setEventId] = useState<string>('');

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api<PublicEvent[]>('/events/public');
        setEvents(rows);
        const fromQuery = searchParams.get('eventId');
        if (fromQuery && rows.some((e) => e.id === fromQuery)) {
          setEventId(fromQuery);
        } else if (rows.length === 1) {
          setEventId(rows[0].id);
        }
      } catch (e) {
        setLoadEventsErr((e as Error).message);
      }
    })();
  }, [searchParams]);

  const selectedEvent = useMemo(
    () => events?.find((e) => e.id === eventId) ?? null,
    [events, eventId],
  );

  const matriculaInvalida =
    matricula.length > 0 && !MATRICULA_PATTERN.test(matricula.toUpperCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    if (!eventId) {
      setSubmitErr('Selecione um evento');
      return;
    }
    const matriculaUpper = matricula.toUpperCase().trim();
    if (!MATRICULA_PATTERN.test(matriculaUpper)) {
      setSubmitErr('Matricula deve seguir o padrao UC seguido de 8 digitos (ex: UC24101130)');
      return;
    }
    setSubmitting(true);
    try {
      await registerStudent({
        matricula: matriculaUpper,
        nome,
        cpf,
        email,
        senha,
        eventId,
      });
      router.replace('/estudante');
    } catch (error) {
      const e = error as ApiError;
      setSubmitErr(e.message ?? 'Falha no cadastro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6 pb-12">
      <div>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.replace('/cadastro');
            }
          }}
          className="text-sm text-slate-500 hover:text-brand-primary"
        >
          &larr; Voltar
        </button>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Cadastro de estudante</h1>
        <p className="text-sm text-slate-600">
          Use sua matricula institucional (padrao UC seguido de 8 digitos).
        </p>
      </div>

      {loadEventsErr && <ErrorBanner>{loadEventsErr}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Evento">
          {events === null ? (
            <p className="text-sm text-slate-500">Carregando eventos...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum evento aberto para inscricao no momento.
            </p>
          ) : (
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="" disabled>
                Selecione um evento
              </option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          )}
          {selectedEvent?.descricao && (
            <span className="mt-1 text-xs text-slate-500">{selectedEvent.descricao}</span>
          )}
        </Field>

        <Field
          label="Matricula"
          hint="Padrao UC + 8 digitos (ex: UC24101130)"
          error={matriculaInvalida ? 'Formato invalido. Use UC seguido de 8 digitos.' : undefined}
        >
          <TextInput
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value.toUpperCase())}
            placeholder="UC24101130"
            maxLength={10}
            required
            invalid={matriculaInvalida}
            autoCapitalize="characters"
          />
        </Field>

        <Field label="Nome completo">
          <TextInput
            type="text"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            minLength={3}
            maxLength={120}
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

        <Field label="Email institucional">
          <TextInput
            type="email"
            placeholder="voce@ucb.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={120}
          />
        </Field>

        <Field label="Senha" hint="Minimo de 8 caracteres. Sera usada nos proximos logins.">
          <TextInput
            type="password"
            placeholder="Crie uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
            maxLength={72}
          />
        </Field>

        <ErrorBanner>{submitErr}</ErrorBanner>

        <Button
          type="submit"
          disabled={submitting || !events || events.length === 0 || matriculaInvalida}
        >
          {submitting ? 'Cadastrando...' : 'Criar conta e entrar'}
        </Button>

        <p className="text-center text-xs text-slate-500">
          Ja tem cadastro?{' '}
          <Link href="/login/estudante" className="font-semibold text-brand-primary">
            Faca login
          </Link>
        </p>
      </form>
    </main>
  );
}
