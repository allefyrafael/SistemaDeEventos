import { Global, Module } from '@nestjs/common';
import { ModuleRegistryService } from './module-registry.service';
import { EnabledModuleGuard } from './enabled-module.guard';

@Global()
@Module({
  providers: [ModuleRegistryService, EnabledModuleGuard],
  exports: [ModuleRegistryService, EnabledModuleGuard],
})
export class ModuleRegistryModule {}
