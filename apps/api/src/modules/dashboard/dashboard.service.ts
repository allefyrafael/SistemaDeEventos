import { Injectable } from '@nestjs/common';
import { EventMemberRole } from '@prisma/client';
import type { DashboardSummary } from '@eventpass/shared';

import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(eventId: string): Promise<DashboardSummary> {
    const [
      totalParticipantes,
      participantesComCarimbo,
      stampsObrigatorios,
      totalCarimbos,
      topVisitadas,
      avaliacoes,
      picos,
    ] = await Promise.all([
      this.prisma.eventMember.count({
        where: { eventId, role: EventMemberRole.STUDENT },
      }),
      this.prisma.studentProgress.groupBy({
        by: ['studentId'],
        where: { eventId },
        _count: { studentId: true },
      }),
      this.prisma.stampConfig.count({ where: { eventId, obrigatorio: true } }),
      this.prisma.studentProgress.count({ where: { eventId } }),
      this.prisma.studentProgress.groupBy({
        by: ['companyId'],
        where: { eventId },
        _count: { companyId: true },
        orderBy: { _count: { companyId: 'desc' } },
        take: 10,
      }),
      this.prisma.evaluation.groupBy({
        by: ['companyId'],
        where: { eventId, nota: { not: null } },
        _avg: { nota: true },
        _count: { companyId: true },
        orderBy: { _avg: { nota: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRaw<Array<{ hora: Date; total: bigint }>>`
        SELECT date_trunc('hour', "dataConclusao") AS hora, COUNT(*)::bigint AS total
        FROM student_progress
        WHERE "eventId" = ${eventId}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const companyIds = new Set<string>([
      ...topVisitadas.map((r) => r.companyId),
      ...avaliacoes.map((r) => r.companyId),
    ]);
    const companies = await this.prisma.company.findMany({
      where: { id: { in: Array.from(companyIds) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(companies.map((c) => [c.id, c.nome]));

    const empresasMaisVisitadas = topVisitadas.map((r) => ({
      companyId: r.companyId,
      nome: nomePorId.get(r.companyId) ?? '',
      carimbos: r._count.companyId,
    }));
    const empresasMelhorAvaliadas = avaliacoes.map((r) => ({
      companyId: r.companyId,
      nome: nomePorId.get(r.companyId) ?? '',
      notaMedia: Number((r._avg.nota ?? 0).toFixed(2)),
      totalAvaliacoes: r._count.companyId,
    }));

    // Concludentes: alunos com TODOS os stamps obrigatorios e feedback respondido.
    let concludentes = 0;
    if (stampsObrigatorios > 0) {
      const rows = await this.prisma.studentProgress.groupBy({
        by: ['studentId'],
        where: { eventId, feedbackRespondido: true, stampConfig: { obrigatorio: true } },
        _count: { stampConfigId: true },
      });
      concludentes = rows.filter((r) => r._count.stampConfigId >= stampsObrigatorios).length;
    }

    return {
      eventId,
      totalParticipantes,
      participantesAtivos: participantesComCarimbo.length,
      concludentes,
      totalCarimbos,
      empresasMaisVisitadas,
      empresasMelhorAvaliadas,
      picosHorario: picos.map((p) => ({
        hora: p.hora.toISOString(),
        carimbos: Number(p.total),
      })),
    };
  }
}
