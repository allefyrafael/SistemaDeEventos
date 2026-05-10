import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventConfig,
  FeatureModule,
  eventConfigSchema,
} from './event-modules';

/**
 * Fonte unica de verdade para "este evento tem o modulo X ativo?".
 * Lido no guard que protege rotas dos modulos feature (ver EnabledModuleGuard).
 */
@Injectable()
export class ModuleRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventConfig(eventId: string): Promise<EventConfig> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { config: true },
    });
    if (!event) {
      throw new NotFoundException(`Evento ${eventId} nao encontrado`);
    }
    return eventConfigSchema.parse(event.config ?? {});
  }

  async isModuleEnabled(eventId: string, module: FeatureModule): Promise<boolean> {
    const cfg = await this.getEventConfig(eventId);
    return cfg.modules.includes(module);
  }

  async assertEnabled(eventId: string, module: FeatureModule): Promise<void> {
    if (!(await this.isModuleEnabled(eventId, module))) {
      throw new NotFoundException(
        `Modulo "${module}" nao esta habilitado neste evento`,
      );
    }
  }
}
