import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DataSource } from 'typeorm';
import { BlockchainService } from './blockchain/blockchain.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(
    private dataSource: DataSource,
    private blockchainService: BlockchainService
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async getStatus() {
    let dbStatus = 'disconnected';
    try {
      if (this.dataSource.isInitialized) {
        // Simple query to verify connection
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }

  async syncBlockchain() {
    this.logger.log('Starting Blockchain Sync and Recovery...');

    // 1. Ensure Roles are granted (Self-healing)
    try {
      this.logger.log('Checking and granting roles...');
      const MANUFACTURER_ROLE = ethers.id("MANUFACTURER_ROLE");
      const REGISTRY_ROLE = ethers.id("REGISTRY_ROLE");
      const isManufacturer = await this.blockchainService.vehicleNFTContract.hasRole(MANUFACTURER_ROLE, this.blockchainService.walletAddress);
      if (!isManufacturer) {
        this.logger.log('Granting MANUFACTURER_ROLE to self...');
        const tx = await this.blockchainService.vehicleNFTContract.grantRole(MANUFACTURER_ROLE, this.blockchainService.walletAddress);
        await tx.wait();
      }

      const isRegistry = await this.blockchainService.vehicleNFTContract.hasRole(REGISTRY_ROLE, this.blockchainService.vehicleRegistryContract.target);
      if (!isRegistry) {
        this.logger.log('Granting REGISTRY_ROLE to Registry Contract...');
        const tx = await this.blockchainService.vehicleNFTContract.grantRole(REGISTRY_ROLE, this.blockchainService.vehicleRegistryContract.target);
        await tx.wait();
      }
      this.logger.log('Roles verified ✅');
    } catch (err) {
      this.logger.warn(`Role verification failed (possibly already granted or no permission): ${err.message}`);
    }

    const results: any[] = [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const vehicles = await queryRunner.query('SELECT * FROM vehicles');
      this.logger.log(`Found ${vehicles.length} vehicles to check.`);

      for (const v of vehicles) {
        try {
          // Check if exists on chain
          await this.blockchainService.vehicleNFTContract.ownerOf(v.tokenId);
          results.push({ tokenId: v.tokenId, vin: v.vinNumber, status: 'exists' });
        } catch (err) {
          this.logger.warn(`Token ${v.tokenId} missing on-chain. Attempting re-mint...`);

          const vinHash = ethers.id(v.vinNumber);
          const isUsed = await this.blockchainService.vehicleNFTContract.isVinUsed(vinHash);

          if (isUsed) {
            results.push({ tokenId: v.tokenId, vin: v.vinNumber, status: 'error', message: 'VIN already used on-chain under different ID' });
            continue;
          }

          // Re-mint
          const modelHash = ethers.id(typeof v.modelJson === 'string' ? v.modelJson : JSON.stringify(v.modelJson));
          const specHash = ethers.id(typeof v.specJson === 'string' ? v.specJson : JSON.stringify(v.specJson));
          const manufacturedAt = v.manufacturedAt ? BigInt(v.manufacturedAt) : BigInt(Date.now());

          const tx = await this.blockchainService.vehicleNFTContract.mintVehicle(
            this.blockchainService.walletAddress,
            vinHash,
            manufacturedAt,
            modelHash,
            specHash
          );
          const receipt = await tx.wait();

          const transferEvent = receipt.logs.find((log: any) => {
            try {
              return this.blockchainService.vehicleNFTContract.interface.parseLog(log)?.name === 'Transfer';
            } catch (e) { return false; }
          });

          if (!transferEvent) throw new Error('No Transfer event found');
          const parsedLog = this.blockchainService.vehicleNFTContract.interface.parseLog(transferEvent);
          if (!parsedLog) throw new Error('Failed to parse Transfer log');
          const newTokenId = parsedLog.args.tokenId.toString();

          // Update ALL tables
          const tables = [
            'vehicles', 'registrations', 'plate_records', 'tax_payments',
            'ownership_transfers', 'maintenance_logs', 'insurance_policies',
            'insurance_claims', 'inspections', 'consent_grants', 'vehicle_flags'
          ];

          for (const table of tables) {
            await queryRunner.query(`UPDATE ${table} SET tokenId = ? WHERE tokenId = ?`, [newTokenId, v.tokenId]);
          }

          results.push({ oldTokenId: v.tokenId, newTokenId, vin: v.vinNumber, status: 'recovered' });
          this.logger.log(`Successfully recovered ${v.vinNumber} with new Token ID ${newTokenId}`);
        }
      }
    } catch (err) {
      this.logger.error(`Sync failed: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { success: true, results };
  }
}