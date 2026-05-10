import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  eventId: z.string().uuid(),
  totalParticipantes: z.number().int().nonnegative(),
  participantesAtivos: z.number().int().nonnegative(), // com pelo menos 1 carimbo
  concludentes: z.number().int().nonnegative(),
  totalCarimbos: z.number().int().nonnegative(),
  empresasMaisVisitadas: z.array(
    z.object({
      companyId: z.string().uuid(),
      nome: z.string(),
      carimbos: z.number().int().nonnegative(),
    }),
  ),
  empresasMelhorAvaliadas: z.array(
    z.object({
      companyId: z.string().uuid(),
      nome: z.string(),
      notaMedia: z.number(),
      totalAvaliacoes: z.number().int().nonnegative(),
    }),
  ),
  picosHorario: z.array(
    z.object({
      hora: z.string(), // ISO truncado a hora
      carimbos: z.number().int().nonnegative(),
    }),
  ),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
