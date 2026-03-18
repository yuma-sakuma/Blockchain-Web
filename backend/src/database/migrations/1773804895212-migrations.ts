import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1773804895212 implements MigrationInterface {
    name = 'Migrations1773804895212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`warrantyJson\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`warrantyJson\``);
    }

}
