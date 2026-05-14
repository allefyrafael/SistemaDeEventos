'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PublicEvent } from '@eventpass/shared';
import { api, ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { maskCpf, stripCpf } from '../../../lib/cpf-mask';
import {
  AuthShell,
  AuthKicker,
  AuthHero,
} from '../../../components/auth/auth-shell';
import { AuthField } from '../../../components/auth/field';
import { AuthSelect } from '../../../components/auth/select';
import { AuthCta } from '../../../components/auth/cta-button';
import { AuthErrorBanner } from '../../../components/auth/error-banner';

export default function StudentRegisterPageWrapper() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-dvh"
          style={{
            background:
              'linear-gradient(180deg, #F7F1E1 0%, #F1ECDD 28%, #E4E7EE 70%, #C9D3E3 100%)',
          }}
        />
      }
    >
      <StudentRegisterPage />
    </Suspense>
  );
}

const MATRICULA_PATTERN = /^UC\d{8}$/;

/**
 * Cadastro de estudante UCB. Login posterior por matricula + CPF (sem
 * senha) — por isso esse form NAO pede senha. Visual Editorial casado
 * com a home e os logins (font-display italic, accent #1E46B0, fields
 * com ring 4px).
 */
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

  const cpfDigits = stripCpf(cpf);
  const matriculaInvalid =
    matricula.length > 0 && !MATRICULA_PATTERN.test(matricula);
  const formValid =
    !!eventId &&
    MATRICULA_PATTERN.test(matricula) &&
    nome.trim().length >= 3 &&
    cpfDigits.length === 11 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    if (!formValid) return;
    setSubmitting(true);
    try {
      await registerStudent({
        matricula,
        nome,
        cpf: cpfDigits,
        email,
        eventId,
      });
      router.replace('/estudante');
    } catch (error) {
      const err = error as ApiError;
      setSubmitErr(err.message ?? 'Falha no cadastro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell backHref="/cadastro">
      <div className="mt-1">
        <AuthKicker>Novo por aqui</AuthKicker>
        <AuthHero
          lineA="Criar conta"
          lineB="de estudante."
          size="md"
          description="Use sua matricula institucional (padrao UC + 8 digitos). O login depois sera pela mesma matricula + seu CPF — sem senha."
        />
      </div>

      {loadEventsErr && (
        <div className="mt-4">
          <AuthErrorBanner>{loadEventsErr}</AuthErrorBanner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <AuthSelect
          label="Evento"
          value={eventId}
          onChange={setEventId}
          hint={selectedEvent?.descricao ?? undefined}
          required
          disabled={!events || events.length === 0}
        >
          <option value="">
            {events === null
              ? 'Carregando eventos...'
              : events.length === 0
                ? 'Nenhum evento aberto'
                : 'Selecione um evento'}
          </option>
          {events?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </AuthSelect>

        <AuthField
          label="Matricula"
          hint="Padrao UC + 8 digitos (ex: UC24101130)"
          error={
            matriculaInvalid
              ? 'Formato invalido. Use UC seguido de 8 digitos.'
              : undefined
          }
          value={matricula}
          onChange={(v) =>
            setMatricula(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
          }
          placeholder="UC24101130"
          mono
          maxLength={10}
          autoComplete="username"
          autoCapitalize="characters"
          required
        />

        <AuthField
          label="Nome completo"
          value={nome}
          onChange={setNome}
          placeholder="Seu nome"
          minLength={3}
          maxLength={120}
          autoComplete="name"
          required
        />

        <AuthField
          label="CPF"
          value={cpf}
          onChange={(v) => setCpf(maskCpf(v))}
          placeholder="000.000.000-00"
          mono
          inputMode="numeric"
          maxLength={14}
          required
        />

        <AuthField
          label="Email institucional"
          value={email}
          onChange={setEmail}
          placeholder="voce@ucb.br"
          type="email"
          inputMode="email"
          maxLength={120}
          autoComplete="email"
          required
        />

        <AuthErrorBanner>{submitErr}</AuthErrorBanner>

        <AuthCta type="submit" disabled={!formValid} loading={submitting}>
          {submitting ? 'Cadastrando...' : 'Criar conta e entrar'}
        </AuthCta>
      </form>

      <div className="flex-1" />

      <p className="border-t border-black/10 pt-4 text-center text-[12.5px] text-[#6B7693]">
        Ja tem cadastro?{' '}
        <Link
          href="/login/estudante"
          className="font-semibold text-[#1E46B0] hover:underline"
        >
          Faca login
        </Link>
      </p>
    </AuthShell>
  );
}
