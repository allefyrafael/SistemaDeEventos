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
  FEATURE_MODULES,
  eventCreateSchema,
  eventUpdateSchema,
  type EventCreateInput,
  type EventUpdateInput,
  type FeatureModule,
} from '@eventpass/shared';
import { z } from 'zod';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { EventsService } from './events.service';

const toggleSchema = z.object({
  module: z.enum(FEATURE_MODULES),
  enabled: z.boolean(),
});

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly membership: EventMembershipService,
  ) {}

  // ADMIN ve todos; COMPANY/STUDENT veem apenas em que sao membros.
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    if (user.tipoPerfil === UserType.ADMIN) return this.events.list();
    // Mesmo contrato EventDetail do admin: participantes precisam de `modules`
    // para esconder abas (ex.: mapa) e evitar chamadas desnecessarias.
    const rows = await this.membership.listEventsForUser(user);
    return rows.map((r) => this.events.toDetail(r));
  }

  @Get(':eventId')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    return this.events.findOne(eventId);
  }

  @Post()
  @Roles(UserType.ADMIN)
  create(@Body(new ZodValidationPipe(eventCreateSchema)) dto: EventCreateInput) {
    return this.events.create(dto);
  }

  @Patch(':eventId')
  @Roles(UserType.ADMIN)
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(eventUpdateSchema)) dto: EventUpdateInput,
  ) {
    return this.events.update(eventId, dto);
  }

  @Delete(':eventId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async remove(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    await this.events.remove(eventId);
  }

  @Post(':eventId/modules')
  @Roles(UserType.ADMIN)
  toggle(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(toggleSchema)) dto: { module: FeatureModule; enabled: boolean },
  ) {
    return this.events.toggleModule(eventId, dto.module, dto.enabled);
  }
}
