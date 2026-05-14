import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CompanyCategoryCreateInput,
  CompanyCategoryDto,
  CompanyCategoryUpdateInput,
} from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Categorias de empresa por evento. Servem para:
 * 1) Agrupar empresas no admin (filtragem visual).
 * 2) Atalho de autorizacao: StampConfig.companyCategoryId libera todas as
 *    empresas da categoria a conceder o carimbo (RN02 ampliado).
 *
 * Soft-link: ao deletar uma categoria, Company.categoryId e
 * StampConfig.companyCategoryId viram NULL (onDelete: SetNull) — nada se
 * perde, so o agrupamento.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listInEvent(eventId: string): Promise<CompanyCategoryDto[]> {
    const rows = await this.prisma.companyCategory.findMany({
      where: { eventId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { companies: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      nome: c.nome,
      color: c.color,
      ordem: c.ordem,
      totalCompanies: c._count.companies,
    }));
  }

  async create(
    eventId: string,
    input: CompanyCategoryCreateInput,
  ): Promise<CompanyCategoryDto> {
    try {
      const row = await this.prisma.companyCategory.create({
        data: {
          eventId,
          nome: input.nome,
          color: input.color ?? null,
          ordem: input.ordem ?? 0,
        },
      });
      return this.toDto(row.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ja existe uma categoria com este nome neste evento');
      }
      throw e;
    }
  }

  async update(
    eventId: string,
    categoryId: string,
    input: CompanyCategoryUpdateInput,
  ): Promise<CompanyCategoryDto> {
    const current = await this.prisma.companyCategory.findFirst({
      where: { id: categoryId, eventId },
    });
    if (!current) throw new NotFoundException('Categoria nao encontrada');
    try {
      await this.prisma.companyCategory.update({
        where: { id: categoryId },
        data: {
          nome: input.nome ?? undefined,
          color: input.color === undefined ? undefined : input.color,
          ordem: input.ordem ?? undefined,
        },
      });
      return this.toDto(categoryId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ja existe uma categoria com este nome neste evento');
      }
      throw e;
    }
  }

  async remove(eventId: string, categoryId: string): Promise<void> {
    const current = await this.prisma.companyCategory.findFirst({
      where: { id: categoryId, eventId },
    });
    if (!current) throw new NotFoundException('Categoria nao encontrada');
    // Empresas e stamps vinculados ficam com null no campo (onDelete:SetNull).
    await this.prisma.companyCategory.delete({ where: { id: categoryId } });
  }

  private async toDto(categoryId: string): Promise<CompanyCategoryDto> {
    const c = await this.prisma.companyCategory.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { companies: true } } },
    });
    if (!c) throw new NotFoundException('Categoria nao encontrada');
    return {
      id: c.id,
      eventId: c.eventId,
      nome: c.nome,
      color: c.color,
      ordem: c.ordem,
      totalCompanies: c._count.companies,
    };
  }
}
