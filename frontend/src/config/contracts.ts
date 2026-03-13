import { ethers } from "ethers";

// ABIs
import vehicleConsentAbi from "../abi/VehicleConsent.sol/VehicleConsent.json";
import vehicleLienAbi from "../abi/VehicleLien.sol/VehicleLien.json";
import vehicleLifecycleAbi from "../abi/VehicleLifecycle.sol/VehicleLifecycle.json";
import vehicleNFTAbi from "../abi/VehicleNFT.sol/VehicleNFT.json";
import vehicleRegistryAbi from "../abi/VehicleRegistry.sol/VehicleRegistry.json";

export const ABIS = {
  VEHICLE_REGISTRY: vehicleRegistryAbi.abi,
  VEHICLE_NFT: vehicleNFTAbi.abi,
  VEHICLE_LIFECYCLE: vehicleLifecycleAbi.abi,
  VEHICLE_LIEN: vehicleLienAbi.abi,
  VEHICLE_CONSENT: vehicleConsentAbi.abi,
};

export const CONTRACT_ADDRESSES = {
  VEHICLE_REGISTRY: import.meta.env.VITE_VEHICLE_REGISTRY_ADDRESS || "0x5C1a76d5820DeedaC3037E1D0bF6015b7de9DAcb",
  VEHICLE_NFT: import.meta.env.VITE_VEHICLE_NFT_ADDRESS || "0x26C2132d0589609AAFF60Da812a512f56278F8Aa",
  VEHICLE_LIFECYCLE: import.meta.env.VITE_VEHICLE_LIFECYCLE_ADDRESS || "0x4C2640D97F19fd93bbBA42149015aEbA291B5863",
  VEHICLE_LIEN: import.meta.env.VITE_VEHICLE_LIEN_ADDRESS || "0x434FE292970868344D718d4b5fdDC57dDCA0B279",
  VEHICLE_CONSENT: import.meta.env.VITE_VEHICLE_CONSENT_ADDRESS || "0xc21a2e39d1aF76dC5891C6b4396746817a0d1a07"
};

export const GANACHE_RPC_URL = "http://127.0.0.1:7545";

export const getGanacheProvider = () => {
  return new ethers.JsonRpcProvider(GANACHE_RPC_URL);
};

export const ROLE_PRIVATE_KEYS: Record<string, string> = {
  MANUFACTURER: import.meta.env.VITE_MANUFACTURER_PRIVATE_KEY || "",
  DEALER: import.meta.env.VITE_DEALER_PRIVATE_KEY || "",
  DLT_OFFICER: import.meta.env.VITE_DLT_OFFICER_PRIVATE_KEY || "",
  CONSUMER: import.meta.env.VITE_CONSUMER_PRIVATE_KEY || "",
  LENDER: import.meta.env.VITE_LENDER_PRIVATE_KEY || "",
  INSURER: import.meta.env.VITE_INSURER_PRIVATE_KEY || "",
  SERVICE_PROVIDER: import.meta.env.VITE_SERVICE_PROVIDER_PRIVATE_KEY || "",
  INSPECTOR: import.meta.env.VITE_INSPECTOR_PRIVATE_KEY || "",
};

export const getWalletForRole = (role: string): ethers.Wallet | null => {
  const privateKey = ROLE_PRIVATE_KEYS[role.toUpperCase()];
  if (!privateKey) {
    console.warn(`No private key found for role: ${role}`);
    return null;
  }
  const provider = getGanacheProvider();
  return new ethers.Wallet(privateKey, provider);
};

export const getContract = (name: keyof typeof CONTRACT_ADDRESSES, signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESSES[name], ABIS[name], signerOrProvider);
};
