import { Injectable, NotFoundException } from '@nestjs/common';
import { EventMemberRole } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const lines: string[] = [];
  lines.push(columns.map(csvEscape).join(';'));
  for (const r of rows) {
    lines.push(columns.map((c) => csvEscape(r[c])).join(';'));
  }
  return lines.join('\n');
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * RF10 + RN03: exporta apenas os alunos que completaram TODOS os carimbos
   * obrigatorios (com feedback respondido).
   */
  async exportConcludentes(eventId: string): Promise<{ filename: string; content: string }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, startsAt: true },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado');

    const stampsObrigatorios = await this.prisma.stampConfig.count({
      where: { eventId, obrigatorio: true },
    });

    const alunos = await this.prisma.user.findMany({
      where: {
        eventMembers: { some: { eventId, role: EventMemberRole.STUDENT } },
      },
      select: {
        id: true,
        nome: true,
        matricula: true,
        cpf: true,
        email: true,
        studentKind: true,
      },
    });

    const rows: Array<Record<string, unknown>> = [];
    for (const a of alunos) {
      if (stampsObrigatorios === 0) break;
      const feitos = await this.prisma.studentProgress.count({
        where: {
          eventId,
          studentId: a.id,
          feedbackRespondido: true,
          stampConfig: { obrigatorio: true },
        },
      });
      if (feitos >= stampsObrigatorios) {
        rows.push({
          matricula: a.matricula ?? '',
          nome: a.nome,
          cpf: a.cpf,
          email: a.email ?? '',
          tipo: a.studentKind,
          carimbos_concluidos: feitos,
        });
      }
    }

    const csv = toCsv(rows, [
      'matricula',
      'nome',
      'cpf',
      'email',
      'tipo',
      'carimbos_concluidos',
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `concludentes-${event.slug}-${stamp}.csv`, content: csv };
  }
}
