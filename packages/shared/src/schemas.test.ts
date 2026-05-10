import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FEATURE_MODULES, eventConfigSchema } from './events';
import { eventCreateSchema, eventDetailSchema } from './events-crud';
import {
  activityCreateSchema,
  mapLocationCreateSchema,
  venueMapConfigSchema,
} from './venue-map';

describe('FEATURE_MODULES e eventConfigSchema', () => {
  it('rejeita strings que nao estao no catalogo', () => {
    const schema = z.array(z.enum(FEATURE_MODULES));
    expect(() => schema.parse(['passport', 'not_a_module'])).toThrow();
  });

  it('aceita modules vazio no config', () => {
    expect(eventConfigSchema.parse({})).toEqual(
      expect.objectContaining({ modules: [] }),
    );
  });

  it('parseia modulos conhecidos', () => {
    const parsed = eventConfigSchema.parse({
      modules: ['passport', 'venue_map'],
    });
    expect(parsed.modules).toEqual(['passport', 'venue_map']);
  });
});

describe('eventDetailSchema', () => {
  const valid = {
    id: '0194b2e0-7c3d-7b8a-9e1f-000000000001',
    nome: 'Feira',
    slug: 'feira-2026',
    descricao: null,
    status: 'DRAFT' as const,
    startsAt: '2026-06-01T10:00:00.000Z',
    endsAt: '2026-06-02T18:00:00.000Z',
    modules: [] as (typeof FEATURE_MODULES)[number][],
    config: {},
  };

  it('aceita payload completo', () => {
    expect(() => eventDetailSchema.parse(valid)).not.toThrow();
  });

  it('rejeita datetime ISO invalido', () => {
    expect(() =>
      eventDetailSchema.parse({ ...valid, startsAt: 'not-a-date' }),
    ).toThrow();
  });
});

describe('eventCreateSchema', () => {
  it('rejeita slug com maiusculas', () => {
    expect(() =>
      eventCreateSchema.parse({
        nome: 'Teste',
        slug: 'Invalid',
        startsAt: '2026-06-01T10:00:00.000Z',
        endsAt: '2026-06-02T18:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('venueMapConfigSchema', () => {
  it('aplica defaults do viewport', () => {
    const parsed = venueMapConfigSchema.parse({});
    expect(parsed.viewportWidth).toBe(1200);
    expect(parsed.viewportHeight).toBe(800);
  });

  it('rejeita URL invalida para fundo', () => {
    expect(() =>
      venueMapConfigSchema.parse({ backgroundUrl: 'not-a-url' }),
    ).toThrow();
  });
});

describe('mapLocationCreateSchema', () => {
  it('rejeita cor hex com tamanho errado', () => {
    expect(() =>
      mapLocationCreateSchema.parse({
        kind: 'POI',
        titulo: 'Entrada',
        x: 10,
        y: 20,
        corHex: '#FFF',
      }),
    ).toThrow();
  });

  it('aceita location valida', () => {
    const parsed = mapLocationCreateSchema.parse({
      kind: 'COMPANY_STAND',
      titulo: 'Stand A',
      x: 50,
      y: 50,
    });
    expect(parsed.kind).toBe('COMPANY_STAND');
  });
});

describe('activityCreateSchema', () => {
  it('rejeita endsAt antes de startsAt', () => {
    expect(() =>
      activityCreateSchema.parse({
        titulo: 'Palestra',
        startsAt: '2026-06-01T14:00:00.000Z',
        endsAt: '2026-06-01T12:00:00.000Z',
      }),
    ).toThrow();
  });
});
