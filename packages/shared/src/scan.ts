import { z } from 'zod';

// Conteudo codificado no QR Code do estudante (payload do JWT curto, RF05).
export const qrTokenClaimsSchema = z.object({
  sub: z.string().uuid(),       // studentId
  eventId: z.string().uuid(),
  jti: z.string(),              // unico por rotacao - RN04 anti-print
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
});
export type QrTokenClaims = z.infer<typeof qrTokenClaimsSchema>;

export const qrTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
  rotateInSeconds: z.number().int().positive(),
});
export type QrTokenResponse = z.infer<typeof qrTokenResponseSchema>;

// Payload que o cliente (empresa) envia ao backend ao ler um QR.
export const scanRequestSchema = z.object({
  token: z.string().min(10),                // JWT curto do estudante
  stampConfigId: z.string().uuid(),         // qual carimbo a empresa quer conceder
  clientUuid: z.string().uuid(),            // idempotency key (essencial para sync offline)
  clientTimestamp: z.string().datetime(),   // quando o scan aconteceu (offline permitido)
});
export type ScanRequest = z.infer<typeof scanRequestSchema>;

export const scanResultSchema = z.object({
  status: z.enum(['accepted', 'duplicate', 'rejected']),
  reason: z.string().optional(),
  progressId: z.string().uuid().optional(),
  mustAnswerFeedback: z.boolean().default(true),
});
export type ScanResult = z.infer<typeof scanResultSchema>;

// Batch para sincronizacao apos modo offline.
export const scanSyncBatchSchema = z.object({
  items: z.array(scanRequestSchema).max(200),
});
export type ScanSyncBatch = z.infer<typeof scanSyncBatchSchema>;
