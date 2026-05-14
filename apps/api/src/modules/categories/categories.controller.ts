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
  companyCategoryCreateSchema,
  companyCategoryUpdateSchema,
  type CompanyCategoryCreateInput,
  type CompanyCategoryUpdateInput,
} from '@eventpass/shared';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CategoriesService } from './categories.service';

@Controller('events/:eventId/company-categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly membership: EventMembershipService,
  ) {}

  /**
   * Leitura aberta para qualquer participante autenticado do evento — o
   * cliente usa pra mostrar pills coloridos. Filtro de RBAC fica nos
   * endpoints que MUTAM (admin only).
   */
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    return this.categories.listInEvent(eventId);
  }

  @Post()
  @Roles(UserType.ADMIN)
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(companyCategoryCreateSchema))
    dto: CompanyCategoryCreateInput,
  ) {
    return this.categories.create(eventId, dto);
  }

  @Patch(':categoryId')
  @Roles(UserType.ADMIN)
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body(new ZodValidationPipe(companyCategoryUpdateSchema))
    dto: CompanyCategoryUpdateInput,
  ) {
    return this.categories.update(eventId, categoryId, dto);
  }

  @Delete(':categoryId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ) {
    await this.categories.remove(eventId, categoryId);
  }
}
