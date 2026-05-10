import { Global, Module } from '@nestjs/common';
import { EventMembershipService } from './event-membership.service';

@Global()
@Module({
  providers: [EventMembershipService],
  exports: [EventMembershipService],
})
export class EventMembershipModule {}
