import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  FeedbackSaveTemplateInput,
  FeedbackSubmitInput,
  FeedbackTemplate,
} from '@eventpass/shared';
import { feedbackTemplateSchema } from '@eventpass/shared';

import { PrismaService } from '../../core/prisma/prisma.service';

/** Template default aplicado quando o admin nao cadastrou um explicitamente. */
const DEFAULT_TEMPLATE: FeedbackTemplate = {
  questions: [
    {
      id: 'nota',
      type: 'rating',
      label: 'De 1 a 5, como voce avalia sua visita?',
      required: true,
      min: 1,
      max: 5,
    },
    {
      id: 'interesse_vaga',
      type: 'single',
      label: 'Voce tem interesse em vagas desta empresa?',
      required: true,
      options: ['Sim', 'Talvez', 'Nao'],
    },
    {
      id: 'comentario',
      type: 'text',
      label: 'Comentario (opcional)',
      required: false,
      maxLength: 500,
    },
  ],
};

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // Templates
  // -------------------------------------------------------

  async saveTemplate(eventId: string, input: FeedbackSaveTemplateInput) {
    const schema = feedbackTemplateSchema.parse(input.schema);
    const companyId = input.companyId ?? null;
    const existing = await this.prisma.feedbackTemplate.findFirst({
      where: { eventId, companyId },
    });
    if (existing) {
      return this.prisma.feedbackTemplate.update({
        where: { id: existing.id },
        data: { schema: schema as unknown as Prisma.InputJsonValue },
      });
    }
    return this.prisma.feedbackTemplate.create({
      data: {
        eventId,
        companyId,
        schema: schema as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getTemplate(eventId: string, companyId?: string | null): Promise<FeedbackTemplate> {
    // Busca template especifico da empresa, senao usa o default do evento
    if (companyId) {
      const specific = await this.prisma.feedbackTemplate.findUnique({
        where: { eventId_companyId: { eventId, companyId } },
      });
      if (specific) return feedbackTemplateSchema.parse(specific.schema);
    }
    const base = await this.prisma.feedbackTemplate.findFirst({
      where: { eventId, companyId: null },
    });
    if (base) return feedbackTemplateSchema.parse(base.schema);
    return DEFAULT_TEMPLATE;
  }

  // -------------------------------------------------------
  // Submissao do aluno (RF07)
  // -------------------------------------------------------

  async submitFeedback(
    eventId: string,
    studentId: string,
    input: FeedbackSubmitInput,
  ) {
    // O feedback so faz sentido para uma empresa em que o aluno JA recebeu carimbo.
    const progressos = await this.prisma.studentProgress.findMany({
      where: { eventId, studentId, companyId: input.companyId },
    });
    if (progressos.length === 0) {
      throw new BadRequestException(
        'Aluno nao possui carimbo desta empresa - feedback nao aplicavel',
      );
    }

    const template = await this.getTemplate(eventId, input.companyId);
    this.validateAnswers(template, input);

    const evaluation = await this.prisma.evaluation.upsert({
      where: { studentId_companyId: { studentId, companyId: input.companyId } },
      update: {
        nota: input.nota ?? null,
        respostas: input.respostas as Prisma.InputJsonValue,
      },
      create: {
        eventId,
        studentId,
        companyId: input.companyId,
        nota: input.nota ?? null,
        respostas: input.respostas as Prisma.InputJsonValue,
      },
    });

    // Marca todos os progress dessa empresa p/ esse aluno como feedback respondido.
    await this.prisma.studentProgress.updateMany({
      where: { eventId, studentId, companyId: input.companyId },
      data: { feedbackRespondido: true },
    });

    return { id: evaluation.id, feedbackRespondido: true };
  }

  async pendingForStudent(eventId: string, studentId: string) {
    // Empresas em que o aluno tem carimbo mas ainda nao avaliou.
    const progressos = await this.prisma.studentProgress.findMany({
      where: { eventId, studentId, feedbackRespondido: false },
      include: { company: { select: { id: true, nome: true } } },
    });
    const seen = new Set<string>();
    const pendentes: Array<{ companyId: string; nome: string }> = [];
    for (const p of progressos) {
      if (seen.has(p.companyId)) continue;
      seen.add(p.companyId);
      pendentes.push({ companyId: p.companyId, nome: p.company.nome });
    }
    return pendentes;
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------

  private validateAnswers(template: FeedbackTemplate, input: FeedbackSubmitInput): void {
    for (const q of template.questions) {
      const ans = input.respostas[q.id];
      if (q.required && (ans === undefined || ans === null || ans === '')) {
        throw new BadRequestException(`Resposta obrigatoria ausente: ${q.id}`);
      }
      if (ans === undefined) continue;
      if (q.type === 'rating') {
        if (typeof ans !== 'number' || ans < q.min || ans > q.max) {
          throw new BadRequestException(`Resposta invalida para rating: ${q.id}`);
        }
      } else if (q.type === 'single') {
        if (typeof ans !== 'string' || !q.options.includes(ans)) {
          throw new BadRequestException(`Resposta invalida para single: ${q.id}`);
        }
      } else if (q.type === 'multi') {
        if (!Array.isArray(ans) || ans.some((a) => !q.options.includes(a))) {
          throw new BadRequestException(`Resposta invalida para multi: ${q.id}`);
        }
      } else if (q.type === 'text') {
        if (typeof ans !== 'string' || ans.length > q.maxLength) {
          throw new BadRequestException(`Resposta invalida para text: ${q.id}`);
        }
      }
    }
  }
}
