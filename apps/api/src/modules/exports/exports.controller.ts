import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import type { Response } from 'express';

import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExportsService } from './exports.service';

@Controller('events/:eventId/exports')
@UseGuards(EnabledModuleGuard)
@RequiresModule('exports_csv')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  // RF10 - CSV de concludentes
  @Get('concludentes.csv')
  @Roles(UserType.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async concludentes(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.exports.exportConcludentes(eventId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + content); // BOM para Excel PT-BR abrir corretamente
  }
}
