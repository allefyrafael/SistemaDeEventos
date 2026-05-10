import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import {
  feedbackSaveTemplateSchema,
  feedbackSubmitSchema,
  type FeedbackSaveTemplateInput,
  type FeedbackSubmitInput,
} from '@eventpass/shared';

import { EnabledModuleGuard, RequiresModule } from '../../core/module-registry/enabled-module.guard';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { FeedbackService } from './feedback.service';

@Controller('events/:eventId/feedback')
@UseGuards(EnabledModuleGuard)
@RequiresModule('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  // Admin configura os templates
  @Post('template')
  @Roles(UserType.ADMIN)
  saveTemplate(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(feedbackSaveTemplateSchema))
    dto: FeedbackSaveTemplateInput,
  ) {
    return this.feedback.saveTemplate(eventId, dto);
  }

  // Aluno carrega o template para preencher
  @Get('template')
  @Roles(UserType.STUDENT, UserType.ADMIN)
  getTemplate(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.feedback.getTemplate(eventId, companyId ?? null);
  }

  // RF07: aluno envia feedback que efetiva o carimbo
  @Post('submit')
  @Roles(UserType.STUDENT)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(feedbackSubmitSchema)) dto: FeedbackSubmitInput,
  ) {
    return this.feedback.submitFeedback(eventId, user.id, dto);
  }

  @Get('me/pending')
  @Roles(UserType.STUDENT)
  pending(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    return this.feedback.pendingForStudent(eventId, user.id);
  }
}
