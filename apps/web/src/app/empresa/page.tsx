'use client';

import { useActiveEvent } from '../../lib/use-active-event';
import { EventScanner } from '../../components/event-scanner';

export default function CompanyScannerPage() {
  const { event, loading } = useActiveEvent();

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando evento...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-800">Sem evento ativo</p>
        <p className="mt-1 text-xs text-slate-500">
          Sua empresa nao esta vinculada a nenhum evento publicado no momento.
          Procure a equipe da organizacao para conferir o cadastro.
        </p>
      </div>
    );
  }

  return <EventScanner eventId={event.id} eventName={event.nome} />;
}
