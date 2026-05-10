import { Module } from '@nestjs/common';
import { VenueMapController } from './venue-map.controller';
import { VenueMapService } from './venue-map.service';

@Module({
  controllers: [VenueMapController],
  providers: [VenueMapService],
  exports: [VenueMapService],
})
export class VenueMapModule {}
