'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { clsx } from 'clsx';
import type { CompanyDto } from '@eventpass/shared';
import { api, ApiError } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { Button, ErrorBanner } from '../../../../../components/form';

/**
 * Scanner geral do organizador. O admin escolhe (1) qual empresa esta
 * representando e (2) qual carimbo conceder, e usa a camera para ler o QR
 * de qualquer participante. Reaproveita a mesma logica de lock + pause
 * usada em /empresa pra evitar leituras duplicadas.
 *
 * O backend valida RN02 (so empresa autorizada pode carimbar o item) e
 * audita o scan com `viaAdmin: true` na metadata.
 */

interface Stamp {
  id: string;
  titulo: string;
  ordem: number;
  entidadeAutorizadaId: string | null;
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
  status: 'accepted' | 'duplicate' | 'rejected' | 'error';
  message: string;
  stampTitulo: string;
  companyNome: string;
}

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

const STUDENT_LOCK_MS = 15_000;
const PAUSE_AFTER_SUCCESS_MS = 1500;

export default function AdminScannerPage() {
  const { event, loading: eventLoading } = useEventFromParams();
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [stampId, setStampId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastResult, setLastResult] = useState<ScanLog | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockRef = useRef<Map<string, number>>(new Map());
  const studentLockRef = useRef<Map<string, number>>(new Map());
  const pausedUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      try {
        const [companyRows, stampRows] = await Promise.all([
          api<CompanyDto[]>(`/events/${event.id}/companies`),
          api<Stamp[]>(`/events/${event.id}/scan/grantable-stamps`),
        ]);
        const ativas = companyRows.filter((c) => c.ativo);
        setCompanies(ativas);
        setStamps(stampRows);
        if (ativas.length > 0 && !companyId) setCompanyId(ativas[0].id);
        if (stampRows.length > 0 && !stampId) setStampId(stampRows[0].id);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [event, companyId, stampId]);

  // Stamps com entidadeAutorizada filtram quais empresas podem concede-los.
  // Mostramos isso na UI pra evitar erro no submit.
  const stampSelected = stamps.find((s) => s.id === stampId);
  const stampLocksToCompany = stampSelected?.entidadeAutorizadaId ?? null;
  const stampInvalidForCompany =
    stampLocksToCompany !== null && stampLocksToCompany !== companyId;

  const handleDecoded = useCallback(
    async (token: string) => {
      if (!event || !stampId || !companyId) return;
      const now = Date.now();

      if (now < pausedUntilRef.current) return;

      const lastForToken = lockRef.current.get(token);
      if (lastForToken && now - lastForToken < 3000) return;
      lockRef.current.set(token, now);

      const studentId = decodeJwtSub(token);
      if (studentId) {
        const lastForStudent = studentLockRef.current.get(studentId);
        if (lastForStudent && now - lastForStudent < STUDENT_LOCK_MS) return;
      }

      const stamp = stamps.find((s) => s.id === stampId);
      const company = companies.find((c) => c.id === companyId);
      const stampTitulo = stamp?.titulo ?? 'Carimbo';
      const companyNome = company?.nome ?? 'Empresa';

      const payload = {
        token,
        stampConfigId: stampId,
        clientUuid: uuid(),
        clientTimestamp: new Date().toISOString(),
        actAsCompanyId: companyId,
      };

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
    [event, stampId, companyId, stamps, companies],
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

  if (eventLoading) return <p className="text-sm text-slate-500">Carregando evento...</p>;
  if (!event) return null;
  if (!event.modules.includes('qr_scan')) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        O modulo <strong>QR Code + Scanner</strong> nao esta ativo neste evento.
        Ative-o em <strong>Modulos</strong> para usar o scanner geral.
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

      {err && <ErrorBanner>{err}</ErrorBanner>}

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Concedendo em nome de
          </label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="" disabled>
              Selecione uma empresa
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Carimbo a conceder
          </label>
          <select
            value={stampId}
            onChange={(e) => setStampId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="" disabled>
              Selecione um carimbo
            </option>
            {stamps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titulo}
                {s.entidadeAutorizadaId ? ' (exclusivo)' : ''}
              </option>
            ))}
          </select>
          {stampInvalidForCompany && (
            <p className="mt-1 text-xs text-amber-700">
              Este carimbo so pode ser concedido pela empresa autorizada (RN02).
              Selecione outra empresa ou outro carimbo.
            </p>
          )}
        </div>
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
            <span className="text-sm font-semibold uppercase tracking-wide">
              Carimbo concedido
            </span>
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
            disabled={
              !companyId ||
              !stampId ||
              companies.length === 0 ||
              stamps.length === 0 ||
              stampInvalidForCompany
            }
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
            (lastResult.status === 'rejected' || lastResult.status === 'error') &&
              'bg-red-50 text-red-900',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Ultimo scan - {lastResult.stampTitulo} / {lastResult.companyNome}
          </p>
          <p className="mt-1 text-lg font-bold">
            {lastResult.status === 'accepted' && '✓ Aceito'}
            {lastResult.status === 'duplicate' && '◉ Ja registrado'}
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
                <span className="truncate text-slate-700">
                  {l.stampTitulo} · <span className="text-slate-500">{l.companyNome}</span>
                </span>
                <span
                  className={clsx(
                    'ml-2 flex-shrink-0 text-xs font-semibold',
                    l.status === 'accepted' && 'text-emerald-600',
                    l.status === 'duplicate' && 'text-slate-500',
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
