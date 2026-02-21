import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentGrant } from '../database/entities/consent-grant.entity';
import { EventLog } from '../database/entities/event-log.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { InsuranceClaim } from '../database/entities/insurance-claim.entity';
import { InsurancePolicy } from '../database/entities/insurance-policy.entity';
import { MaintenanceLog } from '../database/entities/maintenance-log.entity';
import { OwnershipTransfer } from '../database/entities/ownership-transfer.entity';
import { PlateRecord } from '../database/entities/plate-record.entity';
import { Registration } from '../database/entities/registration.entity';
import { TaxPayment } from '../database/entities/tax-payment.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventLog, 
      Vehicle,
      ConsentGrant,
      InsurancePolicy,
      InsuranceClaim,
      Inspection,
      OwnershipTransfer,
      Registration,
      PlateRecord,
      TaxPayment,
      MaintenanceLog
    ])
  ],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
