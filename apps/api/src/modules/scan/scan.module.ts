import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {}
