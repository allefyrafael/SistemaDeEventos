import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventMemberRole, EventStatus, StudentKind, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import type { Env } from '../../core/config/env.schema';
import type {
  AdminLoginInput,
  CompanyLoginInput,
  StudentLoginInput,
  StudentRegisterInput,
  VisitorLoginInput,
  VisitorRegisterInput,
  VolunteerLoginInput,
} from '@eventpass/shared';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
  LoginResponse,
} from './types/auth.types';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------
  // Password hashing helpers (exposto para seed e services)
  // ---------------------------------------------------------

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  // ---------------------------------------------------------
  // Login flows
  // ---------------------------------------------------------

  async loginAdmin(input: AdminLoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { cpf: input.cpf } });
    if (!user || user.tipoPerfil !== 'ADMIN' || !user.ativo || !user.senhaHash) {
      // mensagem generica (nao vaza se o CPF existe)
      throw new UnauthorizedException('Credenciais invalidas');
    }
    const ok = await bcrypt.compare(input.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedException('Credenciais invalidas');

    return this.issueTokens(user.id, 'ADMIN', user.nome);
  }

  /**
   * Empresa: responsavel faz login com seu proprio CPF + senha pessoal
   * (bcrypt). Substituiu o fluxo legado de "2 CPFs distintos".
   *
   * Pre-requisito: o responsavel precisa ter sido cadastrado pelo admin
   * (ou pelo Voluntario Empresas) com uma senha definida — senao recebe
   * "credenciais invalidas" generico. Reset de senha e administrativo:
   * PATCH /events/:eventId/companies/:companyId/responsaveis/:userId/senha.
   */
  async loginCompany(input: CompanyLoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { cpf: input.cpf },
      include: { companyResponsible: { select: { companyId: true } } },
    });
    if (
      !user ||
      !user.ativo ||
      user.tipoPerfil !== UserType.COMPANY ||
      !user.senhaHash ||
      user.companyResponsible.length === 0
    ) {
      // Mensagem generica para nao vazar quais CPFs existem.
      throw new UnauthorizedException('Credenciais invalidas');
    }
    const ok = await bcrypt.compare(input.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedException('Credenciais invalidas');
    return this.issueTokens(user.id, 'COMPANY', user.nome);
  }

  /**
   * Estudante interno: matricula + CPF. Externo usa registerVisitor/loginVisitor.
   */
  async loginStudent(input: StudentLoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        matricula: input.matricula,
        cpf: input.cpf,
        tipoPerfil: 'STUDENT',
        ativo: true,
      },
    });
    if (!user) throw new UnauthorizedException('Matricula ou CPF invalido');

    return this.issueTokens(user.id, 'STUDENT', user.nome);
  }

  /**
   * Auto-cadastro de visitante externo (sem matricula). Cria o User como
   * STUDENT/EXTERNAL com senha bcrypt e associa ao evento alvo. Idempotente:
   * se o CPF ja for visitante, atualiza dados e garante a associacao.
   */
  async registerVisitor(input: VisitorRegisterInput): Promise<LoginResponse> {
    const event = await this.prisma.event.findUnique({ where: { id: input.eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');
    if (event.status !== EventStatus.PUBLISHED && event.status !== EventStatus.RUNNING) {
      throw new ForbiddenException('Evento nao esta aceitando cadastros');
    }

    const existing = await this.prisma.user.findUnique({ where: { cpf: input.cpf } });
    const senhaHash = await this.hashPassword(input.senha);

    let userId: string;
    let userNome: string;

    if (existing) {
      if (existing.tipoPerfil !== UserType.STUDENT) {
        throw new ConflictException('CPF ja cadastrado com outro perfil');
      }
      if (existing.studentKind !== StudentKind.EXTERNAL) {
        // Evita que estudante INTERNAL (com matricula) sobrescreva o cadastro
        // pela rota de visitante.
        throw new ConflictException('CPF ja cadastrado como estudante interno');
      }
      // Re-registro: atualiza nome/email/senha e segue para garantir associacao.
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: { nome: input.nome, email: input.email, senhaHash },
      });
      userId = updated.id;
      userNome = updated.nome;
    } else {
      const created = await this.prisma.user.create({
        data: {
          nome: input.nome,
          cpf: input.cpf,
          email: input.email,
          senhaHash,
          tipoPerfil: UserType.STUDENT,
          studentKind: StudentKind.EXTERNAL,
        },
      });
      userId = created.id;
      userNome = created.nome;
    }

    await this.prisma.eventMember.upsert({
      where: {
        eventId_userId_role: {
          eventId: event.id,
          userId,
          role: EventMemberRole.STUDENT,
        },
      },
      update: {},
      create: { eventId: event.id, userId, role: EventMemberRole.STUDENT },
    });

    return this.issueTokens(userId, 'STUDENT', userNome);
  }

  /**
   * Auto-cadastro de ESTUDANTE INTERNO (institucional). Matricula no padrao
   * UC########, cria User STUDENT/INTERNAL sem senha (o login dele e por
   * matricula + CPF, nao precisa de senha). Idempotente: re-registro do
   * mesmo CPF (ja interno) atualiza nome/email/matricula e PRESERVA o
   * senhaHash existente caso o user ja tivesse setado (compat).
   *
   * NAO valida a matricula contra base externa — assume confianca +
   * auditoria posterior pelo admin.
   */
  async registerStudent(input: StudentRegisterInput): Promise<LoginResponse> {
    const event = await this.prisma.event.findUnique({ where: { id: input.eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');
    if (event.status !== EventStatus.PUBLISHED && event.status !== EventStatus.RUNNING) {
      throw new ForbiddenException('Evento nao esta aceitando cadastros');
    }

    // Garante que a matricula nao colide com outro CPF.
    const existingByMatricula = await this.prisma.user.findUnique({
      where: { matricula: input.matricula },
    });
    if (existingByMatricula && existingByMatricula.cpf !== input.cpf) {
      throw new ConflictException(
        'Matricula ja vinculada a outro CPF. Procure a equipe da organizacao.',
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { cpf: input.cpf } });

    let userId: string;
    let userNome: string;

    if (existing) {
      if (existing.tipoPerfil !== UserType.STUDENT) {
        throw new ConflictException('CPF ja cadastrado com outro perfil');
      }
      if (existing.studentKind === StudentKind.EXTERNAL) {
        throw new ConflictException(
          'CPF ja cadastrado como visitante externo. Faca login pela rota de visitante.',
        );
      }
      // INTERNAL existente (legado importado por CSV ou re-registro):
      // atualiza dados, PRESERVA senhaHash (nao tocamos).
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          nome: input.nome,
          email: input.email,
          matricula: input.matricula,
        },
      });
      userId = updated.id;
      userNome = updated.nome;
    } else {
      const created = await this.prisma.user.create({
        data: {
          nome: input.nome,
          cpf: input.cpf,
          email: input.email,
          matricula: input.matricula,
          // senhaHash: null por default — login do estudante e matricula+CPF.
          tipoPerfil: UserType.STUDENT,
          studentKind: StudentKind.INTERNAL,
        },
      });
      userId = created.id;
      userNome = created.nome;
    }

    await this.prisma.eventMember.upsert({
      where: {
        eventId_userId_role: {
          eventId: event.id,
          userId,
          role: EventMemberRole.STUDENT,
        },
      },
      update: {},
      create: { eventId: event.id, userId, role: EventMemberRole.STUDENT },
    });

    return this.issueTokens(userId, 'STUDENT', userNome);
  }

  /**
   * Login de visitante externo: CPF + senha. So permite login para usuarios
   * que se auto-cadastraram (studentKind = EXTERNAL e tem senhaHash).
   */
  async loginVisitor(input: VisitorLoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { cpf: input.cpf } });
    if (
      !user ||
      !user.ativo ||
      user.tipoPerfil !== UserType.STUDENT ||
      user.studentKind !== StudentKind.EXTERNAL ||
      !user.senhaHash
    ) {
      throw new UnauthorizedException('CPF ou senha invalidos');
    }
    const ok = await bcrypt.compare(input.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedException('CPF ou senha invalidos');
    return this.issueTokens(user.id, 'STUDENT', user.nome);
  }

  // ---------------------------------------------------------
  // Token issuance + refresh rotation
  // ---------------------------------------------------------

  /**
   * Login de voluntario: CPF + senha. Aceita apenas users com
   * tipoPerfil = VOLUNTEER + ao menos um EventMember VOLUNTEER_* ativo.
   * As permissoes contextuais (estudantes vs empresas) sao resolvidas
   * por evento via EventMembershipService nos controllers.
   */
  async loginVolunteer(input: VolunteerLoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { cpf: input.cpf },
      include: {
        eventMembers: {
          where: {
            role: { in: [EventMemberRole.VOLUNTEER_STUDENTS, EventMemberRole.VOLUNTEER_COMPANIES] },
          },
          select: { eventId: true },
        },
      },
    });
    if (
      !user ||
      !user.ativo ||
      user.tipoPerfil !== UserType.VOLUNTEER ||
      !user.senhaHash ||
      user.eventMembers.length === 0
    ) {
      throw new UnauthorizedException('Credenciais invalidas');
    }
    const ok = await bcrypt.compare(input.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedException('Credenciais invalidas');
    return this.issueTokens(user.id, 'VOLUNTEER', user.nome);
  }

  private async issueTokens(
    userId: string,
    tipoPerfil: 'ADMIN' | 'COMPANY' | 'STUDENT' | 'VOLUNTEER',
    nome: string,
  ): Promise<LoginResponse> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, tipoPerfil } satisfies JwtAccessPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti } satisfies JwtRefreshPayload,
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
      },
    );

    // Registra refresh jti -> userId para permitir rotacao/revogacao
    const ttlDays = 7 * 24 * 60 * 60;
    await this.redis.client.set(`refresh:${jti}`, userId, 'EX', ttlDays);

    return {
      accessToken,
      refreshToken,
      user: { id: userId, tipoPerfil, nome },
    };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const storedUserId = await this.redis.client.get(`refresh:${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    // Rotaciona: revoga o jti antigo
    await this.redis.client.del(`refresh:${payload.jti}`);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) throw new UnauthorizedException('Usuario inativo');

    return this.issueTokens(user.id, user.tipoPerfil, user.nome);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
      await this.redis.client.del(`refresh:${payload.jti}`);
    } catch {
      // logout idempotente - nao falha se token ja e invalido
    }
  }

  /**
   * Lista escopos de voluntario do user logado, agrupados por evento.
   * Retorno: [{ eventId, eventNome, scopes: ['VOLUNTEER_STUDENTS', ...] }]
   * Usado pelo dashboard `/voluntario` para listar eventos e acoes.
   */
  async listVolunteerScopes(userId: string): Promise<
    Array<{ eventId: string; eventNome: string; scopes: ('VOLUNTEER_STUDENTS' | 'VOLUNTEER_COMPANIES')[] }>
  > {
    const members = await this.prisma.eventMember.findMany({
      where: {
        userId,
        role: {
          in: [EventMemberRole.VOLUNTEER_STUDENTS, EventMemberRole.VOLUNTEER_COMPANIES],
        },
      },
      include: { event: { select: { id: true, nome: true, startsAt: true } } },
      orderBy: { event: { startsAt: 'desc' } },
    });
    const byEvent = new Map<
      string,
      { eventId: string; eventNome: string; scopes: ('VOLUNTEER_STUDENTS' | 'VOLUNTEER_COMPANIES')[] }
    >();
    for (const m of members) {
      const existing = byEvent.get(m.event.id);
      const scope = m.role as 'VOLUNTEER_STUDENTS' | 'VOLUNTEER_COMPANIES';
      if (existing) {
        if (!existing.scopes.includes(scope)) existing.scopes.push(scope);
      } else {
        byEvent.set(m.event.id, {
          eventId: m.event.id,
          eventNome: m.event.nome,
          scopes: [scope],
        });
      }
    }
    return Array.from(byEvent.values());
  }

  async validateAccessPayload(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo');
    }
    return { id: user.id, tipoPerfil: user.tipoPerfil, nome: user.nome };
  }
}
