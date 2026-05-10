'use client';

import { useState } from 'react';
import { apiDownloadBlob } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import {
  Button,
  ErrorBanner,
  SuccessBanner,
} from '../../../../../components/form';

export default function EventExportsPage() {
  const { event } = useEventFromParams();
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    if (!event) return;
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const blob = await apiDownloadBlob(`/events/${event.id}/exports/concludentes.csv`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `concludentes-${event.slug}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setOk('CSV gerado com sucesso.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!event) return null;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Exportar dados</h2>
        <p className="text-sm text-slate-500">
          Relatorios em CSV para consumo em Excel e ferramentas externas.
        </p>
      </div>

      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Concludentes (RF10)</h3>
        <p className="mt-1 text-sm text-slate-600">
          Lista dos participantes que completaram 100% dos carimbos obrigatorios (RN03). Util para
          gerar certificados em lote ou comprovante de presenca.
        </p>
        <div className="mt-4">
          <Button onClick={download} disabled={loading}>
            {loading ? 'Gerando...' : 'Baixar CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}
