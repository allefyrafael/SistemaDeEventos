import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PassportStatus,
  StampConfigCreateInput,
  StampConfigDto,
  StampConfigUpdateInput,
} from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

interface StampWithCompanies {
  id: string;
  eventId: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  obrigatorio: boolean;
  authorizedCompanies: Array<{
    company: { id: string; nome: string };
  }>;
}

function toDto(s: StampWithCompanies): StampConfigDto {
  const companies = s.authorizedCompanies.map((ac) => ({
    id: ac.company.id,
    nome: ac.company.nome,
  }));
  return {
    id: s.id,
    eventId: s.eventId,
    titulo: s.titulo,
    descricao: s.descricao,
    ordem: s.ordem,
    obrigatorio: s.obrigatorio,
    authorizedCompanies: companies,
    // Compat: primeira empresa autorizada como `entidadeAutorizada`.
    entidadeAutorizada: companies.length > 0 ? companies[0] : null,
  };
}

@Injectable()
export class PassportService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // StampConfig CRUD (RF04)
  // -------------------------------------------------------

  async listStamps(eventId: string): Promise<StampConfigDto[]> {
    const rows = await this.prisma.stampConfig.findMany({
      where: { eventId },
      include: {
        authorizedCompanies: {
          include: { company: { select: { id: true, nome: true } } },
        },
      },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDto);
  }

  async createStamp(
    eventId: string,
    input: StampConfigCreateInput,
  ): Promise<StampConfigDto> {
    await this.assertEventExists(eventId);
    const companyIds = this.resolveCompanyIds(input);
    if (companyIds.length > 0) {
      await this.assertCompaniesBelongToEvent(eventId, companyIds);
    }

    const row = await this.prisma.stampConfig.create({
      data: {
        eventId,
        titulo: input.titulo,
        descricao: input.descricao,
        ordem: input.ordem ?? 0,
        obrigatorio: input.obrigatorio ?? true,
        authorizedCompanies: {
          create: companyIds.map((companyId) => ({ companyId })),
        },
      },
      include: {
        authorizedCompanies: {
          include: { company: { select: { id: true, nome: true } } },
        },
      },
    });
    return toDto(row);
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

    // Atualiza authorizedCompanies somente se um dos campos foi enviado.
    const companyIdsProvided =
      input.authorizedCompanyIds !== undefined ||
      input.entidadeAutorizadaId !== undefined;
    let companyIds: string[] | null = null;
    if (companyIdsProvided) {
      companyIds = this.resolveCompanyIds(input);
      if (companyIds.length > 0) {
        await this.assertCompaniesBelongToEvent(eventId, companyIds);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stampConfig.update({
        where: { id: stampId },
        data: {
          titulo: input.titulo ?? undefined,
          descricao: input.descricao ?? undefined,
          ordem: input.ordem ?? undefined,
          obrigatorio: input.obrigatorio ?? undefined,
        },
      });
      if (companyIds !== null) {
        await tx.stampConfigCompany.deleteMany({ where: { stampConfigId: stampId } });
        if (companyIds.length > 0) {
          await tx.stampConfigCompany.createMany({
            data: companyIds.map((companyId) => ({ stampConfigId: stampId, companyId })),
          });
        }
      }
    });

    const row = await this.prisma.stampConfig.findUniqueOrThrow({
      where: { id: stampId },
      include: {
        authorizedCompanies: {
          include: { company: { select: { id: true, nome: true } } },
        },
      },
    });
    return toDto(row);
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

  /**
   * Resolve a lista final de companies autorizadas a partir do input.
   * Aceita o campo novo `authorizedCompanyIds` e cai no legado
   * `entidadeAutorizadaId` (1:1) para clientes antigos.
   */
  private resolveCompanyIds(
    input: { authorizedCompanyIds?: string[]; entidadeAutorizadaId?: string | null },
  ): string[] {
    if (input.authorizedCompanyIds !== undefined) {
      return Array.from(new Set(input.authorizedCompanyIds));
    }
    if (input.entidadeAutorizadaId) {
      return [input.entidadeAutorizadaId];
    }
    return [];
  }

  private async assertEventExists(eventId: string): Promise<void> {
    const ok = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException('Evento nao encontrado');
  }

  private async assertCompaniesBelongToEvent(
    eventId: string,
    companyIds: string[],
  ): Promise<void> {
    const found = await this.prisma.company.count({
      where: { eventId, id: { in: companyIds } },
    });
    if (found !== companyIds.length) {
      throw new NotFoundException('Uma ou mais empresas nao pertencem a este evento');
    }
  }
}
