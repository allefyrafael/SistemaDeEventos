'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useActiveEvent } from '../../lib/use-active-event';

interface QrResp {
  token: string;
  expiresAt: string;
  rotateInSeconds: number;
}

export default function StudentHomePage() {
  const { event, loading } = useActiveEvent();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qr, setQr] = useState<QrResp | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const r = await api<QrResp>(`/events/${event!.id}/qr/token`, { method: 'POST' });
        if (!alive) return;
        setQr(r);
        setCountdown(Math.floor((new Date(r.expiresAt).getTime() - Date.now()) / 1000));
      } catch (e) {
        setErr((e as Error).message);
      }
    }

    void refresh();
    timer = setInterval(() => void refresh(), (event ? 20 : 20) * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [event]);

  useEffect(() => {
    const int = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (!qr || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, qr.token, {
      width: 280,
      margin: 1,
      color: { dark: '#0057A3', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
  }, [qr]);

  if (loading) return <p className="text-slate-500">Carregando evento...</p>;
  if (!event) {
    return (
      <div className="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
        Voce ainda nao esta inscrito em nenhum evento.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full rounded-xl bg-gradient-to-br from-brand-primary to-blue-700 px-5 py-4 text-white shadow-md">
        <p className="text-xs uppercase tracking-wide opacity-80">Evento</p>
        <h2 className="text-lg font-bold">{event.nome}</h2>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Apresente este QR Code na empresa para receber o carimbo.
        </p>
        {err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <canvas ref={canvasRef} className="rounded-lg" />
        )}
        <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Expira em {countdown}s
        </div>
        <p className="max-w-xs text-center text-xs text-slate-500">
          O codigo e unico e expira rapidamente para evitar fraudes. Nao tire print: apos o uso, o QR e invalidado.
        </p>
      </div>
    </div>
  );
}
