import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { RedisService } from '../core/redis/redis.service';
import { Public } from '../modules/auth/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get()
  async check() {
    const [db, cache] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'down'),
      this.redis.client.ping().then((r) => (r === 'PONG' ? 'ok' : 'down')).catch(() => 'down'),
    ]);
    const ok = db === 'ok' && cache === 'ok';
    return {
      status: ok ? 'ok' : 'degraded',
      checks: { db, cache },
      uptime: process.uptime(),
      ts: new Date().toISOString(),
    };
  }
}
