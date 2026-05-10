'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useRequireRole, useAuth } from '../../lib/auth-context';

interface NavItem {
  href: Route;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: '/admin' as Route, label: 'Eventos', icon: '⌘' },
  { href: '/admin/administradores' as Route, label: 'Administradores', icon: '☺' },
];

/**
 * Layout do painel do super-admin da plataforma. A gestao especifica de um
 * evento (empresas, alunos, stamps etc.) acontece dentro de
 * /admin/eventos/[eventId]/* com seu proprio layout contextualizado.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole(['ADMIN']);
  const { logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  return (
    <div className="flex min-h-dvh bg-slate-100">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:flex md:flex-col">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-slate-500">EventPass</p>
          <h1 className="text-xl font-bold text-brand-primary">Painel Admin</h1>
          <p className="mt-1 text-xs text-slate-400">Plataforma</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active =
              n.href === '/admin'
                ? pathname === '/admin'
                : pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-800">{user.nome}</p>
          <p className="text-xs text-slate-500">Administrador da plataforma</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <h1 className="text-base font-bold text-brand-primary">Painel Admin</h1>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs text-slate-600"
          >
            Sair
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {NAV.map((n) => {
            const active =
              n.href === '/admin'
                ? pathname === '/admin'
                : pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                  active
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-slate-500',
                )}
              >
                {n.icon} {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
