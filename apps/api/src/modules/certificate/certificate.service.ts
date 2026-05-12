import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { CertificateDto } from '@eventpass/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Emite e valida certificados de conclusao do passaporte.
 *
 * Regra de elegibilidade (RN03): aluno completa todos os stamps marcados
 * `obrigatorio` E respondeu o feedback de cada um (`feedbackRespondido`).
 * A geracao e idempotente — chamadas repetidas retornam o mesmo registro.
 */
@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera certificado para o estudante no evento, ou retorna o existente
   * se ja foi emitido antes. Verifica RN03 antes de criar.
   */
  async issueForStudent(eventId: string, studentId: string): Promise<CertificateDto> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento nao encontrado');

    // RN03 — checa se o aluno realmente concluiu antes de emitir
    const [stamps, progressos] = await Promise.all([
      this.prisma.stampConfig.findMany({
        where: { eventId, obrigatorio: true },
        select: { id: true },
      }),
      this.prisma.studentProgress.findMany({
        where: { eventId, studentId, feedbackRespondido: true },
        select: { stampConfigId: true },
      }),
    ]);
    const completedIds = new Set(progressos.map((p) => p.stampConfigId));
    const requiredIds = stamps.map((s) => s.id);
    const completedRequired = requiredIds.filter((id) => completedIds.has(id));
    if (requiredIds.length === 0) {
      throw new ConflictException(
        'Evento ainda nao tem itens obrigatorios cadastrados',
      );
    }
    if (completedRequired.length < requiredIds.length) {
      throw new ForbiddenException(
        `Voce ainda nao concluiu o passaporte (${completedRequired.length}/${requiredIds.length} carimbos obrigatorios + feedback).`,
      );
    }

    // Idempotente: retorna existente
    const existing = await this.prisma.certificate.findUnique({
      where: { eventId_studentId: { eventId, studentId } },
      include: { event: true, student: true },
    });
    if (existing) {
      return this.toDto(existing, requiredIds.length, completedRequired.length);
    }

    // Gera codigo curto unico (~10 chars hex, retry se colisao improvavel)
    let code = '';
    for (let i = 0; i < 5; i++) {
      const candidate = randomBytes(5).toString('hex').toUpperCase();
      const clash = await this.prisma.certificate.findUnique({ where: { code: candidate } });
      if (!clash) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new ConflictException('Nao foi possivel gerar codigo unico, tente novamente');

    const created = await this.prisma.certificate.create({
      data: { eventId, studentId, code },
      include: { event: true, student: true },
    });
    return this.toDto(created, requiredIds.length, completedRequired.length);
  }

  /**
   * Valida um certificado pelo codigo publico. Sem auth. Retorna dados
   * suficientes pra renderizar o certificado e provar a autenticidade.
   */
  async findByCode(code: string): Promise<CertificateDto> {
    const cert = await this.prisma.certificate.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { event: true, student: true },
    });
    if (!cert) throw new NotFoundException('Certificado nao encontrado');

    // Calcula totals atuais (snapshot na hora da geracao seria mais correto;
    // tudo bem por agora — itens obrigatorios raramente mudam apos a emissao).
    const [requiredCount, completedCount] = await Promise.all([
      this.prisma.stampConfig.count({
        where: { eventId: cert.eventId, obrigatorio: true },
      }),
      this.prisma.studentProgress.count({
        where: {
          eventId: cert.eventId,
          studentId: cert.studentId,
          feedbackRespondido: true,
          stampConfig: { obrigatorio: true },
        },
      }),
    ]);
    return this.toDto(cert, requiredCount, completedCount);
  }

  private toDto(
    row: {
      id: string;
      code: string;
      eventId: string;
      studentId: string;
      generatedAt: Date;
      event: { id: string; nome: string; startsAt: Date; endsAt: Date };
      student: {
        id: string;
        nome: string;
        matricula: string | null;
        studentKind: 'INTERNAL' | 'EXTERNAL' | null;
      };
    },
    totalRequired: number,
    totalCompleted: number,
  ): CertificateDto {
    return {
      id: row.id,
      code: row.code,
      eventId: row.eventId,
      eventNome: row.event.nome,
      eventStartsAt: row.event.startsAt.toISOString(),
      eventEndsAt: row.event.endsAt.toISOString(),
      studentId: row.studentId,
      studentNome: row.student.nome,
      studentMatricula: row.student.matricula,
      studentTipo: row.student.studentKind ?? 'INTERNAL',
      generatedAt: row.generatedAt.toISOString(),
      totalRequired,
      totalCompleted,
    };
  }
}
