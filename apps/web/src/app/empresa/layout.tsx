'use client';

import { Cloud, History, ScanLine } from 'lucide-react';
import { useRequireRole } from '../../lib/auth-context';
import { AppShell } from '../../components/app-shell';

const ICON_SIZE = 18;

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole(['COMPANY', 'ADMIN']);
  if (!user) return null;
  return (
    <AppShell
      title="Area da Empresa"
      tabs={[
        { href: '/empresa', label: 'Scanner', icon: <ScanLine size={ICON_SIZE} /> },
        { href: '/empresa/historico', label: 'Historico', icon: <History size={ICON_SIZE} /> },
        { href: '/empresa/fila', label: 'Fila', icon: <Cloud size={ICON_SIZE} /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
