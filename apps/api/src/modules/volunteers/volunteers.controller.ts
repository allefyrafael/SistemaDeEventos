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
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  senhaResetSchema,
  volunteerCreateSchema,
  type SenhaResetInput,
  type VolunteerCreateInput,
} from '@eventpass/shared';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { VolunteersService } from './volunteers.service';

@Controller('events/:eventId/volunteers')
export class VolunteersController {
  constructor(
    private readonly volunteers: VolunteersService,
    private readonly membership: EventMembershipService,
  ) {}

  @Get()
  @Roles(UserType.ADMIN)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    // assertUserCanAccessEvent ja valida que ADMIN tem acesso global.
    void this.membership.assertUserCanAccessEvent(user, eventId);
    return this.volunteers.listInEvent(eventId);
  }

  @Post()
  @Roles(UserType.ADMIN)
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(volunteerCreateSchema)) dto: VolunteerCreateInput,
  ) {
    return this.volunteers.createInEvent(eventId, dto);
  }

  @Delete(':userId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    await this.volunteers.removeFromEvent(eventId, userId);
  }

  @Patch(':userId/senha')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async resetSenha(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(senhaResetSchema)) dto: SenhaResetInput,
  ) {
    await this.volunteers.resetSenha(eventId, userId, dto.novaSenha);
  }
}
