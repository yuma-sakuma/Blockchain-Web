import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

class SafeNonceManager extends ethers.NonceManager {
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await super.sendTransaction(tx);
      } catch (err: any) {
        const msg = (err.message || err.toString()).toLowerCase();
        if (msg.includes('nonce') || msg.includes('replacement') || msg.includes('already known')) {
          console.warn(`[SafeNonceManager] Nonce desync detected. Resetting internal nonce tracker and retrying (${i + 1}/${maxRetries})...`);
          this.reset();
          continue;
        }
        throw err;
      }
    }
    return super.sendTransaction(tx);
  }
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  public wallet: ethers.Signer;
  public walletAddress: string;

  public vehicleRegistryContract: ethers.Contract;
  public vehicleNFTContract: ethers.Contract;
  public vehicleLifecycleContract: ethers.Contract;
  public vehicleLienContract: ethers.Contract;
  public vehicleConsentContract: ethers.Contract;
  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    // Use GANACHE_RPC_URL for the Hardhat/Ganache URL (default to Hardhat 8545)
    // You should probably rename this to BLOCKCHAIN_RPC_URL in .env later
    const rpcUrl = this.configService.get<string>('GANACHE_RPC_URL') || 'http://127.0.0.1:8545';
    const privateKey = this.configService.get<string>('ADMIN_PRIVATE_KEY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      const rawWallet = new ethers.Wallet(privateKey, this.provider);
      this.walletAddress = rawWallet.address;
      // Wrap the wallet in our custom robust SafeNonceManager to auto-recover from any desyncs
      // caused by local Ganache cache delays or external script interference
      this.wallet = new SafeNonceManager(rawWallet);
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

  private async ensureRoles() {
    if (!this.wallet || !this.walletAddress) {
      console.warn('[BlockchainService] No wallet configured, skipping role setup.');
      return;
    }

    // Try to detect the network first
    try {
      await this.provider.getNetwork();
    } catch (err) {
      console.warn(`[BlockchainService] ⚠️ Provider network not reachable. Role check will retry on first transaction. Error: ${err.message || err}`);
      return;
    }

    const adminAddress = this.walletAddress;
    const registryAddress = await this.vehicleRegistryContract.getAddress();
    const lienAddress = await this.vehicleLienContract.getAddress();

    const roleGrants = [
      { contract: this.vehicleRegistryContract, contractName: 'VehicleRegistry', roleName: 'DLT_OFFICER_ROLE', roleHash: ethers.id('DLT_OFFICER_ROLE'), grantTo: adminAddress },
      { contract: this.vehicleRegistryContract, contractName: 'VehicleRegistry', roleName: 'INSPECTOR_ROLE', roleHash: ethers.id('INSPECTOR_ROLE'), grantTo: adminAddress },
      { contract: this.vehicleLifecycleContract, contractName: 'VehicleLifecycle', roleName: 'WORKSHOP_ROLE', roleHash: ethers.id('WORKSHOP_ROLE'), grantTo: adminAddress },
      { contract: this.vehicleLifecycleContract, contractName: 'VehicleLifecycle', roleName: 'INSURER_ROLE', roleHash: ethers.id('INSURER_ROLE'), grantTo: adminAddress },
      { contract: this.vehicleLienContract, contractName: 'VehicleLien', roleName: 'FINANCE_ROLE', roleHash: ethers.id('FINANCE_ROLE'), grantTo: adminAddress },
      { contract: this.vehicleNFTContract, contractName: 'VehicleNFT', roleName: 'REGISTRY_ROLE', roleHash: ethers.id('REGISTRY_ROLE'), grantTo: registryAddress },
      { contract: this.vehicleNFTContract, contractName: 'VehicleNFT', roleName: 'LIEN_ROLE', roleHash: ethers.id('LIEN_ROLE'), grantTo: lienAddress },
    ];

    for (const { contract, contractName, roleName, roleHash, grantTo } of roleGrants) {
      try {
        const hasRole = await contract.hasRole(roleHash, grantTo);
        if (!hasRole) {
          console.log(`[BlockchainService] Granting ${roleName} on ${contractName} to ${grantTo}...`);
          await this.withTxLock(async () => {
            const tx = await contract.grantRole(roleHash, grantTo);
            await tx.wait();
          });
          console.log(`[BlockchainService] ✅ ${roleName} granted on ${contractName} to ${grantTo}`);
        }
      } catch (err) {
        console.warn(`[BlockchainService] ⚠️ Could not grant ${roleName} on ${contractName}: ${err.message || err}`);
      }
    }
  }
  private txMutex: Promise<void> = Promise.resolve();

  async withTxLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.txMutex.then(async () => {
      return await fn();
    });
    this.txMutex = next.then(() => { }).catch(() => { });
    return next;
  }
}