'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';

/**
 * Substitui o `window.confirm()` nativo (que e hostil em mobile, nao
 * estilizavel e bloqueia a thread) por um modal proprio acessivel.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Excluir?', message: '...' })) ...
 *
 * Requer <ConfirmProvider> em algum ancestral (esta em apps/web/src/app/layout.tsx).
 */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  /** Label do botao principal. Default: "Confirmar". */
  confirmLabel?: string;
  /** Label do botao secundario. Default: "Cancelar". */
  cancelLabel?: string;
  /** Variante visual; `danger` usa botao vermelho. Default: `danger`. */
  variant?: 'danger' | 'primary';
}

type ResolveFn = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: ResolveFn;
  } | null>(null);

  // Foca o botao principal quando o modal abre.
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state) confirmBtnRef.current?.focus();
  }, [state]);

  // Esc fecha o modal (resolve false).
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        state!.resolve(false);
        setState(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  function handleAnswer(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  const variant = state?.opts.variant ?? 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          onClick={(e) => {
            // click fora do card fecha (resolve false)
            if (e.target === e.currentTarget) handleAnswer(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="confirm-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {state.opts.title}
            </h2>
            {state.opts.message && (
              <div className="mt-2 whitespace-pre-line text-sm text-slate-600">
                {state.opts.message}
              </div>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => handleAnswer(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {state.opts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => handleAnswer(true)}
                className={clsx(
                  'rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm',
                  variant === 'danger' && 'bg-red-600 hover:bg-red-700',
                  variant === 'primary' && 'bg-brand-primary hover:opacity-90',
                )}
              >
                {state.opts.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm fora de <ConfirmProvider>');
  }
  return ctx.confirm;
}
