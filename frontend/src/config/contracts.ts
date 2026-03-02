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
  VEHICLE_REGISTRY: "0x2343Bd3f0f5073CBE20DA494a82ed4220F45F9bE",
  VEHICLE_NFT: "0x6631327B5dB8e953FF7D0BD3359d83c876e367fD",
  VEHICLE_LIFECYCLE: "0xc8763192e652C87ACc38cCFE26cc6fC2CFa6F632",
  VEHICLE_LIEN: "0xf6c9abf94Da039c91aA31194044Fe2Fd3Bdab91B",
  VEHICLE_CONSENT: "0xD26B04013037c98E8eBa73ca4F98Af2764fECCA0"
};

export const GANACHE_RPC_URL = "http://127.0.0.1:7545";

export const getGanacheProvider = () => {
  return new ethers.JsonRpcProvider(GANACHE_RPC_URL);
};
