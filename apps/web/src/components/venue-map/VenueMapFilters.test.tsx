import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VenueMapFilters } from './VenueMapFilters';

describe('VenueMapFilters', () => {
  it('alterna kind ao clicar, limpa filtros e chama onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <VenueMapFilters
        activeKinds={[]}
        onChange={onChange}
        availableKinds={['POI', 'COMPANY_STAND']}
      />,
    );

    await user.click(screen.getByRole('button', { name: /stand de empresa/i }));
    expect(onChange).toHaveBeenCalledWith(['COMPANY_STAND']);

    onChange.mockClear();
    rerender(
      <VenueMapFilters
        activeKinds={['COMPANY_STAND']}
        onChange={onChange}
        availableKinds={['POI', 'COMPANY_STAND']}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^limpar$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
