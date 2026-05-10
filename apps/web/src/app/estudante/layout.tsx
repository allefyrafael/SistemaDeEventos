'use client';

import { useMemo } from 'react';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import type { FeatureModule } from '@eventpass/shared';
import { useRequireRole } from '../../lib/auth-context';
import { AppShell } from '../../components/app-shell';
import { useActiveEvent } from '../../lib/use-active-event';

type Tab = { href: Route; label: string; icon: string; module?: FeatureModule };

const ALL_STUDENT_TABS: Tab[] = [
  { href: '/estudante' as Route, label: 'QR', icon: '◱', module: 'qr_scan' },
  { href: '/estudante/mapa' as Route, label: 'Mapa', icon: '◎', module: 'venue_map' },
  { href: '/estudante/passaporte' as Route, label: 'Passaporte', icon: '✦', module: 'passport' },
  { href: '/estudante/feedback' as Route, label: 'Feedback', icon: '☷', module: 'feedback' },
  { href: '/estudante/perfil' as Route, label: 'Perfil', icon: '☺', module: 'student_profile' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole(['STUDENT']);
  const { event } = useActiveEvent();
  const pathname = usePathname();

  const tabs = useMemo(() => {
    const mods = event?.modules;
    if (!mods?.length) return ALL_STUDENT_TABS;
    const filtered = ALL_STUDENT_TABS.filter(
      (t) => !t.module || mods.includes(t.module),
    );
    return filtered.length > 0 ? filtered : ALL_STUDENT_TABS;
  }, [event?.modules]);

  if (!user) return null;
  return (
    <AppShell
      title="Meu Passaporte"
      tabs={tabs}
      maxWidthClassName={
        pathname?.startsWith('/estudante/mapa') ? 'max-w-[1440px]' : 'max-w-3xl'
      }
    >
      {children}
    </AppShell>
  );
}
