import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRegistryService } from './module-registry.service';
import type { FeatureModule } from './event-modules';

const REQUIRES_MODULE_KEY = 'requires_module';

/**
 * Decorator para marcar rotas que dependem de um modulo especifico.
 *
 * Exemplo de uso em um controller de feature:
 *   @Controller('events/:eventId/passport')
 *   @UseGuards(EnabledModuleGuard)
 *   @RequiresModule('passport')
 *   export class PassportController { ... }
 */
export const RequiresModule = (module: FeatureModule) =>
  SetMetadata(REQUIRES_MODULE_KEY, module);

@Injectable()
export class EnabledModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: ModuleRegistryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<FeatureModule | undefined>(
      REQUIRES_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<{ params: { eventId?: string } }>();
    const eventId = req.params.eventId;
    if (!eventId) return false;

    await this.registry.assertEnabled(eventId, required);
    return true;
  }
}
