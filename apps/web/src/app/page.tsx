'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  GraduationCap,
  Heart,
  HelpCircle,
  Plus,
  Shield,
} from 'lucide-react';
import type { PublicEvent } from '@eventpass/shared';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { AuthShellHomeHeader } from '../components/auth/auth-shell';
import { RoleCard, SecondaryTile } from '../components/auth/role-card';

/**
 * Home publica — porta direta do design "Editorial" gerado no Claude
 * Design (screen.jsx). Estrutura:
 *  - Header: logo EVENTPASS + pill "Ajuda" no canto
 *  - Eyebrow "Plataforma de eventos" (ou branding.publisher se houver)
 *  - Hero serifado italic em 2 linhas ("Acesse / sua conta.")
 *  - Label "Entrar como" com linha decorativa
 *  - 3 RoleCards: Participante (primary) > Empresa (outlined) > Admin (dark)
 *  - Divider "ou"
 *  - 2 SecondaryTiles em grid: Criar cadastro + Sou voluntario
 *  - Footer: branding + "powered by EventPass"
 *
 * Plataforma = EventPass (genérica); branding institucional vem do evento
 * publico ativo (Event.config.branding) — quando existe, sobrescreve o
 * footer e o eyebrow.
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeEvent, setActiveEvent] = useState<PublicEvent | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api<PublicEvent[]>('/events/public');
        setActiveEvent(rows[0] ?? null);
      } catch {
        setActiveEvent(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (user.tipoPerfil === 'ADMIN') router.replace('/admin');
    else if (user.tipoPerfil === 'COMPANY') router.replace('/empresa');
    else if (user.tipoPerfil === 'VOLUNTEER') router.replace('/voluntario');
    else router.replace('/estudante');
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center"
        style={{
          background:
            'linear-gradient(180deg, #F7F1E1 0%, #F1ECDD 28%, #E4E7EE 70%, #C9D3E3 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E46B0]/20 border-t-[#1E46B0]" />
          <p className="text-sm text-[#6B7693]">Carregando...</p>
        </div>
      </main>
    );
  }

  // Branding institucional vindo do evento publico ativo. Fallback para
  // copy generica quando nao ha evento.
  const kicker = activeEvent?.branding?.publisher ?? 'Plataforma de eventos';
  const footerText =
    activeEvent?.branding?.footer ?? 'Plataforma modular para eventos';

  return (
    <main
      className="min-h-dvh font-sans text-[#0B1530]"
      style={{
        background:
          'linear-gradient(180deg, #F7F1E1 0%, #F1ECDD 28%, #E4E7EE 70%, #C9D3E3 100%)',
      }}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-[22px] px-[22px] pb-7 pt-[54px]">
        <AuthShellHomeHeader>
          {/* Pill "Ajuda" no canto direito. Sem rota real ainda — placeholder. */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1.5 text-[11px] font-medium text-[#6B7693] transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E46B0]/30"
          >
            <HelpCircle size={13} strokeWidth={1.6} />
            Ajuda
          </button>
        </AuthShellHomeHeader>

        {/* HERO ─────────────────────────────────────────────────────── */}
        <section className="mt-2">
          <p
            className="text-[10.5px] font-semibold uppercase text-[#6B7693]"
            style={{ letterSpacing: '1.8px' }}
          >
            {kicker}
          </p>
          <h1
            className="mt-3.5 font-display text-[46px] font-medium italic leading-[1] text-[#0B1530] sm:text-[54px]"
            style={{ letterSpacing: '-1.6px' }}
          >
            Acesse
            <br />
            sua conta.
          </h1>
          <p
            className="mt-3 max-w-[92%] text-[14px] leading-[1.45] text-[#3A4664] sm:text-[15px]"
            style={{ letterSpacing: '-0.1px' }}
          >
            Selecione seu perfil para continuar.
          </p>
        </section>

        {/* SECTION LABEL: linha decorativa + "Entrar como" */}
        <div className="mt-1 flex items-center gap-2.5">
          <span aria-hidden className="h-px w-[18px] bg-[#0B1530]/40" />
          <span
            className="text-[10.5px] font-semibold uppercase text-[#6B7693]"
            style={{ letterSpacing: '1.6px' }}
          >
            Entrar como
          </span>
        </div>

        {/* ROLE CARDS ──────────────────────────────────────────────── */}
        <div className="-mt-2 flex flex-col gap-2.5">
          <RoleCard
            href="/login/estudante"
            variant="primary"
            icon={<GraduationCap size={22} strokeWidth={1.6} />}
            title="Sou participante"
            sub="Estudantes UCB e visitantes externos"
          />
          <RoleCard
            href="/login/empresa"
            variant="outlined"
            icon={<Briefcase size={22} strokeWidth={1.6} />}
            title="Sou empresa"
            sub="CPF do responsavel e senha pessoal"
          />
          <RoleCard
            href="/login/admin"
            variant="dark"
            icon={<Shield size={22} strokeWidth={1.6} />}
            title="Sou administrador"
            sub="Painel de gestao do evento"
          />
        </div>

        {/* DIVIDER "OU" */}
        <div className="mt-1 flex items-center gap-2.5">
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <span
            className="text-[10px] font-medium uppercase text-[#6B7693]"
            style={{ letterSpacing: '1.4px' }}
          >
            ou
          </span>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
        </div>

        {/* SECONDARY TILES (cadastro + voluntario) */}
        <div className="grid grid-cols-2 gap-2.5">
          <SecondaryTile
            href="/cadastro"
            icon={<Plus size={22} strokeWidth={1.6} />}
            title="Criar cadastro"
            sub="Primeiro acesso a plataforma"
          />
          <SecondaryTile
            href="/login/voluntario"
            icon={<Heart size={22} strokeWidth={1.6} />}
            title="Sou voluntario"
            sub="Acesso pelo organizador"
          />
        </div>

        {/* Espacador flexivel pra empurrar footer ao final */}
        <div className="min-h-4 flex-1" />

        {/* FOOTER */}
        <footer className="flex items-center justify-between gap-3 border-t border-black/10 pt-4">
          <div>
            <p
              className="text-[11px] font-medium text-[#3A4664]"
              style={{ letterSpacing: '-0.1px' }}
            >
              {footerText}
            </p>
            <p
              className="mt-0.5 text-[9.5px] font-medium uppercase text-[#6B7693]"
              style={{ letterSpacing: '1.2px' }}
            >
              powered by EventPass
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-[10.5px] text-[#6B7693]">
            <span style={{ letterSpacing: '0.4px' }}>PT-BR</span>
            <span aria-hidden>·</span>
            <span style={{ letterSpacing: '0.4px' }}>v2.4</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
