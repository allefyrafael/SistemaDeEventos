'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
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

export default function VisitorRegisterPageWrapper() {
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
      <VisitorRegisterPage />
    </Suspense>
  );
}

/**
 * Cadastro de visitante externo. Diferente do estudante, AQUI senha e
 * obrigatoria — o visitante nao tem vinculo institucional para servir
 * de "segundo fator", entao o login posterior e por CPF + senha pessoal.
 */
function VisitorRegisterPage() {
  const { registerVisitor } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [loadEventsErr, setLoadEventsErr] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
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
  const formValid =
    !!eventId &&
    nome.trim().length >= 3 &&
    cpfDigits.length === 11 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    senha.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    if (!formValid) return;
    setSubmitting(true);
    try {
      await registerVisitor({
        nome,
        cpf: cpfDigits,
        email,
        senha,
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
          lineB="de visitante."
          size="md"
          description="Preencha seus dados para participar do evento como visitante externo. Voce define uma senha pessoal usada nos proximos logins."
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
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="voce@email.com"
          type="email"
          inputMode="email"
          maxLength={120}
          autoComplete="email"
          required
        />

        <AuthField
          label="Senha"
          hint="Minimo de 8 caracteres. Sera usada nos proximos logins."
          value={senha}
          onChange={setSenha}
          placeholder="Crie uma senha"
          type={showSenha ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowSenha((s) => !s)}
              aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="grid h-6 w-6 place-items-center text-[#6B7693] transition hover:text-[#0B1530]"
            >
              {showSenha ? <EyeOff size={18} strokeWidth={1.6} /> : <Eye size={18} strokeWidth={1.6} />}
            </button>
          }
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
