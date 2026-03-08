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

  onModuleInit() {
    const rpcUrl = this.configService.get<string>('GANACHE_RPC_URL') || 'http://127.0.0.1:7545';
    const privateKey = this.configService.get<string>('ADMIN_PRIVATE_KEY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(`[BlockchainService] Wallet loaded: ${this.wallet.address}`);
    } else {
      console.warn('[BlockchainService] WARNING: ADMIN_PRIVATE_KEY is not set. Transactions will fail!');
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
  }
}
