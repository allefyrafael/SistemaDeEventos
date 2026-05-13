import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  adminCreateSchema,
  externalStudentSignupSchema,
  senhaResetSchema,
  studentProfileUpdateSchema,
  type AdminCreateInput,
  type ExternalStudentSignupInput,
  type SenhaResetInput,
  type StudentProfileUpdateInput,
} from '@eventpass/shared';
import { z } from 'zod';
import type { Request } from 'express';

import { EventMembershipService } from '../../core/event-membership/event-membership.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { VolunteersService } from '../volunteers/volunteers.service';
import { UsersService } from './users.service';

const csvImportSchema = z.object({
  csv: z.string().min(10),
});

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly membership: EventMembershipService,
    private readonly volunteers: VolunteersService,
  ) {}

  @Get('admins')
  @Roles(UserType.ADMIN)
  listAdmins() {
    return this.users.listAdmins();
  }

  @Post('admins')
  @Roles(UserType.ADMIN)
  createAdmin(@Body(new ZodValidationPipe(adminCreateSchema)) dto: AdminCreateInput) {
    return this.users.createAdmin(dto);
  }

  @Post('events/:eventId/students/import')
  @Roles(UserType.ADMIN)
  importStudents(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(csvImportSchema)) dto: { csv: string },
  ) {
    if (dto.csv.length > 2_000_000) {
      throw new BadRequestException('CSV acima de 2MB');
    }
    return this.users.importStudentsCsv(eventId, dto.csv);
  }

  @Get('events/:eventId/students')
  @Roles(UserType.ADMIN, UserType.VOLUNTEER)
  async listStudents(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    await this.volunteers.assertScopeInEvent(
      { id: actor.id, tipoPerfil: actor.tipoPerfil },
      eventId,
      'VOLUNTEER_STUDENTS',
    );
    return this.users.listEventStudents(eventId);
  }

  /**
   * Reset administrativo de senha de estudante: admin global ou
   * Voluntario Estudantes do evento. O Voluntario Estudantes NUNCA
   * visualiza a senha atual (so atribui nova).
   */
  @Patch('events/:eventId/students/:userId/senha')
  @Roles(UserType.ADMIN, UserType.VOLUNTEER)
  async resetStudentSenha(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(senhaResetSchema)) dto: SenhaResetInput,
  ) {
    await this.volunteers.assertScopeInEvent(
      { id: actor.id, tipoPerfil: actor.tipoPerfil },
      eventId,
      'VOLUNTEER_STUDENTS',
    );
    await this.users.resetStudentSenha(eventId, userId, dto.novaSenha);
  }

  // Cadastro manual de visitante externo - publico para suportar self-signup.
  @Public()
  @Post('events/:eventId/signup/external')
  signupExternal(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(externalStudentSignupSchema))
    dto: ExternalStudentSignupInput,
  ) {
    return this.users.registerExternalStudent(eventId, dto);
  }

  // -----------------------------------------------------------
  // Perfil do proprio estudante
  // -----------------------------------------------------------

  @Get('me/profile')
  @Roles(UserType.STUDENT)
  myProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getStudentProfile(user.id);
  }

  @Patch('me/profile')
  @Roles(UserType.STUDENT)
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(studentProfileUpdateSchema))
    dto: StudentProfileUpdateInput,
    @Req() _req: Request,
  ) {
    return this.users.updateStudentProfile(user.id, dto);
  }
}
