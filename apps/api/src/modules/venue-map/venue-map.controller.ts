import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  activityCreateSchema,
  activityUpdateSchema,
  mapLocationCreateSchema,
  mapLocationUpdateSchema,
  venueMapConfigSchema,
  type ActivityCreateInput,
  type ActivityUpdateInput,
  type MapLocationCreateInput,
  type MapLocationUpdateInput,
  type VenueMapConfigInput,
} from '@eventpass/shared';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { VenueMapService } from './venue-map.service';

@Controller('events/:eventId/venue-map')
export class VenueMapController {
  constructor(
    private readonly svc: VenueMapService,
    private readonly membership: EventMembershipService,
  ) {}

  // -----------------------------------------------------------
  // Read (qualquer membro do evento ou ADMIN)
  // -----------------------------------------------------------

  @Get()
  async get(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    const viewerId = user.tipoPerfil === UserType.STUDENT ? user.id : null;
    return this.svc.getForViewer(eventId, viewerId);
  }

  // -----------------------------------------------------------
  // Config do mapa (admin)
  // -----------------------------------------------------------

  @Put()
  @Roles(UserType.ADMIN)
  updateConfig(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(venueMapConfigSchema)) dto: VenueMapConfigInput,
  ) {
    return this.svc.updateConfig(eventId, dto);
  }

  // -----------------------------------------------------------
  // Locations CRUD (admin)
  // -----------------------------------------------------------

  @Post('locations')
  @Roles(UserType.ADMIN)
  createLocation(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(mapLocationCreateSchema)) dto: MapLocationCreateInput,
  ) {
    return this.svc.createLocation(eventId, dto);
  }

  @Patch('locations/:id')
  @Roles(UserType.ADMIN)
  updateLocation(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(mapLocationUpdateSchema)) dto: MapLocationUpdateInput,
  ) {
    return this.svc.updateLocation(eventId, id, dto);
  }

  @Delete('locations/:id')
  @Roles(UserType.ADMIN)
  deleteLocation(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.deleteLocation(eventId, id);
  }

  // -----------------------------------------------------------
  // Activities CRUD (admin)
  // -----------------------------------------------------------

  @Post('locations/:locationId/activities')
  @Roles(UserType.ADMIN)
  createActivity(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('locationId', new ParseUUIDPipe()) locationId: string,
    @Body(new ZodValidationPipe(activityCreateSchema)) dto: ActivityCreateInput,
  ) {
    return this.svc.createActivity(eventId, locationId, dto);
  }

  @Patch('activities/:activityId')
  @Roles(UserType.ADMIN)
  updateActivity(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('activityId', new ParseUUIDPipe()) activityId: string,
    @Body(new ZodValidationPipe(activityUpdateSchema)) dto: ActivityUpdateInput,
  ) {
    return this.svc.updateActivity(eventId, activityId, dto);
  }

  @Delete('activities/:activityId')
  @Roles(UserType.ADMIN)
  deleteActivity(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('activityId', new ParseUUIDPipe()) activityId: string,
  ) {
    return this.svc.deleteActivity(eventId, activityId);
  }

  // -----------------------------------------------------------
  // Registration (estudante)
  // -----------------------------------------------------------

  @Post('activities/:activityId/register')
  @Roles(UserType.STUDENT)
  register(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('activityId', new ParseUUIDPipe()) activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.register(eventId, activityId, user.id);
  }

  @Delete('activities/:activityId/register')
  @Roles(UserType.STUDENT)
  unregister(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('activityId', new ParseUUIDPipe()) activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.unregister(eventId, activityId, user.id);
  }
}
