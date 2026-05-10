'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'next/navigation';
import type { EventStatus, FeatureModule } from '@eventpass/shared';
import { api } from './api';

export interface EventContextData {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  modules: FeatureModule[];
  config: Record<string, unknown>;
}

export interface EventParamsContextValue {
  eventId: string | undefined;
  event: EventContextData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const EventParamsContext = createContext<EventParamsContextValue | null>(null);

/**
 * Carrega o evento UMA vez por montagem do layout e compartilha via Context.
 * Evita N chamadas GET /events/:id (429) quando varias paginas usam o hook.
 */
function useEventParamsState(): EventParamsContextValue {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const [event, setEvent] = useState<EventContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const row = await api<EventContextData>(`/events/${eventId}`);
        if (alive) setEvent(row);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eventId, reloadKey]);

  return useMemo(
    () => ({ eventId, event, loading, error, reload }),
    [eventId, event, loading, error, reload],
  );
}

export function EventParamsProvider({ children }: { children: ReactNode }) {
  const value = useEventParamsState();
  return createElement(EventParamsContext.Provider, { value }, children);
}

/**
 * Le o evento do Context (layout /admin/eventos/[eventId]).
 */
export function useEventFromParams(): EventParamsContextValue {
  const ctx = useContext(EventParamsContext);
  if (!ctx) {
    throw new Error('useEventFromParams deve ser usado dentro de EventParamsProvider');
  }
  return ctx;
}
