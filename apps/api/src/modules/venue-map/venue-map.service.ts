import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MapLocationKind, Prisma } from '@prisma/client';
import type {
  ActivityCreateInput,
  ActivityDto,
  ActivityUpdateInput,
  MapLocationCreateInput,
  MapLocationDto,
  MapLocationKind as SharedKind,
  VenueMapConfigInput,
  VenueMapDto,
} from '@eventpass/shared';

import { PrismaService } from '../../core/prisma/prisma.service';

type ActivityRow = Prisma.ActivityGetPayload<{
  include: { registrations: { select: { userId: true } } };
}>;

type LocationRow = Prisma.MapLocationGetPayload<{
  include: {
    company: { select: { id: true; nome: true; slug: true } };
    activities: {
      include: { registrations: { select: { userId: true } } };
    };
  };
}>;

@Injectable()
export class VenueMapService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------
  // Map container
  // -----------------------------------------------------------

  async getOrCreate(eventId: string): Promise<VenueMapDto> {
    const existing = await this.prisma.venueMap.findUnique({
      where: { eventId },
    });
    const row =
      existing ??
      (await this.prisma.venueMap.create({
        data: { eventId },
      }));
    return this.buildDto(row.id, null);
  }

  async getForViewer(eventId: string, viewerUserId: string | null): Promise<VenueMapDto> {
    const existing = await this.prisma.venueMap.findUnique({ where: { eventId } });
    if (!existing) {
      // participante abre antes do admin configurar: retorna mapa vazio
      const placeholder = await this.prisma.venueMap.create({ data: { eventId } });
      return this.buildDto(placeholder.id, viewerUserId);
    }
    return this.buildDto(existing.id, viewerUserId);
  }

  async updateConfig(eventId: string, input: VenueMapConfigInput): Promise<VenueMapDto> {
    const map = await this.prisma.venueMap.upsert({
      where: { eventId },
      create: {
        eventId,
        titulo: input.titulo ?? null,
        backgroundUrl: input.backgroundUrl ?? null,
        viewportWidth: input.viewportWidth ?? 1200,
        viewportHeight: input.viewportHeight ?? 800,
        theme: (input.theme ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        titulo: input.titulo === undefined ? undefined : input.titulo,
        backgroundUrl:
          input.backgroundUrl === undefined ? undefined : input.backgroundUrl,
        viewportWidth: input.viewportWidth ?? undefined,
        viewportHeight: input.viewportHeight ?? undefined,
        theme:
          input.theme === undefined
            ? undefined
            : (input.theme as Prisma.InputJsonValue),
      },
    });
    return this.buildDto(map.id, null);
  }

  // -----------------------------------------------------------
  // Locations
  // -----------------------------------------------------------

  async createLocation(
    eventId: string,
    input: MapLocationCreateInput,
  ): Promise<MapLocationDto> {
    const map = await this.ensureMap(eventId);

    if (input.kind === 'COMPANY_STAND') {
      if (!input.companyId) {
        throw new BadRequestException(
          'kind=COMPANY_STAND exige companyId vinculado',
        );
      }
      const company = await this.prisma.company.findFirst({
        where: { id: input.companyId, eventId },
        select: { id: true },
      });
      if (!company) {
        throw new BadRequestException('Empresa nao pertence a este evento');
      }
    }

    const created = await this.prisma.mapLocation.create({
      data: {
        venueMapId: map.id,
        eventId,
        kind: input.kind as MapLocationKind,
        companyId: input.companyId ?? null,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        corHex: input.corHex ?? null,
        icone: input.icone ?? null,
        x: input.x,
        y: input.y,
        larguraPct: input.larguraPct ?? null,
        alturaPct: input.alturaPct ?? null,
        rotacaoDeg: input.rotacaoDeg ?? 0,
        ordem: input.ordem ?? 0,
      },
      include: this.locationInclude(),
    });
    return this.toLocationDto(created, null);
  }

  async updateLocation(
    eventId: string,
    locationId: string,
    input: Partial<MapLocationCreateInput>,
  ): Promise<MapLocationDto> {
    const existing = await this.prisma.mapLocation.findFirst({
      where: { id: locationId, eventId },
    });
    if (!existing) throw new NotFoundException('Location nao encontrada');

    if (input.kind === 'COMPANY_STAND' && input.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: input.companyId, eventId },
        select: { id: true },
      });
      if (!company) {
        throw new BadRequestException('Empresa nao pertence a este evento');
      }
    }

    const updated = await this.prisma.mapLocation.update({
      where: { id: locationId },
      data: {
        kind: input.kind ? (input.kind as MapLocationKind) : undefined,
        companyId: input.companyId === undefined ? undefined : input.companyId,
        titulo: input.titulo ?? undefined,
        descricao: input.descricao === undefined ? undefined : input.descricao,
        corHex: input.corHex === undefined ? undefined : input.corHex,
        icone: input.icone === undefined ? undefined : input.icone,
        x: input.x ?? undefined,
        y: input.y ?? undefined,
        larguraPct: input.larguraPct === undefined ? undefined : input.larguraPct,
        alturaPct: input.alturaPct === undefined ? undefined : input.alturaPct,
        rotacaoDeg: input.rotacaoDeg ?? undefined,
        ordem: input.ordem ?? undefined,
      },
      include: this.locationInclude(),
    });
    return this.toLocationDto(updated, null);
  }

  async deleteLocation(eventId: string, locationId: string): Promise<void> {
    const existing = await this.prisma.mapLocation.findFirst({
      where: { id: locationId, eventId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Location nao encontrada');
    await this.prisma.mapLocation.delete({ where: { id: locationId } });
  }

  // -----------------------------------------------------------
  // Activities
  // -----------------------------------------------------------

  async createActivity(
    eventId: string,
    locationId: string,
    input: ActivityCreateInput,
  ): Promise<ActivityDto> {
    const loc = await this.prisma.mapLocation.findFirst({
      where: { id: locationId, eventId },
      select: { id: true },
    });
    if (!loc) throw new NotFoundException('Location nao encontrada');

    const created = await this.prisma.activity.create({
      data: {
        eventId,
        locationId,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        palestrante: input.palestrante ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        capacidade: input.capacidade ?? null,
        permitirInscricao: input.permitirInscricao ?? true,
      },
      include: { registrations: { select: { userId: true } } },
    });
    return this.toActivityDto(created, null);
  }

  async updateActivity(
    eventId: string,
    activityId: string,
    input: ActivityUpdateInput,
  ): Promise<ActivityDto> {
    const existing = await this.prisma.activity.findFirst({
      where: { id: activityId, eventId },
    });
    if (!existing) throw new NotFoundException('Atividade nao encontrada');

    const nextStart = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const nextEnd = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
    if (nextEnd <= nextStart) {
      throw new BadRequestException('endsAt deve ser maior que startsAt');
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        titulo: input.titulo ?? undefined,
        descricao: input.descricao === undefined ? undefined : input.descricao,
        palestrante:
          input.palestrante === undefined ? undefined : input.palestrante,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        capacidade: input.capacidade === undefined ? undefined : input.capacidade,
        permitirInscricao:
          input.permitirInscricao === undefined ? undefined : input.permitirInscricao,
      },
      include: { registrations: { select: { userId: true } } },
    });
    return this.toActivityDto(updated, null);
  }

  async deleteActivity(eventId: string, activityId: string): Promise<void> {
    const existing = await this.prisma.activity.findFirst({
      where: { id: activityId, eventId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Atividade nao encontrada');
    await this.prisma.activity.delete({ where: { id: activityId } });
  }

  async register(
    eventId: string,
    activityId: string,
    userId: string,
  ): Promise<ActivityDto> {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, eventId },
      include: { registrations: { select: { userId: true } } },
    });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');
    if (!activity.permitirInscricao) {
      throw new ForbiddenException('Inscricao nao disponivel para esta atividade');
    }
    if (
      activity.capacidade !== null &&
      activity.registrations.length >= activity.capacidade &&
      !activity.registrations.some((r) => r.userId === userId)
    ) {
      throw new ConflictException('Atividade lotada');
    }

    await this.prisma.activityRegistration.upsert({
      where: { activityId_userId: { activityId, userId } },
      create: { activityId, userId },
      update: {},
    });

    const updated = await this.prisma.activity.findUniqueOrThrow({
      where: { id: activityId },
      include: { registrations: { select: { userId: true } } },
    });
    return this.toActivityDto(updated, userId);
  }

  async unregister(
    eventId: string,
    activityId: string,
    userId: string,
  ): Promise<ActivityDto> {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, eventId },
      include: { registrations: { select: { userId: true } } },
    });
    if (!activity) throw new NotFoundException('Atividade nao encontrada');

    await this.prisma.activityRegistration.deleteMany({
      where: { activityId, userId },
    });

    const updated = await this.prisma.activity.findUniqueOrThrow({
      where: { id: activityId },
      include: { registrations: { select: { userId: true } } },
    });
    return this.toActivityDto(updated, userId);
  }

  // -----------------------------------------------------------
  // Internals
  // -----------------------------------------------------------

  private async ensureMap(eventId: string) {
    const existing = await this.prisma.venueMap.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (existing) return existing;
    return this.prisma.venueMap.create({
      data: { eventId },
      select: { id: true },
    });
  }

  private locationInclude() {
    return {
      company: { select: { id: true, nome: true, slug: true } },
      activities: {
        include: { registrations: { select: { userId: true } } },
        orderBy: { startsAt: 'asc' as const },
      },
    };
  }

  private async buildDto(
    venueMapId: string,
    viewerUserId: string | null,
  ): Promise<VenueMapDto> {
    const map = await this.prisma.venueMap.findUniqueOrThrow({
      where: { id: venueMapId },
      include: {
        locations: {
          include: this.locationInclude(),
          orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    return {
      id: map.id,
      eventId: map.eventId,
      titulo: map.titulo,
      backgroundUrl: map.backgroundUrl,
      viewportWidth: map.viewportWidth,
      viewportHeight: map.viewportHeight,
      theme: (map.theme ?? {}) as VenueMapDto['theme'],
      locations: map.locations.map((l) => this.toLocationDto(l, viewerUserId)),
    };
  }

  private toLocationDto(l: LocationRow, viewerUserId: string | null): MapLocationDto {
    return {
      id: l.id,
      kind: l.kind as SharedKind,
      companyId: l.companyId,
      company: l.company
        ? { id: l.company.id, nome: l.company.nome, slug: l.company.slug }
        : null,
      titulo: l.titulo,
      descricao: l.descricao,
      corHex: l.corHex,
      icone: l.icone,
      x: l.x,
      y: l.y,
      larguraPct: l.larguraPct,
      alturaPct: l.alturaPct,
      rotacaoDeg: l.rotacaoDeg,
      ordem: l.ordem,
      activities: l.activities.map((a) => this.toActivityDto(a, viewerUserId)),
    };
  }

  private toActivityDto(a: ActivityRow, viewerUserId: string | null): ActivityDto {
    return {
      id: a.id,
      titulo: a.titulo,
      descricao: a.descricao,
      palestrante: a.palestrante,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      capacidade: a.capacidade,
      permitirInscricao: a.permitirInscricao,
      totalInscritos: a.registrations.length,
      jaInscrito: viewerUserId
        ? a.registrations.some((r) => r.userId === viewerUserId)
        : false,
    };
  }
}
