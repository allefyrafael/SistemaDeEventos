'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Botao CTA "Entrar" / primario das telas auth. Gradient brand azul
 * com chevron animado, shadow contextual. Quando `disabled` fica neutro
 * (cinza) — usado pra indicar form invalido. Quando `loading=true`,
 * mostra spinner + label opcional.
 *
 * Match com o design Editorial: padding 15/18, radius 14, fontSize 15,
 * gradient 140deg de #1E46B0 -> #142A7A.
 */
interface AuthCtaProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
  /** Esconde o chevron arrow direita (ex.: botoes secundarios). */
  noArrow?: boolean;
}

export function AuthCta({
  loading,
  disabled,
  children,
  noArrow,
  className,
  ...rest
}: AuthCtaProps) {
  const inactive = disabled || loading;
  return (
    <button
      {...rest}
      disabled={inactive}
      className={clsx(
        'flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-[15px] text-[15px] font-semibold transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E46B0]/30',
        inactive
          ? 'cursor-not-allowed bg-[#0B1530]/10 text-[#6B7693]'
          : 'text-white shadow-[0_14px_28px_-16px_rgba(30,70,176,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_18px_36px_-16px_rgba(30,70,176,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]',
        className,
      )}
      style={
        inactive
          ? undefined
          : {
              background: 'linear-gradient(140deg, #1E46B0 0%, #142A7A 100%)',
              letterSpacing: '-0.1px',
            }
      }
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {children}
        </>
      ) : (
        <>
          {children}
          {!noArrow && <ArrowRight size={18} strokeWidth={1.8} />}
        </>
      )}
    </button>
  );
}
