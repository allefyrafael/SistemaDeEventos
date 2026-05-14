'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, GraduationCap, Shield } from 'lucide-react';
import type { PublicEvent } from '@eventpass/shared';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';

/**
 * Home publica. Mostra:
 * - Branding institucional do evento ativo (publisher / nome / tagline / datas).
 * - Status do evento (RUNNING = "Ao vivo" com dot pulsando, PUBLISHED = "Inscricoes abertas").
 * - 3 CTAs primarios em ordem de fluxo esperado (estudante > empresa > admin).
 * - 2 acoes secundarias (sem cadastro / voluntario) em bloco visualmente separado.
 * - Footer institucional ancorado no bottom (mt-auto), com microcopy "Powered by EventPass".
 *
 * Sem acesso a auth aqui — usuario logado e redirecionado pra sua area via useEffect.
 * Plataforma = EventPass (genérica); branding vem do evento ativo (Event.config.branding).
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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  // Derivacao do branding com fallback gracioso quando nao ha evento publico.
  const publisher = activeEvent?.branding?.publisher;
  const tagline = activeEvent?.branding?.tagline;
  const footer = activeEvent?.branding?.footer;
  const eventName = activeEvent?.nome ?? 'EventPass';
  const datesLabel = activeEvent
    ? formatEventDates(activeEvent.startsAt, activeEvent.endsAt)
    : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/*
        Decoracao de fundo: 2 blobs gigantes desfocados (uma cor por canto)
        dao personalidade institucional sem poluir nem depender de assets.
        Brand-accent (amarelo UCB) em cima a direita, brand-primary (azul UCB)
        embaixo a esquerda — reforcam paleta sem competir com o conteudo.
        pointer-events-none pra nao bloquear cliques nos cantos.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-accent/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-40 h-[32rem] w-[32rem] rounded-full bg-brand-primary/15 blur-3xl"
      />

      {/*
        Conteudo. min-h-dvh garante grudar no fundo do viewport REAL do mobile
        (descontando URL bar dinamica). max-w-md em 375-640px, expande pra lg
        no tablet+. Single-column intencional: foco em conversao, nao info.
      */}
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:max-w-lg sm:px-8 sm:py-12">
        {/* HEADER: chip institucional + status pill em linha. */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          {publisher ? (
            <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 backdrop-blur">
              {publisher}
            </span>
          ) : (
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              EventPass
            </span>
          )}
          <StatusPill status={activeEvent?.status} />
        </header>

        {/*
          HERO: nome do evento dominante em Fraunces italic (a fonte display
          configurada no projeto). Tipografia escalando 4xl -> 5xl -> 6xl
          conforme breakpoint. Tagline em slate-600 logo abaixo, datas em
          mono pra contraste de textura.
        */}
        <section className="mt-12 sm:mt-16">
          <h1 className="font-display text-4xl font-semibold italic leading-[1.02] text-slate-900 sm:text-5xl md:text-6xl">
            {eventName}
          </h1>
          {tagline && (
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600 sm:text-lg">
              {tagline}
            </p>
          )}
          {datesLabel && (
            <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
              <span aria-hidden className="h-px w-6 bg-slate-300" />
              {datesLabel}
            </p>
          )}
        </section>

        {/*
          CTAs em 3 niveis de hierarquia visual.
          Mesma altura conceitual pra alinhamento limpo, mas pesos diferentes:
          - Estudante: gradient brand-primary -> blue-800, shadow brand, branco
          - Empresa:   outline brand-primary, hover preenche levemente
          - Admin:     slate-900 fill, menor, mais discreto
          Cada um tem icone + titulo + micro-tagline + chevron animado.
          Focus rings de 4px com a propria cor (acessibilidade teclado).
        */}
        <section className="mt-10 flex flex-col gap-3 sm:mt-12 sm:gap-3.5">
          {/* PRIMARY — Estudante (90% do trafego esperado) */}
          <Link
            href="/login/estudante"
            className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary to-blue-800 p-5 text-white shadow-lg shadow-brand-primary/30 transition-all duration-150 hover:shadow-xl hover:shadow-brand-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 sm:p-6"
          >
            {/* Brilho interno sutil pro card primario destacar mais */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            />
            <span className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
                <GraduationCap size={24} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight">Sou estudante</span>
                <span className="mt-0.5 block text-xs text-white/80 sm:text-sm">
                  Acesso com matricula + CPF
                </span>
              </span>
            </span>
            <ArrowRight
              size={20}
              className="relative flex-shrink-0 transition-transform duration-150 group-hover:translate-x-1"
            />
          </Link>

          {/* SECONDARY — Empresa */}
          <Link
            href="/login/empresa"
            className="group flex items-center justify-between gap-4 rounded-2xl border-2 border-brand-primary bg-white p-5 text-brand-primary transition-all duration-150 hover:bg-brand-primary/5 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 sm:p-6"
          >
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
                <Briefcase size={22} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight">Sou empresa</span>
                <span className="mt-0.5 block text-xs text-brand-primary/70 sm:text-sm">
                  CPF + senha pessoal do responsavel
                </span>
              </span>
            </span>
            <ArrowRight
              size={20}
              className="flex-shrink-0 transition-transform duration-150 group-hover:translate-x-1"
            />
          </Link>

          {/* TERTIARY — Admin (visualmente recuado: menor, escuro discreto) */}
          <Link
            href="/login/admin"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white transition-all duration-150 hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 sm:p-5"
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Shield size={18} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-tight">
                  Sou administrador
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Painel de gestao do evento
                </span>
              </span>
            </span>
            <ArrowRight
              size={18}
              className="flex-shrink-0 text-slate-400 transition-all duration-150 group-hover:translate-x-1 group-hover:text-white"
            />
          </Link>
        </section>

        {/*
          Acoes secundarias agrupadas, separadas dos CTAs por margem maior
          (mt-7) + bloco visual proprio. "Nao tenho cadastro" mais peso
          tipografico que "Sou voluntario" (estudante eh maioria do trafego
          secundario; voluntario eh nicho).
        */}
        <section className="mt-7 flex flex-col items-center gap-1.5 sm:mt-8">
          <Link
            href="/cadastro"
            className="rounded text-sm font-semibold text-slate-700 underline decoration-slate-300 decoration-2 underline-offset-4 transition-colors hover:text-brand-primary hover:decoration-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          >
            Nao tenho cadastro
          </Link>
          <Link
            href="/login/voluntario"
            className="rounded text-xs font-medium text-slate-500 underline-offset-4 transition-colors hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Sou voluntario do evento
          </Link>
        </section>

        {/*
          FOOTER ancorado: mt-auto empurra pro fim do flex coluna mesmo em
          viewports altos. Linha sutil separadora pra hierarquia visual.
          Microcopy "Powered by EventPass" diferencia plataforma (genérica)
          de instituicao organizadora (no `footer` do branding).
        */}
        <footer className="mt-auto pt-10 sm:pt-14">
          <div className="border-t border-slate-200/80 pt-5 text-center">
            <p className="text-xs font-medium text-slate-600">
              {footer ?? 'Plataforma modular para organizacao de eventos'}
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Powered by EventPass
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------------
// Helpers locais — pequenos suficiente pra ficar inline, especificos pra home.
// ----------------------------------------------------------------------------

/**
 * Pill discreta de status do evento. RUNNING = "Ao vivo" com dot pulsando
 * (sinal universal de "agora"). PUBLISHED = "Inscricoes abertas" sem
 * pulse. Outros status (DRAFT/CLOSED/ARCHIVED) nao aparecem na home — se
 * sao publicos no listPublic, mostramos nada (intencional).
 */
function StatusPill({ status }: { status?: string }) {
  if (status === 'RUNNING') {
    return (
      <span
        role="status"
        aria-label="Evento em andamento"
        className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700"
      >
        <span className="relative flex h-2 w-2">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
          />
          <span
            aria-hidden
            className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"
          />
        </span>
        Ao vivo
      </span>
    );
  }
  if (status === 'PUBLISHED') {
    return (
      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
        Inscricoes abertas
      </span>
    );
  }
  return null;
}

/**
 * Datas relativas humanas em vez de DD/MM cru. "Comeca em 3 dias" pesa
 * mais que "12/05/2026" pra criar urgencia + reduzir esforco cognitivo.
 * Quando o evento esta em andamento, mostra "Termina em N dias" pra
 * urgencia adicional. Encerrado mostra a data (caso raro — listPublic
 * filtra PUBLISHED/RUNNING, mas defensivo).
 */
function formatEventDates(startsAtIso: string, endsAtIso: string): string {
  const now = Date.now();
  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  const ms = 24 * 60 * 60 * 1000;

  if (now < start) {
    const days = Math.ceil((start - now) / ms);
    if (days <= 0) return 'Comeca hoje';
    if (days === 1) return 'Comeca amanha';
    if (days <= 30) return `Comeca em ${days} dias`;
    return `A partir de ${new Date(start).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })}`;
  }
  if (now <= end) {
    const days = Math.ceil((end - now) / ms);
    if (days <= 1) return 'Termina hoje';
    return `Termina em ${days} dias`;
  }
  return `Encerrado em ${new Date(end).toLocaleDateString('pt-BR')}`;
}
