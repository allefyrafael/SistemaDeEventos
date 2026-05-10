import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PassportStatus,
  StampConfigCreateInput,
  StampConfigDto,
  StampConfigUpdateInput,
} from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PassportService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // StampConfig CRUD (RF04)
  // -------------------------------------------------------

  async listStamps(eventId: string): Promise<StampConfigDto[]> {
    const rows = await this.prisma.stampConfig.findMany({
      where: { eventId },
      include: { entidadeAutorizada: true },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      titulo: r.titulo,
      descricao: r.descricao,
      ordem: r.ordem,
      obrigatorio: r.obrigatorio,
      entidadeAutorizada: r.entidadeAutorizada
        ? { id: r.entidadeAutorizada.id, nome: r.entidadeAutorizada.nome }
        : null,
    }));
  }

  async createStamp(
    eventId: string,
    input: StampConfigCreateInput,
  ): Promise<StampConfigDto> {
    await this.assertEventExists(eventId);
    if (input.entidadeAutorizadaId) {
      await this.assertCompanyBelongsToEvent(eventId, input.entidadeAutorizadaId);
    }
    const row = await this.prisma.stampConfig.create({
      data: {
        eventId,
        titulo: input.titulo,
        descricao: input.descricao,
        ordem: input.ordem ?? 0,
        obrigatorio: input.obrigatorio ?? true,
        entidadeAutorizadaId: input.entidadeAutorizadaId ?? null,
      },
      include: { entidadeAutorizada: true },
    });
    return {
      id: row.id,
      eventId: row.eventId,
      titulo: row.titulo,
      descricao: row.descricao,
      ordem: row.ordem,
      obrigatorio: row.obrigatorio,
      entidadeAutorizada: row.entidadeAutorizada
        ? { id: row.entidadeAutorizada.id, nome: row.entidadeAutorizada.nome }
        : null,
    };
  }

  async updateStamp(
    eventId: string,
    stampId: string,
    input: StampConfigUpdateInput,
  ): Promise<StampConfigDto> {
    const current = await this.prisma.stampConfig.findFirst({
      where: { id: stampId, eventId },
    });
    if (!current) throw new NotFoundException('Stamp nao encontrado');
    if (input.entidadeAutorizadaId !== undefined && input.entidadeAutorizadaId !== null) {
      await this.assertCompanyBelongsToEvent(eventId, input.entidadeAutorizadaId);
    }
    const row = await this.prisma.stampConfig.update({
      where: { id: stampId },
      data: {
        titulo: input.titulo ?? undefined,
        descricao: input.descricao ?? undefined,
        ordem: input.ordem ?? undefined,
        obrigatorio: input.obrigatorio ?? undefined,
        entidadeAutorizadaId:
          input.entidadeAutorizadaId === undefined
            ? undefined
            : input.entidadeAutorizadaId,
      },
      include: { entidadeAutorizada: true },
    });
    return {
      id: row.id,
      eventId: row.eventId,
      titulo: row.titulo,
      descricao: row.descricao,
      ordem: row.ordem,
      obrigatorio: row.obrigatorio,
      entidadeAutorizada: row.entidadeAutorizada
        ? { id: row.entidadeAutorizada.id, nome: row.entidadeAutorizada.nome }
        : null,
    };
  }

  async removeStamp(eventId: string, stampId: string): Promise<void> {
    const current = await this.prisma.stampConfig.findFirst({
      where: { id: stampId, eventId },
    });
    if (!current) throw new NotFoundException('Stamp nao encontrado');
    await this.prisma.stampConfig.delete({ where: { id: stampId } });
  }

  // -------------------------------------------------------
  // Status do passaporte do aluno (RF08)
  // -------------------------------------------------------

  async getStatus(eventId: string, studentId: string): Promise<PassportStatus> {
    await this.assertEventExists(eventId);
    const [stamps, progressos] = await Promise.all([
      this.prisma.stampConfig.findMany({
        where: { eventId },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.studentProgress.findMany({
        where: { eventId, studentId },
        include: { company: { select: { id: true, nome: true } } },
      }),
    ]);
    const progMap = new Map(progressos.map((p) => [p.stampConfigId, p]));

    const items = stamps.map((s) => {
      const prog = progMap.get(s.id);
      return {
        stampConfigId: s.id,
        titulo: s.titulo,
        ordem: s.ordem,
        obrigatorio: s.obrigatorio,
        obtido: !!prog,
        dataConclusao: prog?.dataConclusao?.toISOString() ?? null,
        companyId: prog?.company.id ?? null,
        companyNome: prog?.company.nome ?? null,
        feedbackRespondido: prog?.feedbackRespondido ?? false,
      };
    });

    const required = stamps.filter((s) => s.obrigatorio);
    const completedRequired = required.filter((s) =>
      progMap.get(s.id) && progMap.get(s.id)!.feedbackRespondido,
    );
    const totalRequired = required.length;
    const totalCompleted = completedRequired.length;

    return {
      eventId,
      totalRequired,
      totalCompleted,
      completed: totalRequired > 0 && totalCompleted === totalRequired,
      items,
    };
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------

  private async assertEventExists(eventId: string): Promise<void> {
    const ok = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException('Evento nao encontrado');
  }

  private async assertCompanyBelongsToEvent(
    eventId: string,
    companyId: string,
  ): Promise<void> {
    const ok = await this.prisma.company.findFirst({
      where: { id: companyId, eventId },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException('Empresa nao pertence a este evento');
  }
}
