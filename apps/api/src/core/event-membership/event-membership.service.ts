import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventMemberRole, UserType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../../modules/auth/types/auth.types';

/**
 * Regras de acesso aos eventos:
 * - ADMIN global: acessa qualquer evento.
 * - COMPANY / STUDENT: so acessam eventos em que sao EventMember.
 */
@Injectable()
export class EventMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertEventExists(eventId: string): Promise<void> {
    const ok = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException('Evento nao encontrado');
  }

  async assertUserCanAccessEvent(
    user: AuthenticatedUser,
    eventId: string,
  ): Promise<EventMemberRole> {
    await this.assertEventExists(eventId);
    if (user.tipoPerfil === UserType.ADMIN) return EventMemberRole.ADMIN;

    const member = await this.prisma.eventMember.findFirst({
      where: { eventId, userId: user.id },
      select: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!member) throw new ForbiddenException('Sem acesso a este evento');
    return member.role;
  }

  async assertRoleInEvent(
    user: AuthenticatedUser,
    eventId: string,
    allowed: EventMemberRole[],
  ): Promise<void> {
    const role = await this.assertUserCanAccessEvent(user, eventId);
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Papel insuficiente para esta operacao');
    }
  }

  /** Retorna os eventos em que o usuario participa (ADMIN ve todos). */
  async listEventsForUser(user: AuthenticatedUser) {
    if (user.tipoPerfil === UserType.ADMIN) {
      return this.prisma.event.findMany({ orderBy: { startsAt: 'desc' } });
    }
    return this.prisma.event.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { startsAt: 'desc' },
    });
  }
}
