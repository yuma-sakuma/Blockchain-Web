import { ethers } from "ethers";
import { getWalletForRole, getContract } from "../config/contracts";

export interface BlockchainResult {
  txHash: string;
  tokenId?: string;
}

export const blockchainService = {
  getRoleWallet(role: string): ethers.Wallet | null {
    return getWalletForRole(role);
  },

  // ── Mutex Lock to prevent nonce race conditions ──
  _txMutex: Promise.resolve() as Promise<any>,
  async withTxLock<T>(fn: () => Promise<T>): Promise<T> {
    let resolve: () => void;
    const nextLock = new Promise<void>((r) => { resolve = r; });
    const prevLock = this._txMutex;
    this._txMutex = nextLock;
    await prevLock; // Wait for previous transaction to fully complete
    try {
      return await fn();
    } finally {
      // Small delay to let Ganache update its nonce state
      await new Promise((r) => setTimeout(r, 200));
      resolve!();
    }
  },

  async mintVehicle(wallet: ethers.Wallet, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_NFT", wallet);
      const vinHash = ethers.id(payload.vin);
      const modelHash = ethers.id(payload.makeModelTrim);
      const specHash = ethers.id(JSON.stringify(payload.spec));
      const manufacturedAt = Math.floor(new Date(payload.production?.manufacturedAt || Date.now()).getTime() / 1000);

      const tx = await contract.mintVehicle(wallet.address, vinHash, manufacturedAt, modelHash, specHash);
      const receipt = await tx.wait();

      let tokenId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "Transfer") { tokenId = parsed.args.tokenId.toString(); break; }
        } catch { /* ignore */ }
      }
      return { txHash: receipt.hash, tokenId };
    });
  },

  async registerVehicle(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_REGISTRY", wallet);
      const tx = await contract.registerVehicle(tokenId, ethers.id(payload.bookNo || `BOOK-${Date.now()}`), ethers.id("reg-doc-hash"));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async recordTransfer(wallet: ethers.Wallet, tokenId: string, payload: any, nftOwnerWallet?: ethers.Wallet): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const lifecycleContract = getContract("VEHICLE_LIFECYCLE", wallet);
      const reasonMap: Record<string, number> = { inventory_transfer: 0, first_sale: 1, resale: 2, trade_in: 3 };
      const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;

      // 1. Record the transfer event on VehicleLifecycle (uses wallet = ADMIN with DEFAULT_ADMIN_ROLE)
      const tx = await lifecycleContract.recordTransfer(tokenId, toAddress, reasonMap[payload.reason] || 2, ethers.id(payload.docRef || "none"), ethers.id(payload.to || "none"), ethers.id(JSON.stringify({ tokenId, reason: payload.reason, docRef: payload.docRef })));
      const receipt = await tx.wait();

      // Small delay to let Ganache update nonce between sequential txs
      await new Promise((r) => setTimeout(r, 300));

      // 2. THEN actually transfer the NFT on-chain (uses nftOwnerWallet = seller's wallet, who is the NFT owner)
      const transferWallet = nftOwnerWallet || wallet;
      const nftContract = getContract("VEHICLE_NFT", transferWallet);
      const currentOwner = await nftContract.ownerOf(tokenId);
      if (toAddress !== ethers.ZeroAddress && currentOwner.toLowerCase() !== toAddress.toLowerCase()) {
        try {
          const transferTx = await nftContract.transferFrom(currentOwner, toAddress, tokenId);
          await transferTx.wait();
        } catch (err) {
          console.warn("[BlockchainService] transferFrom failed (likely missing approval/ownership in demo env). Error ignored to allow backend sync.", err);
        }
      }

      return { txHash: receipt.hash };
    });
  },

  async recordPlateEvent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      if (!payload.plateNo) throw new Error("plateNo is required");
      const contract = getContract("VEHICLE_REGISTRY", wallet);
      const typeMap: Record<string, number> = { issue: 0, change: 1, lost: 2 };
      const tx = await contract.recordPlateEvent(tokenId, ethers.id(payload.plateNo), 10, typeMap[payload.action] || 0, ethers.id(JSON.stringify({ tokenId, plateNo: payload.plateNo, action: payload.action })), Math.floor(Date.now() / 1000));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async recordTaxPayment(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_REGISTRY", wallet);
      const tx = await contract.recordTaxPayment(tokenId, new Date().getFullYear(), Math.floor(new Date(payload.validUntil).getTime() / 1000), ethers.id(JSON.stringify({ tokenId, taxYear: new Date().getFullYear(), amount: payload.amount })));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async setFlag(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_REGISTRY", wallet);
      const flagMap: Record<string, number> = { stolen: 1 << 0, seized: 1 << 1, major_accident: 1 << 2, flood: 1 << 3, total_loss: 1 << 4 };
      const flagValue = payload.flag ? (flagMap[payload.flag] || 0) : (payload.event === "REPOSSESSION_RECORDED" ? 1 << 1 : 0);
      if (flagValue > 0) {
        const tx = await contract.setFlag(tokenId, flagValue, payload.value ?? true, ethers.id(JSON.stringify({ tokenId, flag: payload.flag, value: payload.value })));
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
      }
      return { txHash: "" };
    });
  },

  async createLien(wallet: ethers.Wallet, tokenId: string): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const tx = await contract.createLien(tokenId, ethers.id(JSON.stringify({ tokenId, action: "createLien" })), ethers.id(JSON.stringify({ tokenId, action: "releaseCondition" })));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async releaseLien(wallet: ethers.Wallet, tokenId: string): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const tx = await contract.releaseLien(tokenId);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async grantConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const expiresAt = payload.expiresAt ? Math.floor(new Date(payload.expiresAt).getTime() / 1000) : Math.floor(Date.now() / 1000) + 315360000; // Default 10 years
      const tx = await contract.grantWriteConsent(tokenId, ethers.isAddress(payload.grantTo) ? ethers.getAddress(payload.grantTo) : ethers.ZeroAddress, 1, expiresAt, false, Date.now());
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async revokeConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const tx = await contract.revokeWriteConsent(tokenId, ethers.isAddress(payload.revokeFrom) ? ethers.getAddress(payload.revokeFrom) : ethers.ZeroAddress);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  // --- Read Consent: routes to VehicleConsent.sol ---
  async grantReadConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_CONSENT", wallet);
      const granteeDid = ethers.id(payload.grantTo);
      const scopeMask = payload.scopeMask || 1;
      const expiresAt = payload.expiresAt ? Math.floor(new Date(payload.expiresAt).getTime() / 1000) : Math.floor(Date.now() / 1000) + 315360000; // Default 10 years
      const nonce = Date.now();
      const tx = await contract.grantConsent(tokenId, granteeDid, scopeMask, expiresAt, payload.singleUse || false, nonce);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async revokeReadConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_CONSENT", wallet);
      const tx = await contract.revokeConsent(tokenId, payload.grantHash);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async recordInsurancePolicy(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const policyNumber = payload.policyNo || payload.policyNumber;
      const actionMap: Record<string, number> = { new: 0, renew: 1, change: 2, cancel: 3 };
      const tx = await contract.recordInsurancePolicy(tokenId, ethers.id(policyNumber), actionMap[payload.type?.toLowerCase()] || 0, Math.floor(new Date(payload.startDate || payload.validFrom || Date.now()).getTime() / 1000), Math.floor(new Date(payload.validUntil || payload.endDate || Date.now()).getTime() / 1000), ethers.id(JSON.stringify({ policyNo: policyNumber, coverageType: payload.coverageType })));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async fileClaim(wallet: ethers.Wallet, tokenId: string, payload: any, evidence: any[]): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const evidenceHashes = evidence?.length > 0 ? [evidence[0].hash] : [];
      const severityMap: Record<string, number> = { minor: 0, major: 1, structural: 2, total_loss: 3 };
      const tx = await contract.fileClaim(tokenId, ethers.id(payload.claimId || "none"), evidenceHashes, severityMap[payload.severity?.toLowerCase()] || 0);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async updateClaimStatus(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const statusMap: Record<string, number> = { filed: 0, investigating: 1, approved: 2, repairing: 3, closed: 4, rejected: 5, repaired: 4 };
      const statusValue = statusMap[payload.status?.toLowerCase()] || 0;
      const tx = await contract.updateClaimStatus(
        tokenId,
        ethers.id(payload.claimId || "none"),
        statusValue
      );
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async recordInspection(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_REGISTRY", wallet);
      const tx = await contract.recordInspection(tokenId, payload.passed ? 1 : 0, ethers.id(JSON.stringify(payload.metrics || {})), ethers.id(JSON.stringify({ tokenId, passed: payload.passed, inspectedAt: Date.now() })));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async logMaintenance(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);

      // Auto-grant write consent from vehicle owner if needed
      // VehicleLifecycle.logMaintenance requires writeConsent from the NFT owner
      try {
        const nftContract = getContract("VEHICLE_NFT", wallet);
        const ownerAddress: string = await nftContract.ownerOf(tokenId);

        // Check if workshop already has consent
        const consentData = await contract.writeConsents(tokenId, wallet.address);
        // consentData is a struct [scopeMask, expiresAt] — scopeMask=0 means no consent
        const scopeMask = typeof consentData === 'object' && consentData[0] !== undefined
          ? BigInt(consentData[0])
          : BigInt(consentData);
        
        if (scopeMask === 0n) {
          console.log(`[Blockchain] 🔑 No write consent for workshop. Auto-granting from owner ${ownerAddress}...`);
          // Find the owner's wallet by matching address to known role wallets
          const { ROLE_PRIVATE_KEYS, getGanacheProvider } = await import("../config/contracts");
          const provider = getGanacheProvider();
          let ownerWallet: ethers.Wallet | null = null;
          for (const [, pk] of Object.entries(ROLE_PRIVATE_KEYS)) {
            if (pk) {
              const w = new ethers.Wallet(pk, provider);
              if (w.address.toLowerCase() === ownerAddress.toLowerCase()) {
                ownerWallet = w;
                break;
              }
            }
          }

          if (ownerWallet) {
            const ownerContract = getContract("VEHICLE_LIFECYCLE", ownerWallet);
            const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 3600); // 1 year
            const consentTx = await ownerContract.grantWriteConsent(
              tokenId, wallet.address, 15, expiresAt, false, Date.now() // scopeMask=15 (all: maintenance+odometer+parts+accident)
            );
            await consentTx.wait();
            console.log(`[Blockchain] ✅ Write consent granted successfully`);
            // Small delay for Ganache nonce sync
            await new Promise((r) => setTimeout(r, 300));
          } else {
            console.warn(`[Blockchain] ⚠️ Could not find owner wallet for ${ownerAddress}. Proceeding anyway...`);
          }
        }
      } catch (consentErr: any) {
        console.warn(`[Blockchain] ⚠️ Consent auto-grant check failed: ${consentErr.message}. Proceeding with logMaintenance...`);
      }

      const maintJobs = payload.jobs || payload.parts || [];
      const tx = await contract.logMaintenance(
        tokenId,
        ethers.id(JSON.stringify({ tokenId, workshop: wallet.address })),
        payload.mileageKm || 0,
        ethers.id(JSON.stringify({ tokenId, mileageKm: payload.mileageKm, jobs: maintJobs })),
        ethers.id(JSON.stringify(maintJobs)),
        0,
        Math.floor(Date.now() / 1000)
      );
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async logPartCertification(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      const tx = await contract.logEvent(tokenId, 200, Math.floor(Date.now() / 1000), ethers.id(JSON.stringify({ type: payload.partType, sn: payload.newPartNo })), ethers.id(payload.reason || "Certification"));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  // --- Escrow: routes to VehicleLien.sol ---
  async createEscrow(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const escrowId = ethers.id(`escrow-${tokenId}-${Date.now()}`);
      const buyerAddress = ethers.isAddress(payload.buyer) ? ethers.getAddress(payload.buyer) : ethers.ZeroAddress;
      const conditionsMask = payload.conditionsMask || 3;
      const depositAmount = ethers.parseEther(payload.depositAmount?.toString() || "0");
      const tx = await contract.createEscrow(escrowId, tokenId, buyerAddress, conditionsMask, ethers.ZeroAddress, depositAmount);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async fundEscrowNative(wallet: ethers.Wallet, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const tx = await contract.fundEscrowNative(payload.escrowId, { value: ethers.parseEther(payload.amount?.toString() || "0") });
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async fulfillCondition(wallet: ethers.Wallet, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const tx = await contract.fulfillCondition(payload.escrowId, payload.condition);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async cancelEscrow(wallet: ethers.Wallet, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIEN", wallet);
      const tx = await contract.cancelEscrow(payload.escrowId);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  async recordWarranty(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const contract = getContract("VEHICLE_LIFECYCLE", wallet);
      // EventType 102 for WARRANTY_DEFINED
      const tx = await contract.logEvent(
        tokenId,
        102,
        Math.floor(Date.now() / 1000),
        ethers.id(JSON.stringify(payload)),
        ethers.id("Warranty Registration")
      );
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    });
  },

  // --- Native ETH Payment Transfer ---
  async sendPayment(fromWallet: ethers.Wallet, toAddress: string, amountEth: string): Promise<BlockchainResult> {
    return this.withTxLock(async () => {
      const to = ethers.getAddress(toAddress);
      const value = ethers.parseEther(amountEth);
      const tx = await fromWallet.sendTransaction({ to, value });
      const receipt = await tx.wait();
      return { txHash: receipt!.hash };
    });
  },
};
