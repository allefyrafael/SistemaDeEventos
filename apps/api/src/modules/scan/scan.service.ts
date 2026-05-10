import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventMemberRole, UserType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  QrTokenClaims,
  QrTokenResponse,
  ScanRequest,
  ScanResult,
} from '@eventpass/shared';

import { AuditService } from '../../core/audit/audit.service';
import { ModuleRegistryService } from '../../core/module-registry/module-registry.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import type { Env } from '../../core/config/env.schema';

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
    private readonly registry: ModuleRegistryService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------
  // RF05: gera JWT curto para o QR Code do aluno
  // -------------------------------------------------------

  async issueQrToken(eventId: string, studentId: string): Promise<QrTokenResponse> {
    const cfg = await this.registry.getEventConfig(eventId);
    const ttl = cfg.qr_scan?.tokenTtlSeconds ?? 30;
    const rotate = cfg.qr_scan?.rotateEverySeconds ?? 20;

    const member = await this.prisma.eventMember.findFirst({
      where: { eventId, userId: studentId, role: EventMemberRole.STUDENT },
    });
    if (!member) throw new ForbiddenException('Aluno nao esta neste evento');

    const jti = randomUUID();
    const token = await this.jwt.signAsync(
      { sub: studentId, eventId, jti } satisfies Omit<QrTokenClaims, 'iat' | 'exp'>,
      {
        secret: this.config.get('JWT_QR_SECRET', { infer: true }),
        expiresIn: `${ttl}s`,
      },
    );
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return { token, expiresAt, rotateInSeconds: rotate };
  }

  // -------------------------------------------------------
  // RF06: empresa le QR e registra carimbo
  // -------------------------------------------------------

  async performScan(
    eventId: string,
    actor: { id: string; tipoPerfil: UserType },
    input: ScanRequest,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<ScanResult> {
    // Idempotency por clientUuid (sync offline) - se ja existe, retorna o resultado.
    const existingByClient = await this.prisma.studentProgress.findUnique({
      where: { clientUuid: input.clientUuid },
    });
    if (existingByClient) {
      return {
        status: 'duplicate',
        reason: 'clientUuid ja processado',
        progressId: existingByClient.id,
        mustAnswerFeedback: !existingByClient.feedbackRespondido,
      };
    }

    // 1) Valida JWT do QR (RN04 - anti-print usa exp curto + claimJti)
    let claims: QrTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<QrTokenClaims>(input.token, {
        secret: this.config.get('JWT_QR_SECRET', { infer: true }),
      });
    } catch {
      return { status: 'rejected', reason: 'QR Code invalido ou expirado', mustAnswerFeedback: false };
    }
    if (claims.eventId !== eventId) {
      return {
        status: 'rejected',
        reason: 'QR Code nao pertence a este evento',
        mustAnswerFeedback: false,
      };
    }

    // 2) RN04: jti so pode ser consumido 1x. Reserva no Redis.
    const ttlSeconds = 60; // janela de tolerancia para sync
    const claimed = await this.redis.claimJti(claims.jti, ttlSeconds);
    if (!claimed) {
      await this.audit.log({
        actorId: actor.id,
        action: 'scan.reject.replay',
        target: claims.sub,
        metadata: { jti: claims.jti, eventId },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return {
        status: 'rejected',
        reason: 'QR Code ja utilizado (possivel print)',
        mustAnswerFeedback: false,
      };
    }

    // 3) Descobre qual empresa esta concedendo o carimbo.
    // - COMPANY: usa a propria company (a primeira em que e responsavel).
    // - ADMIN: precisa enviar `actAsCompanyId` (scanner geral do organizador).
    let companyId: string;
    if (actor.tipoPerfil === UserType.ADMIN) {
      if (!input.actAsCompanyId) {
        throw new BadRequestException(
          'Admin precisa indicar a empresa que esta concedendo o carimbo (actAsCompanyId).',
        );
      }
      const company = await this.prisma.company.findFirst({
        where: { id: input.actAsCompanyId, eventId, ativo: true },
        select: { id: true },
      });
      if (!company) {
        throw new NotFoundException('Empresa nao encontrada neste evento');
      }
      companyId = company.id;
    } else {
      const myCompanies = await this.prisma.company.findMany({
        where: {
          eventId,
          responsibles: { some: { userId: actor.id } },
        },
        select: { id: true },
      });
      if (myCompanies.length === 0) {
        throw new ForbiddenException('Usuario nao e responsavel de nenhuma empresa deste evento');
      }
      // Se esta vinculado a mais de uma empresa, usa a primeira. (UI deve permitir escolher.)
      companyId = myCompanies[0].id;
    }

    // 4) Valida stamp configurado (com lista de empresas autorizadas)
    const stamp = await this.prisma.stampConfig.findFirst({
      where: { id: input.stampConfigId, eventId },
      include: { authorizedCompanies: { select: { companyId: true } } },
    });
    if (!stamp) throw new NotFoundException('Stamp nao encontrado');

    // RN02: se ha empresas autorizadas, a company atual precisa estar na
    // lista. Lista vazia = qualquer empresa do evento pode carimbar.
    const allowedCompanyIds = stamp.authorizedCompanies.map((a) => a.companyId);
    if (allowedCompanyIds.length > 0 && !allowedCompanyIds.includes(companyId)) {
      return {
        status: 'rejected',
        reason: 'Esta empresa nao pode carimbar este item (RN02)',
        mustAnswerFeedback: false,
      };
    }

    // 5) Valida aluno existe e pertence ao evento
    const member = await this.prisma.eventMember.findFirst({
      where: { eventId, userId: claims.sub, role: EventMemberRole.STUDENT },
    });
    if (!member) {
      return {
        status: 'rejected',
        reason: 'Aluno nao pertence ao evento',
        mustAnswerFeedback: false,
      };
    }

    // 6) RN01: uma empresa nao pode carimbar o mesmo aluno 2x no mesmo item
    const existing = await this.prisma.studentProgress.findFirst({
      where: { studentId: claims.sub, stampConfigId: stamp.id },
    });
    if (existing) {
      return {
        status: 'duplicate',
        reason: 'Aluno ja possui este carimbo (RN01)',
        progressId: existing.id,
        mustAnswerFeedback: !existing.feedbackRespondido,
      };
    }

    // 7) Cria progress
    const progress = await this.prisma.studentProgress.create({
      data: {
        eventId,
        studentId: claims.sub,
        stampConfigId: stamp.id,
        companyId,
        clientUuid: input.clientUuid,
        dataConclusao: new Date(input.clientTimestamp),
      },
    });

    await this.audit.log({
      actorId: actor.id,
      action: 'scan.accept',
      target: claims.sub,
      metadata: {
        eventId,
        companyId,
        stampId: stamp.id,
        progressId: progress.id,
        viaAdmin: actor.tipoPerfil === UserType.ADMIN,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      status: 'accepted',
      progressId: progress.id,
      mustAnswerFeedback: true,
    };
  }

  // -------------------------------------------------------
  // Sync offline (RNF03) - processa fila de scans em lote
  // -------------------------------------------------------

  async performScanBatch(
    eventId: string,
    actor: { id: string; tipoPerfil: UserType },
    items: ScanRequest[],
    ctx: { ip?: string; userAgent?: string },
  ) {
    const results: Array<ScanResult & { clientUuid: string }> = [];
    for (const item of items) {
      try {
        const r = await this.performScan(eventId, actor, item, ctx);
        results.push({ ...r, clientUuid: item.clientUuid });
      } catch (err) {
        results.push({
          status: 'rejected',
          reason: (err as Error).message,
          mustAnswerFeedback: false,
          clientUuid: item.clientUuid,
        });
      }
    }
    return { results };
  }

  // -------------------------------------------------------
  // Leitura auxiliar para o front (aluno decide qual stamp a empresa vai carimbar)
  // -------------------------------------------------------

  async listCompanyVisits(eventId: string, companyUserId: string, limit = 50) {
    const myCompanies = await this.prisma.company.findMany({
      where: { eventId, responsibles: { some: { userId: companyUserId } } },
      select: { id: true },
    });
    if (myCompanies.length === 0) return [];
    const companyIds = myCompanies.map((c) => c.id);
    const rows = await this.prisma.studentProgress.findMany({
      where: { eventId, companyId: { in: companyIds } },
      orderBy: { dataConclusao: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        dataConclusao: true,
        feedbackRespondido: true,
        student: { select: { id: true, nome: true, matricula: true } },
        stampConfig: { select: { id: true, titulo: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      dataConclusao: r.dataConclusao.toISOString(),
      feedbackRespondido: r.feedbackRespondido,
      studentId: r.student.id,
      studentNome: r.student.nome,
      studentMatricula: r.student.matricula,
      stampConfigId: r.stampConfig.id,
      stampTitulo: r.stampConfig.titulo,
    }));
  }

  /**
   * Lista os stamps que o usuario logado pode conceder neste evento.
   * - ADMIN: todos os stamps do evento (scanner geral do organizador).
   * - COMPANY: stamps sem restricao OU com a propria company autorizada
   *   na junction StampConfigCompany.
   */
  async listStampsCompanyCanGrant(
    eventId: string,
    actor: { id: string; tipoPerfil: UserType },
  ) {
    const baseSelect = {
      id: true,
      titulo: true,
      descricao: true,
      ordem: true,
      authorizedCompanies: { select: { companyId: true } },
    } as const;

    if (actor.tipoPerfil === UserType.ADMIN) {
      const rows = await this.prisma.stampConfig.findMany({
        where: { eventId },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        select: baseSelect,
      });
      return rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        descricao: r.descricao,
        ordem: r.ordem,
        authorizedCompanyIds: r.authorizedCompanies.map((a) => a.companyId),
      }));
    }

    const myCompanies = await this.prisma.company.findMany({
      where: { eventId, responsibles: { some: { userId: actor.id } } },
      select: { id: true },
    });
    if (myCompanies.length === 0) return [];
    const companyIds = myCompanies.map((c) => c.id);

    const rows = await this.prisma.stampConfig.findMany({
      where: {
        eventId,
        OR: [
          // Sem nenhuma empresa autorizada = livre.
          { authorizedCompanies: { none: {} } },
          // Tem alguma empresa que pertence ao user.
          { authorizedCompanies: { some: { companyId: { in: companyIds } } } },
        ],
      },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
      select: baseSelect,
    });
    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
      ordem: r.ordem,
      authorizedCompanyIds: r.authorizedCompanies.map((a) => a.companyId),
    }));
  }
}
