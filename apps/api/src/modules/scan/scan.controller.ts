import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  scanRequestSchema,
  scanSyncBatchSchema,
  type ScanRequest,
  type ScanSyncBatch,
} from '@eventpass/shared';
import type { Request } from 'express';

import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { ScanService } from './scan.service';

function requestContext(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('events/:eventId')
@UseGuards(EnabledModuleGuard)
@RequiresModule('qr_scan')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  // RF05: aluno obtem o token do QR (rotaciona a cada poucos segundos no cliente)
  @Post('qr/token')
  @Roles(UserType.STUDENT)
  issue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.scan.issueQrToken(eventId, user.id);
  }

  // RF06: empresa envia leitura do QR
  @Post('scan')
  @Roles(UserType.COMPANY, UserType.ADMIN)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(scanRequestSchema)) dto: ScanRequest,
    @Req() req: Request,
  ) {
    return this.scan.performScan(eventId, user.id, dto, requestContext(req));
  }

  // RNF03: sync em lote pos-offline
  @Post('scan/sync')
  @Roles(UserType.COMPANY, UserType.ADMIN)
  sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(scanSyncBatchSchema)) dto: ScanSyncBatch,
    @Req() req: Request,
  ) {
    return this.scan.performScanBatch(eventId, user.id, dto.items, requestContext(req));
  }

  // Auxilia a UI da empresa: lista stamps que ela pode carimbar no evento
  @Get('scan/grantable-stamps')
  @Roles(UserType.COMPANY, UserType.ADMIN)
  grantable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.scan.listStampsCompanyCanGrant(eventId, user.id);
  }

  // Historico de visitas recebidas pela(s) empresa(s) do usuario logado
  @Get('scan/history')
  @Roles(UserType.COMPANY, UserType.ADMIN)
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.scan.listCompanyVisits(eventId, user.id);
  }
}
