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

  // Role-specific wallets (fixes God Mode Wallet issue §1.1)
  private roleWallets: Map<string, ethers.Signer> = new Map();

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

    // Initialize role-specific wallets from env vars (§1.1 God Mode Wallet fix)
    const roleKeys: Record<string, string> = {
      MANUFACTURER: 'MANUFACTURER_PRIVATE_KEY',
      DEALER: 'DEALER_PRIVATE_KEY',
      DLT_OFFICER: 'DLT_OFFICER_PRIVATE_KEY',
      CONSUMER: 'CONSUMER_PRIVATE_KEY',
      LENDER: 'LENDER_PRIVATE_KEY',
      INSURER: 'INSURER_PRIVATE_KEY',
      SERVICE_PROVIDER: 'SERVICE_PROVIDER_PRIVATE_KEY',
      INSPECTOR: 'INSPECTOR_PRIVATE_KEY',
    };
    for (const [role, envVar] of Object.entries(roleKeys)) {
      const key = this.configService.get<string>(envVar);
      if (key) {
        const rawWallet = new ethers.Wallet(key, this.provider);
        this.roleWallets.set(role, new SafeNonceManager(rawWallet));
        console.log(`[BlockchainService] ✅ Role wallet loaded: ${role} → ${rawWallet.address}`);
      }
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

    const registryAddress = await this.vehicleRegistryContract.getAddress();
    const lienAddress = await this.vehicleLienContract.getAddress();

    // Only cross-contract roles are granted here (structurally necessary for inter-contract calls).
    // Individual role-based permissions (DLT_OFFICER, WORKSHOP, INSURER, FINANCE, etc.)
    // are managed by the deploy script (deploy.ts + grant-roles.ts) and granted to each role's own wallet.
    const roleGrants = [
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

  async getPeerCount(): Promise<number> {
    try {
      const peerCountHex = await this.provider.send('net_peerCount', []);
      return parseInt(peerCountHex, 16);
    } catch (err) {
      console.warn(`[BlockchainService] Could not fetch peer count: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get the signer for a specific role. Falls back to admin wallet if role wallet is not configured.
   * This fixes §1.1 God Mode Wallet — each role uses its own wallet for transactions.
   */
  getSignerForRole(role: string): ethers.Signer {
    // Normalize role from actor string (e.g. "INSURER:0x..." → "INSURER")
    const normalizedRole = role.split(':')[0].toUpperCase()
      .replace('DLT', 'DLT_OFFICER')
      .replace('INSPECTION', 'INSPECTOR')
      .replace('SERVICE', 'SERVICE_PROVIDER')
      .replace('WORKSHOP', 'SERVICE_PROVIDER');
    
    const roleSigner = this.roleWallets.get(normalizedRole);
    if (roleSigner) {
      console.log(`[BlockchainService] 🔑 Using role wallet for: ${normalizedRole}`);
      return roleSigner;
    }
    console.log(`[BlockchainService] ⚠️ No role wallet for "${normalizedRole}", using admin wallet`);
    return this.wallet;
  }

  /**
   * Get a contract instance connected to the signer for a specific role.
   */
  getContractForRole(contractName: string, role: string): ethers.Contract {
    const signer = this.getSignerForRole(role);
    switch (contractName) {
      case 'VEHICLE_NFT': return this.vehicleNFTContract.connect(signer) as ethers.Contract;
      case 'VEHICLE_REGISTRY': return this.vehicleRegistryContract.connect(signer) as ethers.Contract;
      case 'VEHICLE_LIFECYCLE': return this.vehicleLifecycleContract.connect(signer) as ethers.Contract;
      case 'VEHICLE_LIEN': return this.vehicleLienContract.connect(signer) as ethers.Contract;
      case 'VEHICLE_CONSENT': return this.vehicleConsentContract.connect(signer) as ethers.Contract;
      default: throw new Error(`Unknown contract: ${contractName}`);
    }
  }
}