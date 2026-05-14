'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Card de escolha de cadastro (triagem signup) — 2 variantes:
 * - primary: borda azul, badge "Recomendado" no topo, hierarquia maior.
 *   Usado pra "Sou estudante" (caminho principal).
 * - outlined: borda neutra. Usado pra "Sou visitante externo".
 *
 * Cada card pode ter um `highlight` (pill mono dentro da descricao),
 * `example` (texto cinza adicional) e `bullets` (lista checada de
 * beneficios).
 */
interface ChoiceCardProps {
  href: string;
  variant: 'primary' | 'outlined';
  badge?: string;
  icon: ReactNode;
  title: string;
  desc: string;
  /** Pill em mono dentro da descricao (ex: "UC + 8 digitos"). */
  highlight?: string;
  /** Texto cinza apos o highlight (ex: "(ex: UC24101130)"). */
  example?: string;
  bullets?: string[];
}

export function ChoiceCard({
  href,
  variant,
  badge,
  icon,
  title,
  desc,
  highlight,
  example,
  bullets,
}: ChoiceCardProps) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      href={href}
      className={clsx(
        'group relative block rounded-[18px] border-[1.5px] bg-white p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E46B0]/20',
        isPrimary ? 'border-[#1E46B0]' : 'border-black/10',
      )}
      style={
        isPrimary
          ? {
              boxShadow:
                '0 14px 32px -18px rgba(30,70,176,0.5), 0 0 0 1px rgba(30,70,176,0.25)',
            }
          : { boxShadow: '0 8px 20px -14px rgba(11,21,48,0.18)' }
      }
    >
      {badge && (
        <span
          className="absolute -top-2 right-3.5 rounded-full bg-[#0B1530] px-2 py-[3px] text-[9.5px] font-semibold uppercase text-white"
          style={{ letterSpacing: '1px' }}
        >
          {badge}
        </span>
      )}

      <div className="flex items-start gap-3.5">
        <div
          className={clsx(
            'grid h-11 w-11 flex-shrink-0 place-items-center rounded-[12px]',
            isPrimary ? 'bg-[#1E46B0]/10 text-[#1E46B0]' : 'bg-black/5 text-[#3A4664]',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              'text-[16px] font-semibold leading-[1.2]',
              isPrimary ? 'text-[#1E46B0]' : 'text-[#0B1530]',
            )}
            style={{ letterSpacing: '-0.2px' }}
          >
            {title}
          </p>
          <p
            className="mt-[3px] text-[12.5px] leading-[1.4] text-[#6B7693]"
          >
            {desc}
            {highlight && (
              <>
                {' '}
                <span
                  className="rounded-[5px] bg-black/[0.06] px-1.5 py-[1px] font-mono text-[11.5px] font-medium text-[#0B1530]"
                >
                  {highlight}
                </span>
              </>
            )}
            {example && <span className="text-[#6B7693]"> {example}</span>}
          </p>
        </div>
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="mt-3.5 flex flex-col gap-1.5 border-t border-black/10 pt-3">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2 text-[12px] -tracking-[0.05px] text-[#3A4664]"
            >
              <span
                className={clsx(
                  'grid h-[14px] w-[14px] flex-shrink-0 place-items-center rounded-full',
                  isPrimary
                    ? 'bg-[#1E46B0]/15 text-[#1E46B0]'
                    : 'bg-black/[0.06] text-[#3A4664]',
                )}
              >
                <Check size={9} strokeWidth={3.2} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
