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
  VEHICLE_REGISTRY: "0x31BDDA50cb573Ff2b2D0692e319117714dEfb622",
  VEHICLE_NFT: "0x09696D2E37816416cE5b99cBb89320354c6a8aDC",
  VEHICLE_LIFECYCLE: "0x89Ff1731a2D042B2146968999a093BB279EB0649",
  VEHICLE_LIEN: "0x56D9FCF510D5474bb5D31C92Eb278FCf57b5844A",
  VEHICLE_CONSENT: "0xA314F48F69ee61D9618e7a3453BEcA0D04B79D53"
};

export const GANACHE_RPC_URL = "http://127.0.0.1:7545";

export const getGanacheProvider = () => {
  return new ethers.JsonRpcProvider(GANACHE_RPC_URL);
};
