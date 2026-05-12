import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@prisma/client';

import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CertificateService } from './certificate.service';

/**
 * Endpoints de certificado de conclusao:
 *
 * - POST /events/:eventId/passport/me/certificate
 *     Estudante logado emite (ou recupera) o proprio certificado.
 *     Requer modulo `certificate` ativo + ter concluido o passaporte.
 *
 * - GET /certificates/:code
 *     PUBLICO. Qualquer pessoa com o codigo valida o certificado e ve os
 *     dados pra renderizar a pagina. Usado pela tela publica
 *     /certificado/[code] do front + para validacao por QR Code.
 */
@Controller()
export class CertificateController {
  constructor(private readonly certs: CertificateService) {}

  @Post('events/:eventId/passport/me/certificate')
  @UseGuards(EnabledModuleGuard)
  @RequiresModule('certificate')
  @Roles(UserType.STUDENT)
  issueMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.certs.issueForStudent(eventId, user.id);
  }

  @Public()
  @Get('certificates/:code')
  validate(@Param('code') code: string) {
    return this.certs.findByCode(code);
  }
}
