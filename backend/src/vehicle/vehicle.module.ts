import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { EventLog } from '../database/entities/event-log.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, EventLog]), BlockchainModule],
  providers: [VehicleService],
  controllers: [VehicleController]
})
export class VehicleModule {}
