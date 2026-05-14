'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { maskCpf, stripCpf } from '../../../lib/cpf-mask';
import { AuthShell, AuthKicker, AuthHero } from '../../../components/auth/auth-shell';
import { AuthTabs } from '../../../components/auth/tabs';
import { AuthField } from '../../../components/auth/field';
import { AuthCta } from '../../../components/auth/cta-button';
import { AuthErrorBanner } from '../../../components/auth/error-banner';

type Mode = 'estudante' | 'visitante';

/**
 * Login do participante. Duas abas no design Editorial:
 *  - "Sou estudante": matricula UC######## + CPF (sem senha — login
 *    legado de quem foi importado via CSV ou se auto-cadastrou).
 *  - "Sou visitante": CPF + senha pessoal (visitante externo).
 *
 * Tabs animadas com pill deslizante. Botoes com gradient azul.
 * Olho da senha. Mascaras de CPF (000.000.000-00) e matricula (uppercase
 * limitada a 10 chars no padrao UC########). Validacao do CTA local
 * antes de submeter.
 */
export default function StudentLoginPage() {
  const router = useRouter();
  const { loginStudent, loginVisitor } = useAuth();
  const [tab, setTab] = useState<Mode>('estudante');

  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cpfDigits = stripCpf(cpf);
  const valid =
    tab === 'estudante'
      ? matricula.length >= 8 && cpfDigits.length === 11
      : cpfDigits.length === 11 && senha.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setErr(null);
    setLoading(true);
    try {
      if (tab === 'estudante') {
        await loginStudent(matricula, cpfDigits);
      } else {
        await loginVisitor(cpfDigits, senha);
      }
      router.replace('/estudante');
    } catch (error) {
      const apiErr = error as ApiError;
      setErr(apiErr.message ?? 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  // Sub-copy do hero muda conforme aba — mesmo texto do design.
  const sub =
    tab === 'estudante'
      ? 'Estudantes acessam com a matricula institucional e CPF cadastrado.'
      : 'Visitantes externos acessam com CPF e a senha definida no cadastro.';

  return (
    <AuthShell backHref="/">
      {/* HERO */}
      <div className="mt-1">
        <AuthKicker>Login do participante</AuthKicker>
        <AuthHero
          lineA="Entrar"
          lineB={tab === 'estudante' ? 'como estudante.' : 'como visitante.'}
          size="md"
          mutedLineB={false}
          description={sub}
        />
      </div>

      {/* TABS */}
      <div className="mt-5">
        <AuthTabs<Mode>
          value={tab}
          onChange={(v) => {
            setTab(v);
            setErr(null);
          }}
          options={[
            { value: 'estudante', label: 'Sou estudante' },
            { value: 'visitante', label: 'Sou visitante' },
          ]}
        />
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        {tab === 'estudante' ? (
          <>
            <AuthField
              label="Matricula"
              hint="Padrao UC + 8 digitos (ex: UC24101130)"
              value={matricula}
              onChange={(v) =>
                setMatricula(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
              }
              placeholder="UC24101130"
              mono
              autoComplete="username"
              maxLength={10}
              required
            />
            <AuthField
              label="CPF"
              value={cpf}
              onChange={(v) => setCpf(maskCpf(v))}
              placeholder="000.000.000-00"
              mono
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              required
            />
          </>
        ) : (
          <>
            <AuthField
              label="CPF"
              value={cpf}
              onChange={(v) => setCpf(maskCpf(v))}
              placeholder="000.000.000-00"
              mono
              inputMode="numeric"
              autoComplete="username"
              maxLength={14}
              required
            />
            <AuthField
              label="Senha"
              value={senha}
              onChange={setSenha}
              placeholder="Sua senha pessoal"
              type={showSenha ? 'text' : 'password'}
              autoComplete="current-password"
              required
              minLength={8}
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
          </>
        )}

        <AuthErrorBanner>{err}</AuthErrorBanner>

        <AuthCta type="submit" disabled={!valid} loading={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </AuthCta>

        {/* Helper links */}
        <div className="-mt-1 flex items-center justify-between gap-2">
          <Link
            href="/cadastro"
            className="border-b border-dotted border-black/15 pb-0.5 text-[12.5px] font-medium text-[#3A4664] transition hover:text-[#1E46B0]"
            style={{ letterSpacing: '-0.1px' }}
          >
            {tab === 'estudante'
              ? 'Nao sei minha matricula'
              : 'Esqueci minha senha'}
          </Link>
          <span className="text-[12.5px] font-medium text-[#6B7693]">
            Precisa de ajuda?
          </span>
        </div>
      </form>

      <div className="flex-1" />

      {/* FOOTER */}
      <p className="border-t border-black/10 pt-4 text-center text-[12.5px] text-[#6B7693]">
        Primeira vez aqui?{' '}
        <Link
          href="/cadastro"
          className="font-semibold text-[#1E46B0] hover:underline"
        >
          Criar cadastro
        </Link>
      </p>
    </AuthShell>
  );
}
