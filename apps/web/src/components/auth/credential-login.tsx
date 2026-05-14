'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { maskCpf, stripCpf } from '../../lib/cpf-mask';
import { AuthShell, AuthKicker, AuthHero } from './auth-shell';
import { AuthField } from './field';
import { AuthCta } from './cta-button';
import { AuthErrorBanner } from './error-banner';

/**
 * Tela generica de login por credencial (CPF + senha), usada pra
 * Empresa, Admin e Voluntario. Mesma estrutura do design Editorial
 * — variacoes ficam por conta dos textos passados via props.
 *
 * O caller injeta a funcao `onSubmit` que retorna o caminho de redirect
 * (ou throws ApiError). Mantemos a logica de auth nas rotas; o componente
 * so renderiza o visual e gerencia estado de form.
 */
export function CredentialLogin({
  kicker,
  title,
  description,
  cpfLabel = 'CPF',
  redirectTo,
  helpLabel = 'Esqueci minha senha',
  helpSub,
  footerLabel,
  doLogin,
}: {
  kicker: string;
  title: string;
  description: string;
  cpfLabel?: string;
  redirectTo: string;
  helpLabel?: string;
  helpSub?: string;
  footerLabel: string;
  doLogin: (cpf: string, senha: string) => Promise<unknown>;
}) {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = stripCpf(cpf).length === 11 && senha.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setErr(null);
    setLoading(true);
    try {
      await doLogin(stripCpf(cpf), senha);
      router.replace(redirectTo);
    } catch (error) {
      const apiErr = error as ApiError;
      setErr(apiErr.message ?? 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell backHref="/">
      <div className="mt-1">
        <AuthKicker>{kicker}</AuthKicker>
        <AuthHero
          lineA="Entrar como"
          lineB={`${title.toLowerCase()}.`}
          size="md"
          description={description}
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <AuthField
          label={cpfLabel}
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

        <AuthErrorBanner>{err}</AuthErrorBanner>

        <AuthCta type="submit" disabled={!valid} loading={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </AuthCta>

        <div className="-mt-1 flex flex-col gap-1">
          <Link
            href="/"
            className="self-start text-[12.5px] font-semibold text-[#1E46B0] hover:underline"
            style={{ letterSpacing: '-0.1px' }}
          >
            {helpLabel}
          </Link>
          {helpSub && (
            <p className="text-[11.5px] leading-[1.4] text-[#6B7693]">{helpSub}</p>
          )}
        </div>
      </form>

      <div className="flex-1" />

      <p
        className="border-t border-black/10 pt-4 text-center text-[11.5px] text-[#6B7693]"
        style={{ letterSpacing: '0.2px' }}
      >
        {footerLabel}
      </p>
    </AuthShell>
  );
}
