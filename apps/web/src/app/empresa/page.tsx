'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { clsx } from 'clsx';
import { api, ApiError } from '../../lib/api';
import { useActiveEvent } from '../../lib/use-active-event';
import { enqueueScan, countScans, listScans, removeScan } from '../../lib/scan-queue';
import { Button, ErrorBanner, SuccessBanner } from '../../components/form';

interface Stamp {
  id: string;
  titulo: string;
  ordem: number;
  obrigatorio: boolean;
}

interface ScanResp {
  status: 'accepted' | 'duplicate' | 'rejected';
  reason?: string;
  progressId?: string;
  mustAnswerFeedback: boolean;
}

interface ScanLog {
  id: string;
  timestamp: string;
  status: 'accepted' | 'duplicate' | 'rejected' | 'queued' | 'error';
  message: string;
  stampTitulo: string;
}

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    function up() {
      setOnline(true);
    }
    function down() {
      setOnline(false);
    }
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Decodifica o `sub` (studentId) do JWT do QR sem verificar assinatura.
// Usado APENAS para deduplicar leituras do mesmo aluno no client; a verificacao
// real continua no backend.
function decodeJwtSub(token: string): string | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// O ZXing dispara o callback varias vezes em frames sucessivos quando o QR
// esta bem alinhado, e o token JWT do aluno rotaciona a cada ~20s — entao um
// lock por TOKEN nao basta. Usamos um lock por STUDENT (15s) + uma pausa
// global apos cada accepted (1.5s) pra evitar leituras duplas indesejadas.
const STUDENT_LOCK_MS = 15_000;
const PAUSE_AFTER_SUCCESS_MS = 1500;

export default function CompanyScannerPage() {
  const { event } = useActiveEvent();
  const online = useOnline();
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanLog | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [queued, setQueued] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockRef = useRef<Map<string, number>>(new Map());
  const studentLockRef = useRef<Map<string, number>>(new Map());
  const pausedUntilRef = useRef<number>(0);

  const refreshQueue = useCallback(async () => {
    if (!event) return;
    setQueued(await countScans(event.id));
  }, [event]);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      try {
        const rows = await api<Stamp[]>(`/events/${event.id}/scan/grantable-stamps`);
        setStamps(rows);
        if (rows.length > 0 && !selectedStamp) setSelectedStamp(rows[0].id);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    void refreshQueue();
  }, [event, selectedStamp, refreshQueue]);

  const flushQueue = useCallback(async () => {
    if (!event || !online) return;
    const items = await listScans(event.id);
    if (items.length === 0) return;
    try {
      await api(`/events/${event.id}/scan/sync`, {
        method: 'POST',
        body: {
          items: items.map(({ storedAt: _storedAt, eventId: _eventId, ...rest }) => rest),
        },
      });
      for (const it of items) await removeScan(it.clientUuid);
      await refreshQueue();
    } catch (e) {
      console.warn('Falha no flush offline', e);
    }
  }, [event, online, refreshQueue]);

  useEffect(() => {
    if (online) void flushQueue();
  }, [online, flushQueue]);

  const handleDecoded = useCallback(
    async (token: string) => {
      if (!event || !selectedStamp) return;
      const now = Date.now();

      // 1) pausa global apos accepted (evita beep duplo no mesmo frame)
      if (now < pausedUntilRef.current) return;

      // 2) lock por TOKEN (3s) — pega leituras do mesmo JWT em frames sucessivos
      const lastForToken = lockRef.current.get(token);
      if (lastForToken && now - lastForToken < 3000) return;
      lockRef.current.set(token, now);

      // 3) lock por STUDENT (15s) — pega leituras do mesmo aluno mesmo apos
      // o token rotacionar. Silencioso: nao mostra alerta de duplicado.
      const studentId = decodeJwtSub(token);
      if (studentId) {
        const lastForStudent = studentLockRef.current.get(studentId);
        if (lastForStudent && now - lastForStudent < STUDENT_LOCK_MS) return;
      }

      const stamp = stamps.find((s) => s.id === selectedStamp);
      const stampTitulo = stamp?.titulo ?? 'Carimbo';

      const payload = {
        token,
        stampConfigId: selectedStamp,
        clientUuid: uuid(),
        clientTimestamp: new Date().toISOString(),
      };

      if (!online) {
        await enqueueScan(event.id, payload);
        const log: ScanLog = {
          id: payload.clientUuid,
          timestamp: payload.clientTimestamp,
          status: 'queued',
          message: 'Sem internet - salvo para sincronizar depois',
          stampTitulo,
        };
        setLastResult(log);
        setLogs((l) => [log, ...l].slice(0, 30));
        if (studentId) studentLockRef.current.set(studentId, now);
        await refreshQueue();
        return;
      }

      try {
        const r = await api<ScanResp>(`/events/${event.id}/scan`, {
          method: 'POST',
          body: payload,
        });
        const log: ScanLog = {
          id: payload.clientUuid,
          timestamp: payload.clientTimestamp,
          status: r.status,
          message:
            r.status === 'accepted'
              ? 'Carimbo concedido!'
              : r.status === 'duplicate'
                ? 'Aluno ja possui este carimbo'
                : r.reason ?? 'Recusado',
          stampTitulo,
        };
        setLastResult(log);
        setLogs((l) => [log, ...l].slice(0, 30));
        if (studentId && (r.status === 'accepted' || r.status === 'duplicate')) {
          studentLockRef.current.set(studentId, now);
        }
        if (r.status === 'accepted') {
          pausedUntilRef.current = now + PAUSE_AFTER_SUCCESS_MS;
          setPaused(true);
          window.setTimeout(() => setPaused(false), PAUSE_AFTER_SUCCESS_MS);
        }
        if (navigator.vibrate) {
          navigator.vibrate(
            r.status === 'accepted' ? 120 : r.status === 'duplicate' ? 40 : [60, 60, 60],
          );
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : (e as Error).message;
        // Em falha de rede persistimos no offline tambem
        if (!navigator.onLine) {
          await enqueueScan(event.id, payload);
          await refreshQueue();
        }
        const log: ScanLog = {
          id: payload.clientUuid,
          timestamp: payload.clientTimestamp,
          status: 'error',
          message: msg,
          stampTitulo,
        };
        setLastResult(log);
        setLogs((l) => [log, ...l].slice(0, 30));
      }
    },
    [event, selectedStamp, stamps, online, refreshQueue],
  );

  async function startCamera() {
    if (!videoRef.current) return;
    setErr(null);
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, controls) => {
          if (result) {
            void handleDecoded(result.getText()).finally(() => {
              // Continuamos scaneando; lock evita duplicatas
            });
            void controls;
          }
        },
      );
    } catch (e) {
      setErr('Nao foi possivel acessar a camera: ' + (e as Error).message);
      setScanning(false);
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => controlsRef.current?.stop(), []);

  if (!event) return <p className="text-slate-500">Carregando evento...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Evento</p>
          <p className="text-sm font-semibold text-slate-900">{event.nome}</p>
        </div>
        <span
          className={clsx(
            'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
            online ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800',
          )}
        >
          <span
            className={clsx(
              'h-2 w-2 rounded-full',
              online ? 'bg-emerald-500' : 'animate-pulse bg-amber-500',
            )}
          />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {queued > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{queued} scan(s) aguardando sincronizacao</span>
          <button
            type="button"
            onClick={() => void flushQueue()}
            disabled={!online}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Sincronizar agora
          </button>
        </div>
      )}

      {err && <ErrorBanner>{err}</ErrorBanner>}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Carimbo a conceder</p>
        {stamps.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum carimbo disponivel para sua empresa neste evento.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {stamps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStamp(s.id)}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition',
                  selectedStamp === s.id
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                {s.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black shadow-sm">
        <video
          ref={videoRef}
          className={clsx('aspect-square w-full object-cover', !scanning && 'hidden')}
          muted
          playsInline
        />
        {!scanning && (
          <div className="flex aspect-square items-center justify-center bg-slate-900 text-slate-400">
            Camera desligada
          </div>
        )}
        {scanning && paused && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/85 text-white">
            <span className="text-6xl font-bold leading-none">✓</span>
            <span className="text-sm font-semibold uppercase tracking-wide">Carimbo concedido</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {scanning ? (
          <Button variant="danger" onClick={stopCamera} className="col-span-2">
            Parar scanner
          </Button>
        ) : (
          <Button
            onClick={() => void startCamera()}
            disabled={!selectedStamp || stamps.length === 0}
            className="col-span-2"
          >
            Ligar camera
          </Button>
        )}
      </div>

      {lastResult && (
        <div
          className={clsx(
            'rounded-xl p-4 shadow-sm',
            lastResult.status === 'accepted' && 'bg-emerald-50 text-emerald-900',
            lastResult.status === 'duplicate' && 'bg-slate-100 text-slate-700',
            lastResult.status === 'queued' && 'bg-amber-50 text-amber-900',
            (lastResult.status === 'rejected' || lastResult.status === 'error') &&
              'bg-red-50 text-red-900',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Ultimo scan - {lastResult.stampTitulo}
          </p>
          <p className="mt-1 text-lg font-bold">
            {lastResult.status === 'accepted' && '✓ Aceito'}
            {lastResult.status === 'duplicate' && '◉ Duplicado'}
            {lastResult.status === 'queued' && '☁ Em fila'}
            {lastResult.status === 'rejected' && '✕ Recusado'}
            {lastResult.status === 'error' && '! Erro'}
          </p>
          <p className="text-sm">{lastResult.message}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Historico da sessao
          </p>
          <ul className="flex flex-col divide-y divide-slate-100 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span className="truncate text-slate-700">{l.stampTitulo}</span>
                <span
                  className={clsx(
                    'ml-2 flex-shrink-0 text-xs font-semibold',
                    l.status === 'accepted' && 'text-emerald-600',
                    l.status === 'duplicate' && 'text-slate-500',
                    l.status === 'queued' && 'text-amber-700',
                    (l.status === 'rejected' || l.status === 'error') && 'text-red-600',
                  )}
                >
                  {l.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
