import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventMemberRole, Prisma, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { CompanyCreateInput, CompanyDto, CompanyUpdateInput } from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

function slugify(src: string): string {
  return src
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(eventId: string, input: CompanyCreateInput): Promise<CompanyDto> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');

    const slug = input.slug ?? slugify(input.nome);
    if (!slug) throw new BadRequestException('Nome invalido para gerar slug');

    const clash = await this.prisma.company.findUnique({
      where: { eventId_slug: { eventId, slug } },
    });
    if (clash) throw new ConflictException('Slug ja existe neste evento');

    return this.prisma.$transaction(async (tx) => {
      // Valida categoria (se enviada) pertence ao evento.
      if (input.categoryId) {
        const cat = await tx.companyCategory.findFirst({
          where: { id: input.categoryId, eventId },
          select: { id: true },
        });
        if (!cat) throw new NotFoundException('Categoria nao pertence a este evento');
      }
      const company = await tx.company.create({
        data: {
          eventId,
          nome: input.nome,
          slug,
          categoryId: input.categoryId ?? null,
          meta: {
            descricao: input.descricao ?? null,
            stand: input.stand ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      for (const resp of input.responsaveis) {
        const senhaHash = resp.senha ? await bcrypt.hash(resp.senha, BCRYPT_ROUNDS) : null;
        let user = await tx.user.findUnique({ where: { cpf: resp.cpf } });
        if (!user) {
          user = await tx.user.create({
            data: {
              nome: resp.nome,
              cpf: resp.cpf,
              email: resp.email,
              tipoPerfil: UserType.COMPANY,
              senhaHash: senhaHash ?? undefined,
            },
          });
        } else if (user.tipoPerfil !== UserType.COMPANY) {
          // Promove para COMPANY. Mantem email/nome se user ja existia.
          // Se admin enviou senha, sobrescreve.
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              tipoPerfil: UserType.COMPANY,
              email: user.email ?? resp.email,
              senhaHash: senhaHash ?? undefined,
            },
          });
        } else if (senhaHash) {
          // Ja era COMPANY e admin enviou senha — atualiza.
          user = await tx.user.update({
            where: { id: user.id },
            data: { senhaHash },
          });
        }
        await tx.companyResponsible.upsert({
          where: { companyId_userId: { companyId: company.id, userId: user.id } },
          update: {},
          create: { companyId: company.id, userId: user.id },
        });
        await tx.eventMember.upsert({
          where: {
            eventId_userId_role: {
              eventId,
              userId: user.id,
              role: EventMemberRole.COMPANY_REP,
            },
          },
          update: {},
          create: { eventId, userId: user.id, role: EventMemberRole.COMPANY_REP },
        });
      }

      return this.toDto(company.id);
    });
  }

  async update(
    eventId: string,
    companyId: string,
    input: CompanyUpdateInput,
  ): Promise<CompanyDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, eventId },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada');

    const metaAtual = (company.meta as Record<string, unknown>) ?? {};
    const meta = {
      ...metaAtual,
      descricao: input.descricao === undefined ? metaAtual.descricao : input.descricao,
      stand: input.stand === undefined ? metaAtual.stand : input.stand,
    };

    // Valida categoria (se sendo alterada) pertence ao evento.
    if (input.categoryId) {
      const cat = await this.prisma.companyCategory.findFirst({
        where: { id: input.categoryId, eventId },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException('Categoria nao pertence a este evento');
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        nome: input.nome ?? undefined,
        slug: input.slug ?? undefined,
        ativo: input.ativo ?? undefined,
        // Permite explicitamente desvincular passando null.
        categoryId:
          input.categoryId === undefined ? undefined : (input.categoryId ?? null),
        meta: meta as Prisma.InputJsonValue,
      },
    });

    // Se responsaveis foi enviado, substitui o conjunto atual.
    if (input.responsaveis && input.responsaveis.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.companyResponsible.findMany({
          where: { companyId },
          select: { userId: true },
        });
        const keepIds = new Set<string>();
        for (const resp of input.responsaveis!) {
          const senhaHash = resp.senha ? await bcrypt.hash(resp.senha, BCRYPT_ROUNDS) : null;
          let user = await tx.user.findUnique({ where: { cpf: resp.cpf } });
          if (!user) {
            user = await tx.user.create({
              data: {
                nome: resp.nome,
                cpf: resp.cpf,
                email: resp.email,
                tipoPerfil: UserType.COMPANY,
                senhaHash: senhaHash ?? undefined,
              },
            });
          } else if (user.tipoPerfil !== UserType.COMPANY) {
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                tipoPerfil: UserType.COMPANY,
                senhaHash: senhaHash ?? undefined,
              },
            });
          } else if (senhaHash) {
            user = await tx.user.update({
              where: { id: user.id },
              data: { senhaHash },
            });
          }
          keepIds.add(user.id);
          await tx.companyResponsible.upsert({
            where: { companyId_userId: { companyId, userId: user.id } },
            update: {},
            create: { companyId, userId: user.id },
          });
          await tx.eventMember.upsert({
            where: {
              eventId_userId_role: {
                eventId,
                userId: user.id,
                role: EventMemberRole.COMPANY_REP,
              },
            },
            update: {},
            create: { eventId, userId: user.id, role: EventMemberRole.COMPANY_REP },
          });
        }
        const toRemove = current.filter((c) => !keepIds.has(c.userId));
        if (toRemove.length > 0) {
          await tx.companyResponsible.deleteMany({
            where: { companyId, userId: { in: toRemove.map((r) => r.userId) } },
          });
        }
      });
    }

    return this.toDto(companyId);
  }

  async remove(eventId: string, companyId: string): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, eventId },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    await this.prisma.company.delete({ where: { id: companyId } });
  }

  /**
   * Reset administrativo da senha de um responsavel. Verifica que o usuario
   * realmente e responsavel da empresa indicada no evento informado antes
   * de sobrescrever a senha — evita reset acidental de usuario errado.
   * Nao retorna a senha (admin define a nova).
   */
  async resetResponsavelSenha(
    eventId: string,
    companyId: string,
    userId: string,
    novaSenha: string,
  ): Promise<void> {
    const link = await this.prisma.companyResponsible.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { company: { select: { eventId: true } } },
    });
    if (!link || link.company.eventId !== eventId) {
      throw new NotFoundException('Responsavel nao encontrado nesta empresa/evento');
    }
    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { senhaHash },
    });
  }

  async setLogoKey(
    eventId: string,
    companyId: string,
    logoKey: string | null,
  ): Promise<CompanyDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, eventId },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    await this.prisma.company.update({
      where: { id: companyId },
      data: { logoKey: logoKey ?? null },
    });
    return this.toDto(companyId);
  }

  async list(eventId: string): Promise<CompanyDto[]> {
    const rows = await this.prisma.company.findMany({
      where: { eventId },
      orderBy: { nome: 'asc' },
      include: {
        responsibles: { include: { user: true } },
        category: { select: { id: true, nome: true, color: true } },
        _count: { select: { stampsGranted: true } },
      },
    });
    return rows.map((c) => this.rowToDto(c));
  }

  async findOne(eventId: string, companyId: string): Promise<CompanyDto> {
    return this.toDto(companyId, eventId);
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------

  private async toDto(companyId: string, eventId?: string): Promise<CompanyDto> {
    const c = await this.prisma.company.findFirst({
      where: { id: companyId, ...(eventId ? { eventId } : {}) },
      include: {
        responsibles: { include: { user: true } },
        category: { select: { id: true, nome: true, color: true } },
        _count: { select: { stampsGranted: true } },
      },
    });
    if (!c) throw new NotFoundException('Empresa nao encontrada');
    return this.rowToDto(c);
  }

  private rowToDto(
    c: Prisma.CompanyGetPayload<{
      include: {
        responsibles: { include: { user: true } };
        category: { select: { id: true; nome: true; color: true } };
        _count: { select: { stampsGranted: true } };
      };
    }>,
  ): CompanyDto {
    const meta = (c.meta as Record<string, unknown> | null) ?? {};
    return {
      id: c.id,
      eventId: c.eventId,
      nome: c.nome,
      slug: c.slug,
      logoUrl: null, // preenchido pela layer de storage quando houver presigned URL
      stand: (meta.stand as string | null) ?? null,
      descricao: (meta.descricao as string | null) ?? null,
      ativo: c.ativo,
      category: c.category
        ? { id: c.category.id, nome: c.category.nome, color: c.category.color }
        : null,
      responsaveis: c.responsibles.map((r) => ({
        id: r.user.id,
        nome: r.user.nome,
        cpf: r.user.cpf,
        email: r.user.email,
      })),
      metricas: {
        totalCarimbos: c._count.stampsGranted,
        notaMedia: null,
      },
    };
  }
}
