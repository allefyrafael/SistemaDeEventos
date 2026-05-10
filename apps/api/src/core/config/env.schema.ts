import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Infra
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // JWT - 3 segredos separados para 3 proposito distintos
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_QR_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  JWT_QR_TTL: z.string().default('30s'),

  // App
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Storage
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),

  // Observabilidade
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const lines = Object.entries(flat).map(
      ([k, v]) => `  - ${k}: ${(v ?? []).join(', ')}`,
    );
    throw new Error(
      `Invalid environment variables:\n${lines.join('\n')}\n` +
        `Copy .env.example to .env and fill missing values.`,
    );
  }
  return parsed.data;
}
