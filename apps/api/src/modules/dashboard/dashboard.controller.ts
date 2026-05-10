import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { UserType } from '@prisma/client';

import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('events/:eventId/dashboard')
@UseGuards(EnabledModuleGuard)
@RequiresModule('dashboard_live')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Roles(UserType.ADMIN)
  summary(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.dashboard.summary(eventId);
  }
}
