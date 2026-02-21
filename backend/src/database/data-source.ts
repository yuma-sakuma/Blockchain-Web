import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
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
} from './entities';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
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
  migrations: ['./src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
