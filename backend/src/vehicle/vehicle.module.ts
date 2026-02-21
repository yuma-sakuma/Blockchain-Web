import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLog } from '../database/entities/event-log.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, EventLog])],
  providers: [VehicleService],
  controllers: [VehicleController]
})
export class VehicleModule {}
