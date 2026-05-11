'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';

export function AppShell({
  title,
  tabs,
  children,
  maxWidthClassName = 'max-w-3xl',
}: {
  title: string;
  tabs?: { href: Route | string; label: string; icon?: ReactNode }[];
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const activeTabHref = useMemo(() => {
    if (!tabs || tabs.length === 0 || !pathname) return null;
    let best: string | null = null;
    for (const t of tabs) {
      const href = String(t.href);
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (!matches) continue;
      if (!best || href.length > best.length) best = href;
    }
    return best;
  }, [pathname, tabs]);

  return (
    <div className={clsx('mx-auto flex min-h-dvh w-full flex-col bg-slate-50', maxWidthClassName)}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          {user && <p className="text-xs text-slate-500">{user.nome}</p>}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
        >
          Sair
        </button>
      </header>
      <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-4">{children}</main>
      {tabs && tabs.length > 0 && (
        <nav className="sticky bottom-0 z-10 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1 border-t border-slate-200 bg-white px-2 py-2">
          {tabs.map((t) => {
            const active = activeTabHref === String(t.href);
            return (
              <Link
                key={t.href}
                href={t.href as Route}
                className={clsx(
                  'flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium',
                  active ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-500',
                )}
              >
                {t.icon && (
                  <span className="flex h-5 w-5 items-center justify-center">
                    {t.icon}
                  </span>
                )}
                <span>{t.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
