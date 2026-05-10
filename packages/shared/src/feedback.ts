import { z } from 'zod';

// Tipos de perguntas suportadas no template.
export const feedbackQuestionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1).max(40),
    type: z.literal('rating'),
    label: z.string().min(2).max(200),
    required: z.boolean().default(true),
    min: z.number().int().min(1).default(1),
    max: z.number().int().max(10).default(5),
  }),
  z.object({
    id: z.string().min(1).max(40),
    type: z.literal('single'),
    label: z.string().min(2).max(200),
    required: z.boolean().default(true),
    options: z.array(z.string().min(1).max(80)).min(2).max(10),
  }),
  z.object({
    id: z.string().min(1).max(40),
    type: z.literal('multi'),
    label: z.string().min(2).max(200),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1).max(80)).min(2).max(10),
  }),
  z.object({
    id: z.string().min(1).max(40),
    type: z.literal('text'),
    label: z.string().min(2).max(200),
    required: z.boolean().default(false),
    maxLength: z.number().int().min(10).max(1000).default(500),
  }),
]);
export type FeedbackQuestion = z.infer<typeof feedbackQuestionSchema>;

export const feedbackTemplateSchema = z.object({
  questions: z.array(feedbackQuestionSchema).min(1).max(10),
});
export type FeedbackTemplate = z.infer<typeof feedbackTemplateSchema>;

export const feedbackSaveTemplateSchema = z.object({
  companyId: z.string().uuid().nullable().optional(), // null = template padrao do evento
  schema: feedbackTemplateSchema,
});
export type FeedbackSaveTemplateInput = z.infer<typeof feedbackSaveTemplateSchema>;

// Submissao do aluno apos o scan.
export const feedbackSubmitSchema = z.object({
  companyId: z.string().uuid(),
  nota: z.number().int().min(1).max(5).optional(),
  respostas: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
});
export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;
