import type { MapLocationDto } from '@eventpass/shared';
import type { MouseEvent as ReactMouseEvent } from 'react';

export const PIN_DRAG_PX = 8;

/** Limiar clique vs arraste em shapes no editor. */
export function handleEditorShapePointerDown(
  e: ReactMouseEvent<Element>,
  loc: MapLocationDto,
  onSelect: ((l: MapLocationDto | null) => void) | undefined,
  onStartDrag: (id: string) => void,
) {
  e.stopPropagation();
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  let dragStarted = false;

  const onMove = (ev: globalThis.MouseEvent) => {
    if (dragStarted) return;
    if (Math.hypot(ev.clientX - sx, ev.clientY - sy) >= PIN_DRAG_PX) {
      dragStarted = true;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      onStartDrag(loc.id);
    }
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (!dragStarted) onSelect?.(loc);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
