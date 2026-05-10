'use client';

import { useEffect, useState } from 'react';
import type { EventDetail } from '@eventpass/shared';
import { api } from './api';

const KEY = 'eventpass.activeEvent';

/** Evento escolhido para o participante (mesmo contrato `GET /events`). */
export type ActiveEvent = EventDetail;

/**
 * Hook que determina o evento "ativo" do usuario logado.
 * Lista inclui `modules` para exibir abas condicionalmente (mapa, etc.).
 */
export function useActiveEvent() {
  const [event, setEvent] = useState<ActiveEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cached =
          typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Partial<ActiveEvent>;
            if (parsed?.id && Array.isArray(parsed.modules)) {
              setEvent(parsed as ActiveEvent);
            }
          } catch {
            // ignore
          }
        }
        const rows = await api<ActiveEvent[]>('/events');
        if (cancelled) return;
        const chosen = rows[0] ?? null;
        setEvent(chosen);
        if (chosen && typeof window !== 'undefined') {
          localStorage.setItem(KEY, JSON.stringify(chosen));
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { event, loading, error, setEvent };
}
