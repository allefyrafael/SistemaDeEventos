import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventMemberRole, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { VolunteerCreateInput, VolunteerDto, VolunteerScope } from '@eventpass/shared';

import { PrismaService } from '../../core/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

/**
 * Voluntarios sao usuarios com `tipoPerfil = VOLUNTEER` (login pessoal por
 * CPF + senha) e um `EventMember.role` contextual por evento — uma mesma
 * pessoa pode atuar como voluntaria de estudantes em um evento e de
 * empresas em outro. Os escopos do produto:
 *
 * - VOLUNTEER_STUDENTS: pode redefinir senhas de estudantes do evento.
 * - VOLUNTEER_COMPANIES: pode cadastrar empresas e redefinir senhas dos
 *   responsaveis dessas empresas no evento.
 */
@Injectable()
export class VolunteersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista voluntarios ativos de um evento (sem expor senhaHash). */
  async listInEvent(eventId: string): Promise<VolunteerDto[]> {
    const members = await this.prisma.eventMember.findMany({
      where: {
        eventId,
        role: {
          in: [EventMemberRole.VOLUNTEER_STUDENTS, EventMemberRole.VOLUNTEER_COMPANIES],
        },
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      id: m.user.id,
      nome: m.user.nome,
      cpf: m.user.cpf,
      email: m.user.email,
      scope: m.role as VolunteerScope,
      ativo: m.user.ativo,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Cadastra voluntario no evento. Idempotente em CPFs existentes — promove
   * para VOLUNTEER e (re)atribui a senha. Bloqueia colisao com outros perfis
   * para nao quebrar logins ja em uso.
   */
  async createInEvent(
    eventId: string,
    input: VolunteerCreateInput,
  ): Promise<VolunteerDto> {
    const existingByMatricula = input.cpf
      ? await this.prisma.user.findUnique({ where: { cpf: input.cpf } })
      : null;
    if (existingByMatricula && existingByMatricula.tipoPerfil !== UserType.VOLUNTEER) {
      throw new ConflictException(
        'CPF ja cadastrado com outro perfil. Use outro CPF para cadastrar como voluntario.',
      );
    }

    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const user = existingByMatricula
        ? await tx.user.update({
            where: { id: existingByMatricula.id },
            data: {
              nome: input.nome,
              email: input.email,
              senhaHash,
              tipoPerfil: UserType.VOLUNTEER,
            },
          })
        : await tx.user.create({
            data: {
              nome: input.nome,
              cpf: input.cpf,
              email: input.email,
              senhaHash,
              tipoPerfil: UserType.VOLUNTEER,
            },
          });

      const member = await tx.eventMember.upsert({
        where: {
          eventId_userId_role: {
            eventId,
            userId: user.id,
            role: input.scope as EventMemberRole,
          },
        },
        update: {},
        create: { eventId, userId: user.id, role: input.scope as EventMemberRole },
      });

      return {
        id: user.id,
        nome: user.nome,
        cpf: user.cpf,
        email: user.email,
        scope: input.scope,
        ativo: user.ativo,
        createdAt: member.createdAt.toISOString(),
      };
    });
  }

  /**
   * Remove o vinculo do voluntario com o evento (mantém o User, pode ter
   * outros eventos). Se for o ultimo evento, o User segue VOLUNTEER mas
   * sem ability de login (loginVolunteer exige eventMembers.length > 0).
   */
  async removeFromEvent(eventId: string, userId: string): Promise<void> {
    const rows = await this.prisma.eventMember.deleteMany({
      where: {
        eventId,
        userId,
        role: {
          in: [EventMemberRole.VOLUNTEER_STUDENTS, EventMemberRole.VOLUNTEER_COMPANIES],
        },
      },
    });
    if (rows.count === 0) {
      throw new NotFoundException('Voluntario nao encontrado neste evento');
    }
  }

  /**
   * Guard helper: confirma que o usuario tem permissao especifica no evento.
   * - ADMIN global: sempre passa.
   * - VOLUNTEER: precisa ter EventMember com o `requiredScope` no evento.
   * Lanca ForbiddenException quando nao tem.
   *
   * Usar nos controllers que precisam aceitar voluntarios alem do admin
   * (ex: cadastro de empresa por VOLUNTEER_COMPANIES, reset de senha de
   * estudante por VOLUNTEER_STUDENTS).
   */
  async assertScopeInEvent(
    actor: { id: string; tipoPerfil: UserType },
    eventId: string,
    requiredScope: VolunteerScope,
  ): Promise<void> {
    if (actor.tipoPerfil === UserType.ADMIN) return;
    if (actor.tipoPerfil !== UserType.VOLUNTEER) {
      throw new ForbiddenException('Apenas admin ou voluntario podem fazer esta operacao');
    }
    const member = await this.prisma.eventMember.findFirst({
      where: {
        eventId,
        userId: actor.id,
        role: requiredScope as EventMemberRole,
      },
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException(
        'Voluntario nao tem este escopo neste evento',
      );
    }
  }

  /** Reset administrativo de senha do voluntario. */
  async resetSenha(eventId: string, userId: string, novaSenha: string): Promise<void> {
    const member = await this.prisma.eventMember.findFirst({
      where: {
        eventId,
        userId,
        role: {
          in: [EventMemberRole.VOLUNTEER_STUDENTS, EventMemberRole.VOLUNTEER_COMPANIES],
        },
      },
    });
    if (!member) {
      throw new NotFoundException('Voluntario nao encontrado neste evento');
    }
    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { senhaHash },
    });
  }
}
