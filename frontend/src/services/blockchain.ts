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

  async mintVehicle(wallet: ethers.Wallet, payload: any): Promise<BlockchainResult> {
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
  },

  async registerVehicle(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_REGISTRY", wallet);
    const tx = await contract.registerVehicle(tokenId, ethers.id(payload.bookNo || `BOOK-${Date.now()}`), ethers.id("reg-doc-hash"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async recordTransfer(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const reasonMap: Record<string, number> = { inventory_transfer: 0, first_sale: 1, resale: 2, trade_in: 3 };
    const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;
    const tx = await contract.recordTransfer(tokenId, toAddress, reasonMap[payload.reason] || 2, ethers.id(payload.docRef || "none"), ethers.id(payload.to || "none"), ethers.id("payment-ref"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async recordPlateEvent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    if (!payload.plateNo) throw new Error("plateNo is required");
    const contract = getContract("VEHICLE_REGISTRY", wallet);
    const typeMap: Record<string, number> = { issue: 0, change: 1, lost: 2 };
    const tx = await contract.recordPlateEvent(tokenId, ethers.id(payload.plateNo), 10, typeMap[payload.action] || 0, ethers.id("plate-doc-hash"), Math.floor(Date.now() / 1000));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async recordTaxPayment(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_REGISTRY", wallet);
    const tx = await contract.recordTaxPayment(tokenId, new Date().getFullYear(), Math.floor(new Date(payload.validUntil).getTime() / 1000), ethers.id("tax-receipt-hash"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async setFlag(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_REGISTRY", wallet);
    const flagMap: Record<string, number> = { stolen: 1 << 0, seized: 1 << 1, major_accident: 1 << 2, flood: 1 << 3, total_loss: 1 << 4 };
    const flagValue = payload.flag ? (flagMap[payload.flag] || 0) : (payload.event === "REPOSSESSION_RECORDED" ? 1 << 1 : 0);
    if (flagValue > 0) {
      const tx = await contract.setFlag(tokenId, flagValue, payload.value ?? true, ethers.id("flag-ref-hash"));
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    }
    return { txHash: "" };
  },

  async createLien(wallet: ethers.Wallet, tokenId: string): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIEN", wallet);
    const tx = await contract.createLien(tokenId, ethers.id("loan-contract-hash"), ethers.id("release-condition-hash"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async releaseLien(wallet: ethers.Wallet, tokenId: string): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIEN", wallet);
    const tx = await contract.releaseLien(tokenId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async grantConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const tx = await contract.grantWriteConsent(tokenId, ethers.isAddress(payload.grantTo) ? ethers.getAddress(payload.grantTo) : ethers.ZeroAddress, 1, Math.floor(new Date(payload.expiresAt).getTime() / 1000), false, Date.now());
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async revokeConsent(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const tx = await contract.revokeWriteConsent(tokenId, ethers.isAddress(payload.revokeFrom) ? ethers.getAddress(payload.revokeFrom) : ethers.ZeroAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async recordInsurancePolicy(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const policyNumber = payload.policyNo || payload.policyNumber;
    const actionMap: Record<string, number> = { new: 0, renew: 1, change: 2, cancel: 3 };
    const tx = await contract.recordInsurancePolicy(tokenId, ethers.id(policyNumber), actionMap[payload.type?.toLowerCase()] || 0, Math.floor(new Date(payload.startDate || payload.validFrom || Date.now()).getTime() / 1000), Math.floor(new Date(payload.validUntil || payload.endDate || Date.now()).getTime() / 1000), ethers.id("policy-doc-hash"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async fileClaim(wallet: ethers.Wallet, tokenId: string, payload: any, evidence: any[]): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const evidenceHashes = evidence?.length > 0 ? [evidence[0].hash] : [];
    const severityMap: Record<string, number> = { minor: 0, major: 1, structural: 2, total_loss: 3 };
    const tx = await contract.fileClaim(tokenId, ethers.id(payload.claimId || "none"), evidenceHashes, severityMap[payload.severity?.toLowerCase()] || 0);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async recordInspection(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_REGISTRY", wallet);
    const tx = await contract.recordInspection(tokenId, payload.passed ? 1 : 0, ethers.id(JSON.stringify(payload.metrics || {})), ethers.id("cert-hash"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async logMaintenance(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const tx = await contract.logMaintenance(tokenId, ethers.id("consent-ref-hash"), payload.mileageKm || 0, ethers.id("maintenance-hash"), ethers.id(JSON.stringify(payload.parts || [])), 0, Math.floor(Date.now() / 1000));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },

  async logPartCertification(wallet: ethers.Wallet, tokenId: string, payload: any): Promise<BlockchainResult> {
    const contract = getContract("VEHICLE_LIFECYCLE", wallet);
    const tx = await contract.logEvent(tokenId, 200, Math.floor(Date.now() / 1000), ethers.id(JSON.stringify({ type: payload.partType, sn: payload.newPartNo })), ethers.id(payload.reason || "Certification"));
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  },
};
