'use client';

import { clsx } from 'clsx';

/**
 * Segmented tabs com pill animado deslizante (mesma curva 0.25s).
 * Usado pra "Sou estudante" / "Sou visitante" no login do participante.
 * Generico — aceita N opcoes mas otimizado pra 2.
 */
export function AuthTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const cols = options.length;
  const slot = 100 / cols;

  return (
    <div
      className="relative grid rounded-[14px] border border-black/10 bg-black/5 p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {/* Pill branco deslizante (left animado via inline style com %) */}
      <span
        aria-hidden
        className="absolute inset-y-1 rounded-[10px] bg-white shadow-[0_2px_8px_rgba(11,21,48,0.08),0_0_0_1px_rgba(11,21,48,0.04)] transition-[left] duration-300 ease-out"
        style={{
          left: `calc(${idx * slot}% + 4px)`,
          width: `calc(${slot}% - 8px)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'relative z-10 px-3 py-2.5 text-center text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E46B0]/30',
            value === opt.value ? 'text-[#1E46B0]' : 'text-[#6B7693]',
          )}
          style={{ letterSpacing: '-0.1px' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
