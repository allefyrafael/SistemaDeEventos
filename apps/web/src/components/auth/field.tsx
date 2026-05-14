'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * Campo de formulario do design "Editorial":
 * - Label uppercase letterspaced que muda de cor quando focused.
 * - Input com border 1.5px, radius 14, ring 4px quando focused.
 * - Suporta `mono` (JetBrains Mono — pra matricula/CPF) ou Inter.
 * - `trailing` aceita um botao (ex.: olho da senha).
 *
 * Quando ha `error`, label e border ficam vermelhos e a mensagem
 * substitui o `hint`. Usado em todas as telas de auth.
 */
interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  error?: string;
  mono?: boolean;
  trailing?: ReactNode;
}

export function AuthField({
  label,
  value,
  onChange,
  hint,
  error,
  mono,
  trailing,
  className,
  id: idProp,
  ...inputProps
}: AuthFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [focus, setFocus] = useState(false);
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={clsx(
          'text-[11px] font-semibold uppercase transition-colors',
          hasError
            ? 'text-[#C8344F]'
            : focus
              ? 'text-[#1E46B0]'
              : 'text-[#6B7693]',
        )}
        style={{ letterSpacing: '1.4px' }}
      >
        {label}
      </label>
      <div
        className={clsx(
          'flex items-center rounded-[14px] border-[1.5px] bg-white transition',
          hasError
            ? 'border-[#C8344F]'
            : focus
              ? 'border-[#1E46B0] ring-4 ring-[#1E46B0]/15'
              : 'border-black/10',
        )}
      >
        <input
          {...inputProps}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocus(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            inputProps.onBlur?.(e);
          }}
          aria-invalid={hasError || inputProps['aria-invalid']}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={clsx(
            'min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[15px] font-medium text-[#0B1530] outline-none placeholder:text-[#6B7693]/60',
            mono ? 'font-mono tracking-[0.2px]' : '-tracking-[0.1px]',
            className,
          )}
        />
        {trailing && (
          <div className="flex items-center pr-3 pl-1">{trailing}</div>
        )}
      </div>
      {(hint || error) && (
        <p
          id={`${id}-hint`}
          className={clsx(
            'text-[11.5px] leading-snug',
            hasError ? 'text-[#C8344F]' : 'text-[#6B7693]',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
