'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';
import { listScans, removeScan } from '../../../lib/scan-queue';
import { Button, SuccessBanner, ErrorBanner } from '../../../components/form';

interface Row {
  clientUuid: string;
  token: string;
  stampConfigId: string;
  clientTimestamp: string;
  storedAt: string;
}

export default function QueuePage() {
  const { event } = useActiveEvent();
  const [rows, setRows] = useState<Row[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!event) return;
    const data = await listScans(event.id);
    setRows(data as Row[]);
  }, [event]);

  useEffect(() => {
    void load();
  }, [load]);

  async function flush() {
    if (!event || rows.length === 0) return;
    setSyncing(true);
    setOk(null);
    setErr(null);
    try {
      await api(`/events/${event.id}/scan/sync`, {
        method: 'POST',
        body: {
          items: rows.map(({ clientUuid, token, stampConfigId, clientTimestamp }) => ({
            clientUuid,
            token,
            stampConfigId,
            clientTimestamp,
          })),
        },
      });
      for (const r of rows) await removeScan(r.clientUuid);
      setOk(`${rows.length} scan(s) sincronizados.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function drop(id: string) {
    if (!confirm('Descartar este scan? Ele NAO sera enviado e nao da pra recuperar depois.')) {
      return;
    }
    await removeScan(id);
    await load();
  }

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Scans capturados enquanto o dispositivo esta sem conexao. Quando voltar online eles sao
        enviados automaticamente. Se algum expirou voce pode descartar manualmente.
      </p>
      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      {rows.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center text-slate-500 shadow-sm">
          Nenhum scan pendente.
        </div>
      ) : (
        <>
          <Button onClick={() => void flush()} disabled={syncing}>
            {syncing ? 'Sincronizando...' : `Sincronizar ${rows.length} scan(s)`}
          </Button>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.clientUuid}
                className="flex items-center justify-between rounded-lg bg-white p-3 text-sm shadow-sm"
              >
                <div>
                  <p className="font-mono text-xs text-slate-400">
                    {r.clientUuid.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-slate-600">
                    {new Date(r.clientTimestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void drop(r.clientUuid)}
                  className="text-xs text-red-600"
                >
                  Descartar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
