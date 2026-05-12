'use client';

import { useEffect, useState } from 'react';
import type { CompanyDto } from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { EventScanner } from '../../../../../components/event-scanner';
import { ErrorBanner } from '../../../../../components/form';

/**
 * Scanner geral do organizador (admin do evento). Reaproveita o componente
 * <EventScanner> com o modo admin habilitado: precisa escolher uma empresa
 * antes de cada scan (vai como `actAsCompanyId` no payload) e o backend
 * audita com `viaAdmin: true`.
 */
export default function AdminScannerPage() {
  const { event, loading: eventLoading } = useEventFromParams();
  const [companies, setCompanies] = useState<CompanyDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      try {
        const rows = await api<CompanyDto[]>(`/events/${event.id}/companies`);
        setCompanies(rows.filter((c) => c.ativo));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [event]);

  if (eventLoading) {
    return <p className="text-sm text-slate-500">Carregando evento...</p>;
  }
  if (!event) return null;
  if (!event.modules.includes('qr_scan')) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        O modulo <strong>QR Code + Scanner</strong> nao esta ativo neste evento.
        Ative-o em <strong>Modulos</strong> para usar o scanner geral.
      </div>
    );
  }
  if (err) return <ErrorBanner>{err}</ErrorBanner>;
  if (!companies) {
    return <p className="text-sm text-slate-500">Carregando empresas...</p>;
  }
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Nenhuma empresa ativa cadastrada neste evento. Cadastre pelo menos uma
        em <strong>Empresas</strong> antes de usar o scanner geral.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Scanner geral</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use este scanner para conceder qualquer carimbo do passaporte em nome
          de qualquer empresa cadastrada. Util quando voce precisa cobrir um
          stand sem responsavel ou auditar uma visita.
        </p>
      </div>

      <EventScanner
        eventId={event.id}
        eventName={event.nome}
        companyOptions={companies.map((c) => ({ id: c.id, nome: c.nome }))}
        enableOfflineQueue={false}
      />
    </div>
  );
}
