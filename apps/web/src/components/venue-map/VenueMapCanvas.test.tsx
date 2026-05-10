import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VenueMapDto } from '@eventpass/shared';
import { VenueMapCanvas } from './VenueMapCanvas';

const emptyMap = (overrides: Partial<VenueMapDto> = {}): VenueMapDto => ({
  id: 'map-1',
  eventId: 'evt-1',
  titulo: 'Teste',
  backgroundUrl: null,
  viewportWidth: 1200,
  viewportHeight: 800,
  theme: {},
  locations: [],
  ...overrides,
});

describe('VenueMapCanvas', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra emptyHint no viewer quando nao ha pins', () => {
    render(
      <VenueMapCanvas
        data={emptyMap()}
        emptyHint="Nenhum ponto ainda"
      />,
    );
    expect(screen.getByText(/nenhum ponto ainda/i)).toBeInTheDocument();
  });

  it('em modo editor com ferramenta Colocar, clique no board chama onCanvasClick com %', () => {
    const onCanvasClick = vi.fn();
    render(
      <VenueMapCanvas
        data={emptyMap()}
        mode="editor"
        onCanvasClick={onCanvasClick}
      />,
    );

    const board = screen.getByTestId('venue-map-board');
    fireEvent.click(board, { clientX: 100, clientY: 50, bubbles: true });

    expect(onCanvasClick).toHaveBeenCalledTimes(1);
    expect(onCanvasClick).toHaveBeenCalledWith({ x: 50, y: 50 });
  });
});
