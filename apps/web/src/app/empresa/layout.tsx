'use client';

import { useRequireRole } from '../../lib/auth-context';
import { AppShell } from '../../components/app-shell';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole(['COMPANY', 'ADMIN']);
  if (!user) return null;
  return (
    <AppShell
      title="Area da Empresa"
      tabs={[
        { href: '/empresa', label: 'Scanner', icon: '◉' },
        { href: '/empresa/historico', label: 'Historico', icon: '≡' },
        { href: '/empresa/fila', label: 'Fila', icon: '☁' },
      ]}
    >
      {children}
    </AppShell>
  );
}
