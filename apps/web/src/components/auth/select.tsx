'use client';

import { useId, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Select com mesma estetica do AuthField (label uppercase, border 1.5px,
 * focus ring 4px). Inclui chevron a direita pra indicar dropdown. Usado
 * no select de evento das telas de cadastro.
 */
interface AuthSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string | ReactNode;
  error?: string;
  children: ReactNode;
}

export function AuthSelect({
  label,
  value,
  onChange,
  hint,
  error,
  children,
  className,
  id: idProp,
  ...selectProps
}: AuthSelectProps) {
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
          hasError ? 'text-[#C8344F]' : focus ? 'text-[#1E46B0]' : 'text-[#6B7693]',
        )}
        style={{ letterSpacing: '1.4px' }}
      >
        {label}
      </label>
      <div
        className={clsx(
          'relative flex items-center rounded-[14px] border-[1.5px] bg-white transition',
          hasError
            ? 'border-[#C8344F]'
            : focus
              ? 'border-[#1E46B0] ring-4 ring-[#1E46B0]/15'
              : 'border-black/10',
        )}
      >
        <select
          {...selectProps}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocus(true);
            selectProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            selectProps.onBlur?.(e);
          }}
          aria-invalid={hasError || selectProps['aria-invalid']}
          className={clsx(
            'w-full min-w-0 appearance-none bg-transparent px-4 py-3.5 pr-10 text-[15px] font-medium text-[#0B1530] outline-none -tracking-[0.1px]',
            value ? 'text-[#0B1530]' : 'text-[#6B7693]/70',
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-3.5 text-[#6B7693]"
        />
      </div>
      {(hint || error) && (
        <p
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
