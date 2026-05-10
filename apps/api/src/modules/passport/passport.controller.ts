import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  stampConfigCreateSchema,
  stampConfigUpdateSchema,
  type StampConfigCreateInput,
  type StampConfigUpdateInput,
} from '@eventpass/shared';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { PassportService } from './passport.service';

@Controller('events/:eventId/passport')
@UseGuards(EnabledModuleGuard)
@RequiresModule('passport')
export class PassportController {
  constructor(
    private readonly passport: PassportService,
    private readonly membership: EventMembershipService,
  ) {}

  // ---------- Stamps (RF04) ----------

  @Get('stamps')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    return this.passport.listStamps(eventId);
  }

  @Post('stamps')
  @Roles(UserType.ADMIN)
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(stampConfigCreateSchema)) dto: StampConfigCreateInput,
  ) {
    return this.passport.createStamp(eventId, dto);
  }

  @Patch('stamps/:stampId')
  @Roles(UserType.ADMIN)
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('stampId', new ParseUUIDPipe()) stampId: string,
    @Body(new ZodValidationPipe(stampConfigUpdateSchema)) dto: StampConfigUpdateInput,
  ) {
    return this.passport.updateStamp(eventId, stampId, dto);
  }

  @Delete('stamps/:stampId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('stampId', new ParseUUIDPipe()) stampId: string,
  ) {
    await this.passport.removeStamp(eventId, stampId);
  }

  // ---------- Status aluno (RF08) ----------

  // Estudante logado consulta seu proprio passaporte
  @Get('me/status')
  @Roles(UserType.STUDENT)
  myStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.passport.getStatus(eventId, user.id);
  }

  // Admin consulta passaporte de um aluno qualquer
  @Get('students/:studentId/status')
  @Roles(UserType.ADMIN)
  statusOfStudent(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.passport.getStatus(eventId, studentId);
  }
}
