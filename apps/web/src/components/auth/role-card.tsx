'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Card de selecao de perfil na home (3 variantes do design "Editorial"):
 * - primary: gradient azul, branco, alta hierarquia. Usado pra estudante/
 *   participante (maioria do trafego).
 * - outlined: branco com borda azul. Usado pra empresa.
 * - dark: gradient quase preto. Usado pra admin (recuado visualmente).
 *
 * Cada card tem icone 22px em quadrado 44px arredondado, titulo 17/600,
 * sub 12.5px e chevron arrow que translada no hover. Mantem padding 16px
 * e radius 18 do design.
 */
type Variant = 'primary' | 'outlined' | 'dark';

interface RoleCardProps {
  href: string;
  variant: Variant;
  icon: ReactNode;
  title: string;
  sub: string;
}

const STYLES: Record<
  Variant,
  {
    container: string;
    bg?: React.CSSProperties['background'];
    iconWrap: string;
    title: string;
    sub: string;
    arrow: string;
    shadow: string;
  }
> = {
  primary: {
    container: 'text-white',
    bg: 'linear-gradient(140deg, #1E46B0 0%, #142A7A 100%)',
    iconWrap: 'bg-white/[0.12] text-white',
    title: 'text-white',
    sub: 'text-white/80',
    arrow: 'text-white/95',
    shadow:
      '0 16px 32px -16px rgba(20,42,122,0.55), inset 0 1px 0 rgba(255,255,255,0.18)',
  },
  outlined: {
    container: 'border-[1.5px] border-[#1E46B0] bg-white text-[#1E46B0]',
    iconWrap: 'bg-[#1E46B0]/10 text-[#1E46B0]',
    title: 'text-[#1E46B0]',
    sub: 'text-[#6B7693]',
    arrow: 'text-[#1E46B0]',
    shadow: '0 8px 22px -14px rgba(11,21,48,0.25)',
  },
  dark: {
    container: 'text-white',
    bg: 'linear-gradient(140deg, #161C2E 0%, #0A0F1F 100%)',
    iconWrap: 'bg-white/[0.08] text-white',
    title: 'text-white',
    sub: 'text-white/60',
    arrow: 'text-white',
    shadow: '0 12px 28px -16px rgba(0,0,0,0.5)',
  },
};

export function RoleCard({
  href,
  variant,
  icon,
  title,
  sub,
}: RoleCardProps) {
  const s = STYLES[variant];
  return (
    <Link
      href={href}
      className={clsx(
        'group relative block w-full rounded-[18px] p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E46B0]/25',
        s.container,
      )}
      style={{ background: s.bg, boxShadow: s.shadow }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={clsx(
            'grid h-11 w-11 flex-shrink-0 place-items-center rounded-[12px]',
            s.iconWrap,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={clsx('text-[17px] font-semibold leading-[1.15]', s.title)}
            style={{ letterSpacing: '-0.2px' }}
          >
            {title}
          </p>
          <p
            className={clsx('mt-[3px] text-[12.5px] leading-[1.3]', s.sub)}
            style={{ letterSpacing: '0.05px' }}
          >
            {sub}
          </p>
        </div>
        <span
          className={clsx(
            'flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1',
            s.arrow,
          )}
        >
          <ArrowRight size={22} strokeWidth={1.8} />
        </span>
      </div>
    </Link>
  );
}

/**
 * Tile secundario com borda dashed — usado pra "Criar cadastro" e
 * "Sou voluntario" na home. Visual mais discreto.
 */
export function SecondaryTile({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[14px] border border-dashed border-black/10 p-3 transition-colors hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E46B0]/25"
    >
      <span className="text-[#3A4664]">{icon}</span>
      <p
        className="mt-2 text-[13px] font-semibold leading-[1.2] text-[#0B1530]"
        style={{ letterSpacing: '-0.2px' }}
      >
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-[1.3] text-[#6B7693]">{sub}</p>
    </Link>
  );
}
