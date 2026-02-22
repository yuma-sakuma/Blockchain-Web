import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainModule } from './blockchain/blockchain.module';
import {
    ConsentGrant,
    Disclosure,
    EventLog,
    Inspection,
    InsuranceClaim,
    InsurancePolicy,
    LoanAccount,
    MaintenanceLog,
    OwnershipTransfer,
    PartReplacement,
    PlateRecord,
    Registration,
    TaxPayment,
    TradeInEvaluation,
    Vehicle,
    VehicleFlagRecord,
} from './database/entities';
import { EventModule } from './event/event.module';
import { VehicleModule } from './vehicle/vehicle.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306') ,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'blockchain_vin',
      entities: [
        Vehicle,
        EventLog,
        ConsentGrant,
        Registration,
        PlateRecord,
        TaxPayment,
        VehicleFlagRecord,
        Inspection,
        MaintenanceLog,
        PartReplacement,
        InsurancePolicy,
        InsuranceClaim,
        LoanAccount,
        OwnershipTransfer,
        Disclosure,
        TradeInEvaluation,
      ],
      migrations: [__dirname + '/database/migrations/*.ts'],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      Vehicle,
      EventLog,
      ConsentGrant,
      Registration,
      PlateRecord,
      TaxPayment,
      VehicleFlagRecord,
      Inspection,
      MaintenanceLog,
      PartReplacement,
      InsurancePolicy,
      InsuranceClaim,
      LoanAccount,
      OwnershipTransfer,
      Disclosure,
      TradeInEvaluation,
    ]),
    VehicleModule,
    EventModule,
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
