import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventMemberRole, StudentKind, UserType } from '@prisma/client';
import type {
  AdminCreateInput,
  ExternalStudentSignupInput,
  StudentImportResult,
  StudentProfileUpdateInput,
} from '@eventpass/shared';
import { studentCsvRowSchema } from '@eventpass/shared';

import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { detectHeaders, parseCsv } from './csv-parser';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // -------------------------------------------------------
  // Admins
  // -------------------------------------------------------

  async listAdmins() {
    const rows = await this.prisma.user.findMany({
      where: { tipoPerfil: UserType.ADMIN },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createAdmin(input: AdminCreateInput) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ cpf: input.cpf }, { email: input.email }] },
      select: { id: true },
    });
    if (existing) throw new ConflictException('CPF ou email ja cadastrado');

    const senhaHash = await this.auth.hashPassword(input.senha);
    const user = await this.prisma.user.create({
      data: {
        nome: input.nome,
        cpf: input.cpf,
        email: input.email,
        senhaHash,
        tipoPerfil: UserType.ADMIN,
      },
      select: { id: true, nome: true, cpf: true, email: true, tipoPerfil: true },
    });
    return user;
  }

  // -------------------------------------------------------
  // Students
  // -------------------------------------------------------

  /**
   * RF01: importacao de estudantes internos via CSV. Upsert por matricula (unica).
   * Vincula cada aluno como EventMember(STUDENT) do evento alvo.
   */
  async importStudentsCsv(
    eventId: string,
    csvContent: string,
  ): Promise<StudentImportResult> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');

    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      throw new BadRequestException('CSV vazio ou sem cabecalho');
    }
    const [header, ...body] = rows;
    const map = detectHeaders(header);

    const result: StudentImportResult = {
      totalLinhas: body.length,
      criados: 0,
      atualizados: 0,
      ignorados: 0,
      erros: [],
    };

    for (let i = 0; i < body.length; i++) {
      const raw = body[i];
      const linha = i + 2; // header ocupa a linha 1
      const parsed = studentCsvRowSchema.safeParse({
        matricula: raw[map.matricula],
        nome: raw[map.nome],
        cpf: raw[map.cpf],
        email: raw[map.email],
      });
      if (!parsed.success) {
        result.ignorados += 1;
        result.erros.push({
          linha,
          mensagem: parsed.error.issues
            .map((iss: { message: string }) => iss.message)
            .join('; '),
        });
        continue;
      }
      const data = parsed.data;
      try {
        const existing = await this.prisma.user.findFirst({
          where: {
            OR: [{ matricula: data.matricula }, { cpf: data.cpf }],
          },
        });

        let userId: string;
        if (existing) {
          const user = await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              nome: data.nome,
              cpf: data.cpf,
              email: data.email,
              matricula: data.matricula,
              tipoPerfil: UserType.STUDENT,
              studentKind: StudentKind.INTERNAL,
              ativo: true,
            },
          });
          userId = user.id;
          result.atualizados += 1;
        } else {
          const user = await this.prisma.user.create({
            data: {
              nome: data.nome,
              cpf: data.cpf,
              email: data.email,
              matricula: data.matricula,
              tipoPerfil: UserType.STUDENT,
              studentKind: StudentKind.INTERNAL,
            },
          });
          userId = user.id;
          result.criados += 1;
        }

        await this.prisma.eventMember.upsert({
          where: {
            eventId_userId_role: {
              eventId,
              userId,
              role: EventMemberRole.STUDENT,
            },
          },
          update: {},
          create: { eventId, userId, role: EventMemberRole.STUDENT },
        });
      } catch (err) {
        result.ignorados += 1;
        result.erros.push({ linha, mensagem: (err as Error).message });
      }
    }
    return result;
  }

  /**
   * Cadastro manual de estudante externo. Vira EventMember do evento alvo.
   */
  async registerExternalStudent(eventId: string, input: ExternalStudentSignupInput) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');

    const existingByCpf = await this.prisma.user.findUnique({
      where: { cpf: input.cpf },
    });
    let user = existingByCpf;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          nome: input.nome,
          cpf: input.cpf,
          email: input.email,
          tipoPerfil: UserType.STUDENT,
          studentKind: StudentKind.EXTERNAL,
        },
      });
    }
    await this.prisma.eventMember.upsert({
      where: {
        eventId_userId_role: {
          eventId,
          userId: user.id,
          role: EventMemberRole.STUDENT,
        },
      },
      update: {},
      create: { eventId, userId: user.id, role: EventMemberRole.STUDENT },
    });
    return { id: user.id, nome: user.nome, cpf: user.cpf, email: user.email };
  }

  /** RF03: estudante atualiza LinkedIn e/ou curriculo (pdf -> S3 key). */
  async updateStudentProfile(studentId: string, input: StudentProfileUpdateInput) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user || user.tipoPerfil !== UserType.STUDENT) {
      throw new NotFoundException('Estudante nao encontrado');
    }
    return this.prisma.user.update({
      where: { id: studentId },
      data: {
        linkedinUrl: input.linkedinUrl === undefined ? undefined : input.linkedinUrl,
        curriculoKey:
          input.curriculoKey === undefined ? undefined : input.curriculoKey,
      },
      select: {
        id: true,
        nome: true,
        matricula: true,
        email: true,
        linkedinUrl: true,
        curriculoKey: true,
      },
    });
  }

  async getStudentProfile(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        nome: true,
        cpf: true,
        email: true,
        matricula: true,
        studentKind: true,
        linkedinUrl: true,
        curriculoKey: true,
      },
    });
    if (!user) throw new NotFoundException('Estudante nao encontrado');
    return user;
  }

  async listEventStudents(eventId: string) {
    return this.prisma.user.findMany({
      where: {
        eventMembers: { some: { eventId, role: EventMemberRole.STUDENT } },
        tipoPerfil: UserType.STUDENT,
      },
      select: {
        id: true,
        nome: true,
        matricula: true,
        email: true,
        cpf: true,
        studentKind: true,
      },
      orderBy: { nome: 'asc' },
    });
  }
}
