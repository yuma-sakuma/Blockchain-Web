import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  public wallet: ethers.Wallet;

  public vehicleRegistryContract: ethers.Contract;
  public vehicleNFTContract: ethers.Contract;
  public vehicleLifecycleContract: ethers.Contract;
  public vehicleLienContract: ethers.Contract;
  public vehicleConsentContract: ethers.Contract;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const rpcUrl = this.configService.get<string>('GANACHE_RPC_URL') || 'http://127.0.0.1:7545';
    const privateKey = this.configService.get<string>('ADMIN_PRIVATE_KEY');

    // Use a static network configuration to prevent hangs during network detection
    // Ganache default chainId is 1337
    this.provider = new ethers.JsonRpcProvider(rpcUrl, {
      name: 'ganache',
      chainId: 1337
    }, {
      staticNetwork: true
    });

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }

    // Use process.cwd() instead of __dirname to ensure it finds the src folder even if compiled to dist
    const abiPath = path.join(process.cwd(), 'src', 'blockchain', 'abi');

    const loadAbi = (filename: string) => {
      try {
        const file = fs.readFileSync(path.join(abiPath, filename), 'utf8');
        return JSON.parse(file).abi;
      } catch (e) {
        console.error(`Error loading ABI ${filename}`, e);
        return [];
      }
    };

    const registryAbi = loadAbi('VehicleRegistry.sol/VehicleRegistry.json');
    const nftAbi = loadAbi('VehicleNFT.sol/VehicleNFT.json');
    const lifecycleAbi = loadAbi('VehicleLifecycle.sol/VehicleLifecycle.json');
    const lienAbi = loadAbi('VehicleLien.sol/VehicleLien.json');
    const consentAbi = loadAbi('VehicleConsent.sol/VehicleConsent.json');

    const signerOrProvider = this.wallet || this.provider;

    const getContractAddress = (envVar: string) => {
      const address = this.configService.get<string>(envVar);
      if (!address) {
        console.warn(`[BlockchainService] WARNING: ${envVar} is not set in environment variables. Defaulting to ZeroAddress.`);
        return ethers.ZeroAddress;
      }
      return address;
    };

    this.vehicleRegistryContract = new ethers.Contract(
      getContractAddress('VEHICLE_REGISTRY_ADDRESS'),
      registryAbi,
      signerOrProvider
    );

    this.vehicleNFTContract = new ethers.Contract(
      getContractAddress('VEHICLE_NFT_ADDRESS'),
      nftAbi,
      signerOrProvider
    );

    this.vehicleLifecycleContract = new ethers.Contract(
      getContractAddress('VEHICLE_LIFECYCLE_ADDRESS'),
      lifecycleAbi,
      signerOrProvider
    );

    this.vehicleLienContract = new ethers.Contract(
      getContractAddress('VEHICLE_LIEN_ADDRESS'),
      lienAbi,
      signerOrProvider
    );

    this.vehicleConsentContract = new ethers.Contract(
      getContractAddress('VEHICLE_CONSENT_ADDRESS'),
      consentAbi,
      signerOrProvider
    );

    // Auto-grant required roles to admin wallet on startup
    await this.ensureRoles();
  }

  /**
   * Grant all required roles to the admin wallet if not already granted.
   * The deployer has DEFAULT_ADMIN_ROLE on all contracts, which allows granting other roles.
   */
  private async ensureRoles() {
    if (!this.wallet) {
      console.warn('[BlockchainService] No wallet configured, skipping role setup.');
      return;
    }

    const adminAddress = this.wallet.address;

    const roleGrants: { contract: ethers.Contract; contractName: string; roleName: string; roleHash: string }[] = [
      // VehicleRegistry roles
      { contract: this.vehicleRegistryContract, contractName: 'VehicleRegistry', roleName: 'DLT_OFFICER_ROLE', roleHash: ethers.id('DLT_OFFICER_ROLE') },
      { contract: this.vehicleRegistryContract, contractName: 'VehicleRegistry', roleName: 'INSPECTOR_ROLE', roleHash: ethers.id('INSPECTOR_ROLE') },
      // VehicleLifecycle roles
      { contract: this.vehicleLifecycleContract, contractName: 'VehicleLifecycle', roleName: 'WORKSHOP_ROLE', roleHash: ethers.id('WORKSHOP_ROLE') },
      { contract: this.vehicleLifecycleContract, contractName: 'VehicleLifecycle', roleName: 'INSURER_ROLE', roleHash: ethers.id('INSURER_ROLE') },
      // VehicleLien roles
      { contract: this.vehicleLienContract, contractName: 'VehicleLien', roleName: 'FINANCE_ROLE', roleHash: ethers.id('FINANCE_ROLE') },
      // VehicleNFT roles (needed for setTransferLock from Registry/Lien)
      { contract: this.vehicleNFTContract, contractName: 'VehicleNFT', roleName: 'REGISTRY_ROLE', roleHash: ethers.id('REGISTRY_ROLE') },
      { contract: this.vehicleNFTContract, contractName: 'VehicleNFT', roleName: 'LIEN_ROLE', roleHash: ethers.id('LIEN_ROLE') },
    ];

    for (const { contract, contractName, roleName, roleHash } of roleGrants) {
      try {
        const hasRole = await contract.hasRole(roleHash, adminAddress);
        if (!hasRole) {
          console.log(`[BlockchainService] Granting ${roleName} on ${contractName} to ${adminAddress}...`);
          const tx = await contract.grantRole(roleHash, adminAddress);
          await tx.wait();
          console.log(`[BlockchainService] ✅ ${roleName} granted on ${contractName}`);
        }
      } catch (err) {
        console.warn(`[BlockchainService] ⚠️ Could not grant ${roleName} on ${contractName}: ${err.message || err}`);
      }
    }
  }
}
