import { EventStatus } from '@prisma/client';
import { EventsService } from './events.service';
import type { PrismaService } from '../../core/prisma/prisma.service';

describe('EventsService', () => {
  describe('toDetail', () => {
    it('parseia config e devolve modulos normalizados', () => {
      const service = new EventsService({} as PrismaService);
      const detail = service.toDetail({
        id: '0194b2e0-7c3d-7b8a-9e1f-000000000001',
        nome: 'Feira',
        slug: 'feira',
        descricao: null,
        status: EventStatus.DRAFT,
        startsAt: new Date('2026-06-01T10:00:00.000Z'),
        endsAt: new Date('2026-06-02T18:00:00.000Z'),
        config: { modules: ['passport', 'venue_map'] },
      });

      expect(detail.modules).toEqual(['passport', 'venue_map']);
      expect(detail.startsAt).toBe('2026-06-01T10:00:00.000Z');
      expect(detail.config).toEqual({ modules: ['passport', 'venue_map'] });
    });

    it('aplica default de modules vazio quando config nao tem modules', () => {
      const service = new EventsService({} as PrismaService);
      const detail = service.toDetail({
        id: '0194b2e0-7c3d-7b8a-9e1f-000000000002',
        nome: 'X',
        slug: 'x',
        descricao: null,
        status: EventStatus.PUBLISHED,
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        endsAt: new Date('2026-01-02T00:00:00.000Z'),
        config: {},
      });
      expect(detail.modules).toEqual([]);
    });
  });
});
