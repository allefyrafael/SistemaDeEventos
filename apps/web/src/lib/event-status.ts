import type { EventStatus } from '@eventpass/shared';

/**
 * Rotulos em pt-BR para cada status de evento (UI). Centralizado pra
 * evitar duplicacao entre listagem de eventos e contexto interno do evento.
 */
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  RUNNING: 'Em andamento',
  CLOSED: 'Encerrado',
  ARCHIVED: 'Arquivado',
};

/** Classes Tailwind por status (bg + texto), aplicadas em badges. */
export const EVENT_STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-slate-200 text-slate-500',
};
