import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import type {
  EventCreateInput,
  EventDetail,
  EventUpdateInput,
  FeatureModule,
} from '@eventpass/shared';
import { eventConfigSchema } from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Serializa linha Prisma de evento para o contrato da API (lista e detalhe). */
  toDetail(e: {
    id: string;
    nome: string;
    slug: string;
    descricao: string | null;
    status: EventStatus;
    startsAt: Date;
    endsAt: Date;
    config: Prisma.JsonValue;
  }): EventDetail {
    const parsed = eventConfigSchema.parse(
      (e.config ?? {}) as Record<string, unknown>,
    );
    return {
      id: e.id,
      nome: e.nome,
      slug: e.slug,
      descricao: e.descricao,
      status: e.status,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      modules: parsed.modules,
      config: (e.config ?? {}) as Record<string, unknown>,
    };
  }

  async create(input: EventCreateInput): Promise<EventDetail> {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw new BadRequestException('endsAt deve ser maior que startsAt');
    }
    const existing = await this.prisma.event.findUnique({
      where: { slug: input.slug },
    });
    if (existing) throw new ConflictException('Slug ja usado');

    const configMerged = eventConfigSchema.parse({
      ...(input.config ?? {}),
      modules: input.modules,
    });

    const e = await this.prisma.event.create({
      data: {
        nome: input.nome,
        slug: input.slug,
        descricao: input.descricao,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        config: configMerged as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDetail(e);
  }

  async update(eventId: string, input: EventUpdateInput): Promise<EventDetail> {
    const current = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!current) throw new NotFoundException('Evento nao encontrado');

    const nextStart = input.startsAt ? new Date(input.startsAt) : current.startsAt;
    const nextEnd = input.endsAt ? new Date(input.endsAt) : current.endsAt;
    if (nextEnd <= nextStart) {
      throw new BadRequestException('endsAt deve ser maior que startsAt');
    }

    const nextConfigRaw = {
      ...(current.config as object),
      ...(input.config ?? {}),
      ...(input.modules ? { modules: input.modules } : {}),
    };
    const nextConfig = eventConfigSchema.parse(nextConfigRaw);

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        nome: input.nome ?? undefined,
        descricao: input.descricao === undefined ? undefined : input.descricao,
        status: input.status ?? undefined,
        startsAt: nextStart,
        endsAt: nextEnd,
        config: nextConfig as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDetail(updated);
  }

  async remove(eventId: string): Promise<void> {
    const current = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!current) throw new NotFoundException('Evento nao encontrado');
    if (current.status !== EventStatus.DRAFT && current.status !== EventStatus.ARCHIVED) {
      throw new BadRequestException(
        'Apenas eventos DRAFT ou ARCHIVED podem ser removidos',
      );
    }
    await this.prisma.event.delete({ where: { id: eventId } });
  }

  async findOne(eventId: string): Promise<EventDetail> {
    const e = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!e) throw new NotFoundException('Evento nao encontrado');
    return this.toDetail(e);
  }

  async list(): Promise<EventDetail[]> {
    const rows = await this.prisma.event.findMany({ orderBy: { startsAt: 'desc' } });
    return rows.map((r) => this.toDetail(r));
  }

  /**
   * Lista publica (sem auth) usada no auto-cadastro de visitantes externos.
   * Retorna apenas eventos PUBLISHED ou RUNNING, com campos seguros.
   */
  async listPublic() {
    const rows = await this.prisma.event.findMany({
      where: { status: { in: [EventStatus.PUBLISHED, EventStatus.RUNNING] } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        nome: true,
        slug: true,
        descricao: true,
        startsAt: true,
        endsAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      descricao: r.descricao,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
    }));
  }

  async toggleModule(
    eventId: string,
    module: FeatureModule,
    enabled: boolean,
  ): Promise<EventDetail> {
    const current = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!current) throw new NotFoundException('Evento nao encontrado');
    const cfg = eventConfigSchema.parse(current.config ?? {});
    const set = new Set(cfg.modules);
    if (enabled) set.add(module);
    else set.delete(module);
    const next = { ...cfg, modules: Array.from(set) };
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { config: next as unknown as Prisma.InputJsonValue },
    });
    return this.toDetail(updated);
  }
}
