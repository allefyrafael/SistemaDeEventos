import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../config/env.schema';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) public readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Reserva um jti em um Set com expiracao - retorna true se foi a primeira vez
   * (usado para invalidar JWTs de QR Code apos o primeiro uso - RN04 anti-print).
   */
  async claimJti(jti: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(`jti:used:${jti}`, '1', 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }
}

export function createRedisClient(config: ConfigService<Env, true>): Redis {
  const url = config.get('REDIS_URL', { infer: true });
  const client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  const logger = new Logger('RedisClient');
  client.on('connect', () => logger.log('Redis connected'));
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  return client;
}
