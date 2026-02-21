import { MigrationInterface, QueryRunner } from "typeorm";

export class FixEventLogType1771684564356 implements MigrationInterface {
    name = 'FixEventLogType1771684564356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_05aa98dc29b4b2bfab1b1c6867\` ON \`event_logs\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` ADD \`type\` varchar(50) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_05aa98dc29b4b2bfab1b1c6867\` ON \`event_logs\` (\`tokenId\`, \`type\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_05aa98dc29b4b2bfab1b1c6867\` ON \`event_logs\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` ADD \`type\` enum ('VEHICLE_MINTED', 'INVENTORY_TRANSFER', 'FIRST_SALE', 'OWNERSHIP_TRANSFER', 'TRADE_IN', 'DISCLOSURE', 'REGISTRATION', 'PLATE_ISSUE', 'PLATE_CHANGE', 'PLATE_LOST', 'TAX_PAYMENT', 'FLAG_UPDATE', 'INSPECTION', 'MAINTENANCE', 'PART_REPLACEMENT', 'ACCIDENT_REPAIR', 'INSURANCE_NEW', 'INSURANCE_RENEW', 'INSURANCE_CHANGE', 'INSURANCE_CANCEL', 'CLAIM_FILED', 'CLAIM_UPDATED', 'CLAIM_CLOSED', 'LIEN_CREATED', 'LIEN_RELEASED', 'CONSENT_GRANTED', 'CONSENT_REVOKED') NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_05aa98dc29b4b2bfab1b1c6867\` ON \`event_logs\` (\`tokenId\`, \`type\`)`);
    }

}
