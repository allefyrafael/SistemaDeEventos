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
   * Empresa: dois CPFs, ambos devem estar cadastrados como
   * CompanyResponsible da MESMA empresa. Serve como "senha compartilhada"
   * entre os responsaveis daquele stand (interpretacao da spec).
   */
  async loginCompany(input: CompanyLoginInput): Promise<LoginResponse> {
    if (input.cpfEmpresa === input.cpfResponsavel) {
      throw new UnauthorizedException('CPFs devem ser diferentes');
    }

    const [cpfEmpresaUser, cpfRespUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { cpf: input.cpfEmpresa },
        include: { companyResponsible: { select: { companyId: true } } },
      }),
      this.prisma.user.findUnique({
        where: { cpf: input.cpfResponsavel },
        include: { companyResponsible: { select: { companyId: true } } },
      }),
    ]);

    if (!cpfEmpresaUser || !cpfRespUser || !cpfEmpresaUser.ativo || !cpfRespUser.ativo) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const companiesA = new Set(cpfEmpresaUser.companyResponsible.map((c) => c.companyId));
    const sharedCompany = cpfRespUser.companyResponsible.find((c) => companiesA.has(c.companyId));
    if (!sharedCompany) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    // Quem LOGA e o cpfResponsavel (quem abriu o app)
    if (cpfRespUser.tipoPerfil !== 'COMPANY') {
      throw new ForbiddenException('Perfil nao autorizado');
    }
    return this.issueTokens(cpfRespUser.id, 'COMPANY', cpfRespUser.nome);
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
   * UC########, cria User STUDENT/INTERNAL com bcrypt e associa ao evento.
   * Idempotente: re-registro do mesmo CPF (ja interno) atualiza dados.
   *
   * NAO valida a matricula contra base externa — assume confianca + auditoria
   * posterior pelo admin. Se admin importou via CSV (legado, sem senha), o
   * re-registro com este endpoint adiciona a senha sem perder progresso.
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
    const senhaHash = await this.hashPassword(input.senha);

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
      // INTERNAL existente (legado importado por CSV ou re-registro): atualiza
      // dados e ADICIONA/atualiza senha.
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          nome: input.nome,
          email: input.email,
          matricula: input.matricula,
          senhaHash,
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
          senhaHash,
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

  private async issueTokens(
    userId: string,
    tipoPerfil: 'ADMIN' | 'COMPANY' | 'STUDENT',
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

  async validateAccessPayload(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo');
    }
    return { id: user.id, tipoPerfil: user.tipoPerfil, nome: user.nome };
  }
}
