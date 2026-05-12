'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { clsx } from 'clsx';
import { api, ApiError } from '../lib/api';
import {
  countScans,
  enqueueScan,
  listScans,
  removeScan,
} from '../lib/scan-queue';
import { Button, ErrorBanner } from './form';

/**
 * Scanner de QR Code unico, usado tanto pela empresa (`/empresa`) quanto pelo
 * admin (`/admin/eventos/[id]/scanner`). Centraliza:
 *
 * - 3 camadas de lock anti-duplicidade: pausa global pos-accepted (1.5s),
 *   lock por TOKEN (3s) e lock por STUDENT (15s, decodificado do JWT no
 *   client SEM verificar assinatura — verificacao real continua no backend).
 * - Fila offline em IndexedDB (idempotente por clientUuid) — opcional.
 * - Vibracao distinta por status (accepted/duplicate/rejected).
 * - Overlay verde de "Carimbo concedido" sobre o video apos cada accepted.
 *
 * Empresa: sem `companyOptions` nem `actAsCompanyId` — usa a company do user
 * logado (resolvida no backend via CompanyResponsible).
 *
 * Admin: passa `companyOptions` (todas as empresas do evento) e usa o select
 * pra escolher uma; o id selecionado vai em `actAsCompanyId` no payload de
 * scan e o backend audita com `viaAdmin: true`.
 */

export interface EventScannerStamp {
  id: string;
  titulo: string;
  descricao?: string | null;
  ordem: number;
  /**
   * Lista de empresas autorizadas a conceder este stamp (RN02 N:M).
   * Vazia = qualquer empresa do evento pode.
   */
  authorizedCompanyIds: string[];
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
  companyNome?: string;
}

interface EventScannerProps {
  eventId: string;
  /** Cabecalho do scanner. */
  eventName: string;
  /**
   * Lista de empresas para o operador escolher antes do scan. Quando
   * fornecida (caminho admin), o componente exibe um select de empresa e
   * envia o id selecionado em `actAsCompanyId` no payload.
   */
  companyOptions?: Array<{ id: string; nome: string }>;
  /**
   * Habilita fila offline em IndexedDB + flush automatico ao voltar online.
   * Default: true (empresa). Admin desliga porque tipicamente esta com rede
   * estavel no balcao da organizacao.
   */
  enableOfflineQueue?: boolean;
}

const STUDENT_LOCK_MS = 15_000;
const PAUSE_AFTER_SUCCESS_MS = 1500;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function EventScanner({
  eventId,
  eventName,
  companyOptions,
  enableOfflineQueue = true,
}: EventScannerProps) {
  const online = useOnline();
  const adminMode = !!companyOptions;

  const [stamps, setStamps] = useState<EventScannerStamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>(
    companyOptions?.[0]?.id ?? '',
  );
  const [scanning, setScanning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastResult, setLastResult] = useState<ScanLog | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [queued, setQueued] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockRef = useRef<Map<string, number>>(new Map());
  const studentLockRef = useRef<Map<string, number>>(new Map());
  const pausedUntilRef = useRef<number>(0);

  // Carrega stamps que o usuario logado pode conceder.
  useEffect(() => {
    void (async () => {
      try {
        const rows = await api<EventScannerStamp[]>(
          `/events/${eventId}/scan/grantable-stamps`,
        );
        setStamps(rows);
        setSelectedStamp((prev) => prev || rows[0]?.id || '');
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [eventId]);

  // Sincroniza company default quando companyOptions muda.
  useEffect(() => {
    if (companyOptions && companyOptions.length > 0 && !selectedCompany) {
      setSelectedCompany(companyOptions[0].id);
    }
  }, [companyOptions, selectedCompany]);

  // Refresh contador da fila offline.
  const refreshQueue = useCallback(async () => {
    if (!enableOfflineQueue) return;
    setQueued(await countScans(eventId));
  }, [eventId, enableOfflineQueue]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const flushQueue = useCallback(async () => {
    if (!enableOfflineQueue || !online) return;
    const items = await listScans(eventId);
    if (items.length === 0) return;
    try {
      await api(`/events/${eventId}/scan/sync`, {
        method: 'POST',
        body: {
          items: items.map(({ storedAt: _s, eventId: _e, ...rest }) => rest),
        },
      });
      for (const it of items) await removeScan(it.clientUuid);
      await refreshQueue();
    } catch (e) {
      console.warn('Falha no flush offline', e);
    }
  }, [eventId, online, enableOfflineQueue, refreshQueue]);

  useEffect(() => {
    if (online && enableOfflineQueue) void flushQueue();
  }, [online, enableOfflineQueue, flushQueue]);

  // RN02 visual: stamp restrito que NAO inclui a empresa selecionada (admin).
  const stampSelectedObj = stamps.find((s) => s.id === selectedStamp);
  const stampHasRestriction = !!stampSelectedObj && stampSelectedObj.authorizedCompanyIds.length > 0;
  const stampInvalidForCompany =
    adminMode &&
    stampHasRestriction &&
    !stampSelectedObj!.authorizedCompanyIds.includes(selectedCompany);

  const handleDecoded = useCallback(
    async (token: string) => {
      if (!eventId || !selectedStamp) return;
      if (adminMode && !selectedCompany) return;
      const now = Date.now();

      // 1) pausa global apos accepted
      if (now < pausedUntilRef.current) return;

      // 2) lock por TOKEN (3s)
      const lastForToken = lockRef.current.get(token);
      if (lastForToken && now - lastForToken < 3000) return;
      lockRef.current.set(token, now);

      // 3) lock por STUDENT (15s) — silencioso
      const studentId = decodeJwtSub(token);
      if (studentId) {
        const lastForStudent = studentLockRef.current.get(studentId);
        if (lastForStudent && now - lastForStudent < STUDENT_LOCK_MS) return;
      }

      const stamp = stamps.find((s) => s.id === selectedStamp);
      const stampTitulo = stamp?.titulo ?? 'Carimbo';
      const companyNome = adminMode
        ? companyOptions?.find((c) => c.id === selectedCompany)?.nome
        : undefined;

      const payload = {
        token,
        stampConfigId: selectedStamp,
        clientUuid: uuid(),
        clientTimestamp: new Date().toISOString(),
        ...(adminMode ? { actAsCompanyId: selectedCompany } : {}),
      };

      if (!online && enableOfflineQueue) {
        await enqueueScan(eventId, payload);
        const log: ScanLog = {
          id: payload.clientUuid,
          timestamp: payload.clientTimestamp,
          status: 'queued',
          message: 'Sem internet - salvo para sincronizar depois',
          stampTitulo,
          companyNome,
        };
        setLastResult(log);
        setLogs((l) => [log, ...l].slice(0, 30));
        if (studentId) studentLockRef.current.set(studentId, now);
        await refreshQueue();
        return;
      }

      try {
        const r = await api<ScanResp>(`/events/${eventId}/scan`, {
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
          companyNome,
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
        if (enableOfflineQueue && !navigator.onLine) {
          await enqueueScan(eventId, payload);
          await refreshQueue();
        }
        const log: ScanLog = {
          id: payload.clientUuid,
          timestamp: payload.clientTimestamp,
          status: 'error',
          message: msg,
          stampTitulo,
          companyNome,
        };
        setLastResult(log);
        setLogs((l) => [log, ...l].slice(0, 30));
      }
    },
    [
      eventId,
      selectedStamp,
      selectedCompany,
      stamps,
      adminMode,
      companyOptions,
      online,
      enableOfflineQueue,
      refreshQueue,
    ],
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
        (result) => {
          if (result) void handleDecoded(result.getText());
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

  return (
    <div className="flex flex-col gap-4">
      {/* Header com evento + status online */}
      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Evento</p>
          <p className="text-sm font-semibold text-slate-900">{eventName}</p>
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

      {/* Banner de fila offline (somente empresa) */}
      {enableOfflineQueue && queued > 0 && (
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

      {/* Select de empresa (somente admin) */}
      {adminMode && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label
            htmlFor="event-scanner-company"
            className="text-xs uppercase tracking-wide text-slate-500"
          >
            Concedendo em nome de
          </label>
          <select
            id="event-scanner-company"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="" disabled>
              Selecione uma empresa
            </option>
            {companyOptions!.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Select de stamp */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Carimbo a conceder</p>
        {stamps.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {adminMode
              ? 'Nenhum carimbo cadastrado neste evento.'
              : 'Nenhum carimbo disponivel para sua empresa neste evento.'}
          </p>
        ) : adminMode ? (
          // Admin: select com restritos desabilitados quando incompativel
          <select
            value={selectedStamp}
            onChange={(e) => setSelectedStamp(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="" disabled>
              Selecione um carimbo
            </option>
            {stamps.map((s) => {
              const restricted = s.authorizedCompanyIds.length > 0;
              const allowed =
                !restricted || s.authorizedCompanyIds.includes(selectedCompany);
              const label = !restricted
                ? s.titulo
                : allowed
                  ? `${s.titulo} (restrito — voce pode)`
                  : `${s.titulo} (restrito a outra empresa)`;
              return (
                <option key={s.id} value={s.id} disabled={!allowed}>
                  {label}
                </option>
              );
            })}
          </select>
        ) : (
          // Empresa: pills clickaveis
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
        {stampInvalidForCompany && (
          <p className="mt-2 text-xs text-amber-700">
            Este carimbo so pode ser concedido pela empresa autorizada (RN02).
            Selecione outra empresa ou outro carimbo.
          </p>
        )}
      </div>

      {/* Video do scanner */}
      <div className="relative overflow-hidden rounded-xl bg-black shadow-sm">
        <video
          ref={videoRef}
          aria-label="Scanner de QR Code do participante"
          className={clsx('aspect-square w-full object-cover', !scanning && 'hidden')}
          muted
          playsInline
        />
        {!scanning && (
          <div
            role="status"
            aria-label="Camera desligada"
            className="flex aspect-square items-center justify-center bg-slate-900 text-slate-400"
          >
            Camera desligada
          </div>
        )}
        {scanning && paused && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/85 text-white"
          >
            <span className="text-6xl font-bold leading-none">✓</span>
            <span className="text-sm font-semibold uppercase tracking-wide">
              Carimbo concedido
            </span>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="grid grid-cols-2 gap-2">
        {scanning ? (
          <Button variant="danger" onClick={stopCamera} className="col-span-2">
            Parar scanner
          </Button>
        ) : (
          <Button
            onClick={() => void startCamera()}
            disabled={
              !selectedStamp ||
              stamps.length === 0 ||
              stampInvalidForCompany ||
              (adminMode && !selectedCompany)
            }
            className="col-span-2"
          >
            Ligar camera
          </Button>
        )}
      </div>

      {/* Banner do ultimo scan */}
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
            {lastResult.companyNome ? ` / ${lastResult.companyNome}` : ''}
          </p>
          <p className="mt-1 text-lg font-bold">
            {lastResult.status === 'accepted' && '✓ Aceito'}
            {lastResult.status === 'duplicate' && '◉ Ja registrado'}
            {lastResult.status === 'queued' && '☁ Em fila'}
            {lastResult.status === 'rejected' && '✕ Recusado'}
            {lastResult.status === 'error' && '! Erro'}
          </p>
          <p className="text-sm">{lastResult.message}</p>
        </div>
      )}

      {/* Historico da sessao */}
      {logs.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Historico da sessao
          </p>
          <ul className="flex flex-col divide-y divide-slate-100 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span className="truncate text-slate-700">
                  {l.stampTitulo}
                  {l.companyNome && (
                    <span className="text-slate-500"> · {l.companyNome}</span>
                  )}
                </span>
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
