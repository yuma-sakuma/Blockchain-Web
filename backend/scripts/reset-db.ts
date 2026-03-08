import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vehicle } from '../src/database/entities/vehicle.entity';
import { EventLog } from '../src/database/entities/event-log.entity';
import { PlateRecord } from '../src/database/entities/plate-record.entity';
import { Registration } from '../src/database/entities/registration.entity';
import { TaxPayment } from '../src/database/entities/tax-payment.entity';
import { OwnershipTransfer } from '../src/database/entities/ownership-transfer.entity';
import { Inspection } from '../src/database/entities/inspection.entity';
import { MaintenanceLog } from '../src/database/entities/maintenance-log.entity';
import { InsurancePolicy } from '../src/database/entities/insurance-policy.entity';
import { InsuranceClaim } from '../src/database/entities/insurance-claim.entity';
import { ConsentGrant } from '../src/database/entities/consent-grant.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const entities = [
        EventLog,
        PlateRecord,
        Registration,
        TaxPayment,
        OwnershipTransfer,
        Inspection,
        MaintenanceLog,
        InsurancePolicy,
        InsuranceClaim,
        ConsentGrant,
        Vehicle,
    ];

    console.log('🧹 Clearing stale database records...');

    for (const entity of entities) {
        const repository = app.get(getRepositoryToken(entity));
        await repository.query(`DELETE FROM ${repository.metadata.tableName}`);
        console.log(`- Cleared ${repository.metadata.tableName}`);
    }

    console.log('✨ Database reset complete! You can now start fresh.');
    await app.close();
}

bootstrap().catch(err => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
});
