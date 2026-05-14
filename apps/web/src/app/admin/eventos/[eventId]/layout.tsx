'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Building2,
  Download,
  FileText,
  HandHelping,
  LayoutDashboard,
  Map as MapIcon,
  ScanLine,
  Settings,
  Stamp as StampIcon,
  Tag,
  Users as UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureModule } from '@eventpass/shared';
import { useRequireRole } from '../../../../lib/auth-context';
import {
  EVENT_STATUS_COLOR,
  EVENT_STATUS_LABEL,
} from '../../../../lib/event-status';
import {
  EventParamsProvider,
  useEventFromParams,
  type EventContextData,
} from '../../../../lib/use-event-from-params';

/**
 * Descricao de cada aba de gerenciamento do evento. Algumas abas so aparecem
 * se o modulo correspondente estiver ativo - isso forca o organizador a
 * passar pela tela de modulos antes de configurar coisas mais especificas.
 */
interface TabDef {
  segment: string;
  label: string;
  icon: LucideIcon;
  requires?: FeatureModule;
  description: string;
}

const TABS: TabDef[] = [
  {
    segment: '',
    label: 'Visao geral',
    icon: LayoutDashboard,
    description: 'Resumo e metricas em tempo real do evento.',
  },
  {
    segment: 'modulos',
    label: 'Modulos',
    icon: Settings,
    description: 'Escolha quais funcionalidades o evento vai usar.',
  },
  {
    segment: 'configuracoes',
    label: 'Dados do evento',
    icon: FileText,
    description: 'Editar nome, datas, descricao e status.',
  },
  {
    segment: 'empresas',
    label: 'Empresas',
    icon: Building2,
    requires: 'companies',
    description: 'Cadastro de empresas expositoras e responsaveis.',
  },
  {
    segment: 'categorias',
    label: 'Categorias',
    icon: Tag,
    requires: 'companies',
    description: 'Categorias de empresa (agrupamento + atalho de autorizacao em stamps).',
  },
  {
    segment: 'alunos',
    label: 'Participantes',
    icon: UsersIcon,
    description: 'Importacao e listagem de participantes.',
  },
  {
    segment: 'voluntarios',
    label: 'Voluntarios',
    icon: HandHelping,
    description: 'Equipe que ajuda na gestao de estudantes e empresas no evento.',
  },
  {
    segment: 'stamps',
    label: 'Carimbos',
    icon: StampIcon,
    requires: 'passport',
    description: 'Itens que o participante precisa colecionar.',
  },
  {
    segment: 'scanner',
    label: 'Scanner',
    icon: ScanLine,
    requires: 'qr_scan',
    description: 'Scanner geral do organizador (em nome de qualquer empresa).',
  },
  {
    segment: 'mapa',
    label: 'Mapa',
    icon: MapIcon,
    requires: 'venue_map',
    description: 'Mapa interativo com stands, auditorios e salas.',
  },
  {
    segment: 'exportar',
    label: 'Exportar',
    icon: Download,
    requires: 'exports_csv',
    description: 'Relatorios em CSV para Excel.',
  },
];

function tabHref(eventId: string, segment: string): Route {
  return (segment ? `/admin/eventos/${eventId}/${segment}` : `/admin/eventos/${eventId}`) as Route;
}

export default function EventContextLayout({ children }: { children: React.ReactNode }) {
  return (
    <EventParamsProvider>
      <EventContextLayoutInner>{children}</EventContextLayoutInner>
    </EventParamsProvider>
  );
}

function EventContextLayoutInner({ children }: { children: React.ReactNode }) {
  const user = useRequireRole(['ADMIN']);
  const { event, loading, error } = useEventFromParams();
  const pathname = usePathname();
  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
        Carregando evento...
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold">Nao foi possivel abrir este evento.</p>
        <p className="mt-1 text-xs">{error ?? 'Evento nao encontrado'}</p>
        <Link
          href={'/admin' as Route}
          className="mt-3 inline-block text-sm font-semibold text-red-700 underline"
        >
          Voltar para lista de eventos
        </Link>
      </div>
    );
  }

  const availableTabs = TABS.filter(
    (t) => !t.requires || event.modules.includes(t.requires),
  );

  return (
    <div className="flex flex-col gap-5">
      <EventHeader event={event} />
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-1">
        {availableTabs.map((t) => {
          const href = tabHref(event.id, t.segment);
          const active =
            t.segment === ''
              ? pathname === `/admin/eventos/${event.id}`
              : pathname?.startsWith(`/admin/eventos/${event.id}/${t.segment}`);
          return (
            <Link
              key={t.segment || 'overview'}
              href={href}
              title={t.description}
              className={clsx(
                'whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-b-2 border-brand-primary bg-white text-brand-primary'
                  : 'text-slate-600 hover:bg-white hover:text-brand-primary',
              )}
            >
              <span className="mr-1 inline-flex items-center">
                <t.icon size={14} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}

function EventHeader({ event }: { event: EventContextData }) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <Link
        href={'/admin' as Route}
        className="text-xs text-slate-500 hover:text-brand-primary"
      >
        ← Todos os eventos
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{event.nome}</h1>
          <p className="text-xs text-slate-500">
            /{event.slug} ·{' '}
            {new Date(event.startsAt).toLocaleDateString('pt-BR')} ate{' '}
            {new Date(event.endsAt).toLocaleDateString('pt-BR')}
          </p>
          {event.descricao && (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{event.descricao}</p>
          )}
        </div>
        <span
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            EVENT_STATUS_COLOR[event.status],
          )}
        >
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </div>
    </header>
  );
}
