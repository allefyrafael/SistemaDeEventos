import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  adminLoginSchema,
  companyLoginSchema,
  studentLoginSchema,
  studentRegisterSchema,
  visitorLoginSchema,
  visitorRegisterSchema,
  volunteerLoginSchema,
  type AdminLoginInput,
  type CompanyLoginInput,
  type StudentLoginInput,
  type StudentRegisterInput,
  type VisitorLoginInput,
  type VisitorRegisterInput,
  type VolunteerLoginInput,
} from '@eventpass/shared';
import { z } from 'zod';

import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/auth.types';

const refreshSchema = z.object({ refreshToken: z.string().min(10) });
type RefreshInput = z.infer<typeof refreshSchema>;

// Throttle mais agressivo em endpoints de login (brute-force guard).
@Throttle({ auth: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login/admin')
  @HttpCode(200)
  loginAdmin(@Body(new ZodValidationPipe(adminLoginSchema)) dto: AdminLoginInput) {
    return this.auth.loginAdmin(dto);
  }

  @Public()
  @Post('login/empresa')
  @HttpCode(200)
  loginCompany(@Body(new ZodValidationPipe(companyLoginSchema)) dto: CompanyLoginInput) {
    return this.auth.loginCompany(dto);
  }

  @Public()
  @Post('login/estudante')
  @HttpCode(200)
  loginStudent(@Body(new ZodValidationPipe(studentLoginSchema)) dto: StudentLoginInput) {
    return this.auth.loginStudent(dto);
  }

  @Public()
  @Post('login/visitante')
  @HttpCode(200)
  loginVisitor(@Body(new ZodValidationPipe(visitorLoginSchema)) dto: VisitorLoginInput) {
    return this.auth.loginVisitor(dto);
  }

  @Public()
  @Post('login/voluntario')
  @HttpCode(200)
  loginVolunteer(@Body(new ZodValidationPipe(volunteerLoginSchema)) dto: VolunteerLoginInput) {
    return this.auth.loginVolunteer(dto);
  }

  @Public()
  @Post('register/visitante')
  @HttpCode(201)
  registerVisitor(
    @Body(new ZodValidationPipe(visitorRegisterSchema)) dto: VisitorRegisterInput,
  ) {
    return this.auth.registerVisitor(dto);
  }

  @Public()
  @Post('register/estudante')
  @HttpCode(201)
  registerStudent(
    @Body(new ZodValidationPipe(studentRegisterSchema)) dto: StudentRegisterInput,
  ) {
    return this.auth.registerStudent(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  /**
   * Retorna a lista de eventos em que o usuario logado e voluntario,
   * com os escopos (VOLUNTEER_STUDENTS / VOLUNTEER_COMPANIES) de cada um.
   * Usado pelo dashboard `/voluntario` para mostrar acoes disponiveis.
   */
  @Get('me/volunteer-scopes')
  async myVolunteerScopes(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listVolunteerScopes(user.id);
  }
}
