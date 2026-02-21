import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendAddressLength1771686243226 implements MigrationInterface {
    name = 'ExtendAddressLength1771686243226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`consent_grants\` DROP COLUMN \`ownerAddress\``);
        await queryRunner.query(`ALTER TABLE \`consent_grants\` ADD \`ownerAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`disclosures\` DROP COLUMN \`sellerAddress\``);
        await queryRunner.query(`ALTER TABLE \`disclosures\` ADD \`sellerAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`event_logs\` DROP COLUMN \`actorAddress\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` ADD \`actorAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`inspections\` DROP COLUMN \`stationAddress\``);
        await queryRunner.query(`ALTER TABLE \`inspections\` ADD \`stationAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`insurance_policies\` DROP COLUMN \`insurerAddress\``);
        await queryRunner.query(`ALTER TABLE \`insurance_policies\` ADD \`insurerAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`loan_accounts\` DROP COLUMN \`lenderAddress\``);
        await queryRunner.query(`ALTER TABLE \`loan_accounts\` ADD \`lenderAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`maintenance_logs\` DROP COLUMN \`workshopAddress\``);
        await queryRunner.query(`ALTER TABLE \`maintenance_logs\` ADD \`workshopAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`fromAddress\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`fromAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`toAddress\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`toAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`escrowContract\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`escrowContract\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP COLUMN \`dltOfficerAddress\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD \`dltOfficerAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`trade_in_evaluations\` DROP COLUMN \`evaluatorAddress\``);
        await queryRunner.query(`ALTER TABLE \`trade_in_evaluations\` ADD \`evaluatorAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`vehicle_flags\` DROP COLUMN \`sourceAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicle_flags\` ADD \`sourceAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`manufacturerAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`manufacturerAddress\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`currentOwnerAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`currentOwnerAddress\` varchar(100) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`currentOwnerAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`currentOwnerAddress\` varchar(42) NULL`);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`manufacturerAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`manufacturerAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`vehicle_flags\` DROP COLUMN \`sourceAddress\``);
        await queryRunner.query(`ALTER TABLE \`vehicle_flags\` ADD \`sourceAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`trade_in_evaluations\` DROP COLUMN \`evaluatorAddress\``);
        await queryRunner.query(`ALTER TABLE \`trade_in_evaluations\` ADD \`evaluatorAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP COLUMN \`dltOfficerAddress\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD \`dltOfficerAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`escrowContract\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`escrowContract\` varchar(42) NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`toAddress\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`toAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` DROP COLUMN \`fromAddress\``);
        await queryRunner.query(`ALTER TABLE \`ownership_transfers\` ADD \`fromAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`maintenance_logs\` DROP COLUMN \`workshopAddress\``);
        await queryRunner.query(`ALTER TABLE \`maintenance_logs\` ADD \`workshopAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`loan_accounts\` DROP COLUMN \`lenderAddress\``);
        await queryRunner.query(`ALTER TABLE \`loan_accounts\` ADD \`lenderAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`insurance_policies\` DROP COLUMN \`insurerAddress\``);
        await queryRunner.query(`ALTER TABLE \`insurance_policies\` ADD \`insurerAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`inspections\` DROP COLUMN \`stationAddress\``);
        await queryRunner.query(`ALTER TABLE \`inspections\` ADD \`stationAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`event_logs\` DROP COLUMN \`actorAddress\``);
        await queryRunner.query(`ALTER TABLE \`event_logs\` ADD \`actorAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`disclosures\` DROP COLUMN \`sellerAddress\``);
        await queryRunner.query(`ALTER TABLE \`disclosures\` ADD \`sellerAddress\` varchar(42) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`consent_grants\` DROP COLUMN \`ownerAddress\``);
        await queryRunner.query(`ALTER TABLE \`consent_grants\` ADD \`ownerAddress\` varchar(42) NOT NULL`);
    }

}
