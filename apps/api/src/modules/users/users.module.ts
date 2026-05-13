import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VolunteersModule } from '../volunteers/volunteers.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, VolunteersModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
