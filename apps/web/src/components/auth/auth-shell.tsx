'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Layout base das telas publicas (home, login/*, cadastro/*). Aplica o
 * tema "Editorial" do design (gradient bege -> azulado, font Inter, hero
 * em Fraunces italic). Mobile-first centrado em max-w-md no desktop —
 * carrega o feel de "app no celular" mesmo em telas grandes.
 *
 * Header: botao Voltar (esquerda) + logo EVENTPASS (direita). Quando
 * `showBack=false`, esconde o botao e exibe um botao Ajuda no lugar
 * (usado na home).
 *
 * Footer e composto pelo caller via children (cada tela tem footer proprio).
 */
export function AuthShell({
  children,
  showBack = true,
  backHref,
  rightSlot,
}: {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: ReactNode;
}) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <main
      className="min-h-dvh font-sans text-[#0B1530]"
      style={{
        background:
          'linear-gradient(180deg, #F7F1E1 0%, #F1ECDD 28%, #E4E7EE 70%, #C9D3E3 100%)',
      }}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-7 pt-12 sm:px-6 sm:pt-14">
        {/* HEADER: voltar (ou nada) + logo */}
        <header className="flex items-center justify-between">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="-ml-1.5 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-[#3A4664] transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E46B0]/30"
            >
              <ArrowLeft size={18} strokeWidth={1.8} />
              Voltar
            </button>
          ) : (
            <div /> /* placeholder pra justify-between funcionar */
          )}

          <div className="flex items-center gap-2">
            {/* Logo: quadrado preto com E branca, letterspacing 2.2px */}
            <span
              aria-hidden
              className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-[#0B1530] text-[10px] font-bold leading-none text-white"
              style={{ letterSpacing: -0.3 }}
            >
              E
            </span>
            <span
              className="text-[10.5px] font-semibold uppercase text-[#0B1530]"
              style={{ letterSpacing: '2.2px' }}
            >
              EventPass
            </span>
          </div>

          {rightSlot ? <div className="ml-2">{rightSlot}</div> : null}
        </header>

        {children}
      </div>
    </main>
  );
}

/**
 * Variante da header — usada SO na home: sem botao voltar, com pill
 * "Ajuda" no canto direito. Reutiliza o mesmo layout/spacing.
 * Disponivel como link externo / popover futuro.
 */
export function AuthShellHomeHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-5 w-5 place-items-center rounded-[6px] bg-[#0B1530] text-[11px] font-bold leading-none text-white"
          style={{ letterSpacing: -0.3 }}
        >
          E
        </span>
        <span
          className="text-[11.5px] font-semibold uppercase text-[#0B1530]"
          style={{ letterSpacing: '2.2px' }}
        >
          EventPass
        </span>
      </div>
      {children}
    </header>
  );
}

/**
 * "Eyebrow" pequeno acima do hero (ex.: "Login do participante",
 * "Plataforma de eventos"). Tipografia tecnica letterspaced.
 */
export function AuthKicker({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[10.5px] font-semibold uppercase text-[#6B7693]"
      style={{ letterSpacing: '1.8px' }}
    >
      {children}
    </div>
  );
}

/**
 * Hero serifado italico, 2 linhas em quebra controlada. Tamanho varia
 * por tela (signup/home maior; logins menores).
 */
export function AuthHero({
  lineA,
  lineB,
  size = 'lg',
  mutedLineB = false,
  description,
}: {
  lineA: ReactNode;
  lineB: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  mutedLineB?: boolean;
  description?: ReactNode;
}) {
  // Sizes calibrados ao design: home/signup = 46px; participante = 38px;
  // login generico = 42px. Escalam pra 5xl em desktop sem ficar enorme.
  const sizeClass =
    size === 'lg'
      ? 'text-[44px] sm:text-[52px]'
      : size === 'md'
        ? 'text-[40px] sm:text-[48px]'
        : 'text-[36px] sm:text-[42px]';

  return (
    <div className="mt-3">
      <h1
        className={`font-display italic font-medium leading-[1.02] text-[#0B1530] ${sizeClass}`}
        style={{ letterSpacing: '-1.4px' }}
      >
        {lineA}
        <br />
        <span className={mutedLineB ? 'text-[#6B7693]' : ''}>{lineB}</span>
      </h1>
      {description && (
        <p
          className="mt-3 text-[14px] leading-[1.45] text-[#3A4664] sm:text-[15px]"
          style={{ letterSpacing: '-0.1px' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Link "voltar pra home" estilo footer — usado em telas finais.
 * Mantido aqui pra reuso eventual.
 */
export function AuthFootHomeLink() {
  return (
    <p className="pt-4 text-center text-[11.5px] text-[#6B7693]">
      <Link href="/" className="font-medium text-[#1E46B0] hover:underline">
        Voltar ao inicio
      </Link>
    </p>
  );
}
