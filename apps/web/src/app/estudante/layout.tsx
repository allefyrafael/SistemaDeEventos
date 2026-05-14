'use client';

import { useMemo, type ReactNode } from 'react';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import type { FeatureModule } from '@eventpass/shared';
import {
  BookMarked,
  Map as MapIcon,
  QrCode,
  User as UserIcon,
} from 'lucide-react';
import { useRequireRole } from '../../lib/auth-context';
import { AppShell } from '../../components/app-shell';
import { useActiveEvent } from '../../lib/use-active-event';

type Tab = { href: Route; label: string; icon: ReactNode; module?: FeatureModule };

const ICON_SIZE = 18;

// Aba "Feedback" removida: a avaliacao acontece INLINE no item do
// passaporte (modal sobre o card carimbado). Reduz cliques, mantem o
// contexto e evita uma tela inteira so para um formulario curto.
// A rota /estudante/feedback continua existindo para deep links eventuais.
const ALL_STUDENT_TABS: Tab[] = [
  { href: '/estudante' as Route, label: 'QR', icon: <QrCode size={ICON_SIZE} />, module: 'qr_scan' },
  { href: '/estudante/mapa' as Route, label: 'Mapa', icon: <MapIcon size={ICON_SIZE} />, module: 'venue_map' },
  { href: '/estudante/passaporte' as Route, label: 'Passaporte', icon: <BookMarked size={ICON_SIZE} />, module: 'passport' },
  { href: '/estudante/perfil' as Route, label: 'Perfil', icon: <UserIcon size={ICON_SIZE} />, module: 'student_profile' },
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
