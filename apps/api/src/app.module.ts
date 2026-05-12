import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppConfigModule } from './core/config/config.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { AuditModule } from './core/audit/audit.module';
import { EventMembershipModule } from './core/event-membership/event-membership.module';
import { ModuleRegistryModule } from './core/module-registry/module-registry.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { PassportModule } from './modules/passport/passport.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { ScanModule } from './modules/scan/scan.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExportsModule } from './modules/exports/exports.module';
import { VenueMapModule } from './modules/venue-map/venue-map.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    EventMembershipModule,
    ModuleRegistryModule,
    // Limite generoso: o painel admin + varias abas disparam varios GET ao mesmo
    // IP; 120/min gerava 429 em desenvolvimento. Auth permanece restrito.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 800 },
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    HealthModule,
    AuthModule,
    EventsModule,
    UsersModule,
    CompaniesModule,
    PassportModule,
    CertificateModule,
    ScanModule,
    FeedbackModule,
    DashboardModule,
    ExportsModule,
    VenueMapModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Auth por padrao em TODAS as rotas; usar @Public() para abrir
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RolesGuard complementar: so exige perfil quando @Roles(...) decorado
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
