'use client';

import { clsx } from 'clsx';
import type { InputHTMLAttributes, ReactNode, ButtonHTMLAttributes } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
        props.className,
      )}
    />
  );
}

export function Button({
  variant = 'primary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      {...rest}
      className={clsx(
        'rounded-xl px-4 py-3 text-center font-semibold transition active:scale-[0.98] disabled:opacity-60',
        variant === 'primary' && 'bg-brand-primary text-white shadow-sm',
        variant === 'secondary' && 'border-2 border-brand-primary text-brand-primary',
        variant === 'danger' && 'bg-red-600 text-white',
        className,
      )}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </div>
  );
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {children}
    </div>
  );
}
