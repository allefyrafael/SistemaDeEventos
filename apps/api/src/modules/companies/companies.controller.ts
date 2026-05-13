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
import { EventMemberRole, UserType } from '@prisma/client';
import {
  companyCreateSchema,
  companyUpdateSchema,
  responsavelSenhaResetSchema,
  type CompanyCreateInput,
  type CompanyUpdateInput,
  type ResponsavelSenhaResetInput,
} from '@eventpass/shared';
import { z } from 'zod';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { VolunteersService } from '../volunteers/volunteers.service';
import { CompaniesService } from './companies.service';

const logoSchema = z.object({ logoKey: z.string().max(300).nullable() });

@Controller('events/:eventId/companies')
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly membership: EventMembershipService,
    private readonly volunteers: VolunteersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    return this.companies.list(eventId);
  }

  @Get(':companyId')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    await this.membership.assertUserCanAccessEvent(user, eventId);
    return this.companies.findOne(eventId, companyId);
  }

  @Post()
  @Roles(UserType.ADMIN, UserType.VOLUNTEER)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(companyCreateSchema)) dto: CompanyCreateInput,
  ) {
    // Voluntario Empresas pode cadastrar; admin global tambem pode.
    await this.volunteers.assertScopeInEvent(
      { id: user.id, tipoPerfil: user.tipoPerfil },
      eventId,
      'VOLUNTEER_COMPANIES',
    );
    return this.companies.create(eventId, dto);
  }

  @Patch(':companyId')
  @Roles(UserType.ADMIN)
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body(new ZodValidationPipe(companyUpdateSchema)) dto: CompanyUpdateInput,
  ) {
    return this.companies.update(eventId, companyId, dto);
  }

  @Delete(':companyId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    await this.companies.remove(eventId, companyId);
  }

  /**
   * Reset administrativo de senha de um responsavel de empresa. Usado pelo
   * admin (e, na proxima rodada, pelo Voluntario Empresas) quando o
   * responsavel esquece a senha ou precisa de senha inicial.
   */
  @Patch(':companyId/responsaveis/:userId/senha')
  @Roles(UserType.ADMIN, UserType.VOLUNTEER)
  @HttpCode(204)
  async resetResponsavelSenha(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(responsavelSenhaResetSchema))
    dto: ResponsavelSenhaResetInput,
  ) {
    await this.volunteers.assertScopeInEvent(
      { id: actor.id, tipoPerfil: actor.tipoPerfil },
      eventId,
      'VOLUNTEER_COMPANIES',
    );
    await this.companies.resetResponsavelSenha(
      eventId,
      companyId,
      userId,
      dto.novaSenha,
    );
  }

  @Patch(':companyId/logo')
  @Roles(UserType.ADMIN)
  setLogo(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body(new ZodValidationPipe(logoSchema)) dto: { logoKey: string | null },
  ) {
    return this.companies.setLogoKey(eventId, companyId, dto.logoKey);
  }

  // Para a empresa logada descobrir qual stand ela representa no evento atual
  @Get('mine/context')
  @Roles(UserType.COMPANY)
  async myContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.membership.assertRoleInEvent(user, eventId, [
      EventMemberRole.COMPANY_REP,
      EventMemberRole.ADMIN,
    ]);
    const rows = await this.companies.list(eventId);
    return rows.filter((c) =>
      c.responsaveis.some((r: { id: string }) => r.id === user.id),
    );
  }
}
