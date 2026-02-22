import * as fs from "fs";
import { ethers } from "hardhat";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy VehicleNFT
  const VehicleNFT = await ethers.getContractFactory("VehicleNFT");
  const vehicleNFT = await VehicleNFT.deploy();
  await vehicleNFT.waitForDeployment();
  const vehicleNFTAddress = await vehicleNFT.getAddress();
  console.log("VehicleNFT deployed to:", vehicleNFTAddress);

  // 2. Deploy VehicleRegistry
  const VehicleRegistry = await ethers.getContractFactory("VehicleRegistry");
  const vehicleRegistry = await VehicleRegistry.deploy(vehicleNFTAddress);
  await vehicleRegistry.waitForDeployment();
  const vehicleRegistryAddress = await vehicleRegistry.getAddress();
  console.log("VehicleRegistry deployed to:", vehicleRegistryAddress);

  // 3. Deploy VehicleLifecycle
  const VehicleLifecycle = await ethers.getContractFactory("VehicleLifecycle");
  const vehicleLifecycle = await VehicleLifecycle.deploy(vehicleNFTAddress);
  await vehicleLifecycle.waitForDeployment();
  const vehicleLifecycleAddress = await vehicleLifecycle.getAddress();
  console.log("VehicleLifecycle deployed to:", vehicleLifecycleAddress);

  // 4. Deploy VehicleLien
  const VehicleLien = await ethers.getContractFactory("VehicleLien");
  const vehicleLien = await VehicleLien.deploy(vehicleNFTAddress);
  await vehicleLien.waitForDeployment();
  const vehicleLienAddress = await vehicleLien.getAddress();
  console.log("VehicleLien deployed to:", vehicleLienAddress);

  // 5. Deploy VehicleConsent
  const VehicleConsent = await ethers.getContractFactory("VehicleConsent");
  const vehicleConsent = await VehicleConsent.deploy(vehicleNFTAddress);
  await vehicleConsent.waitForDeployment();
  const vehicleConsentAddress = await vehicleConsent.getAddress();
  console.log("VehicleConsent deployed to:", vehicleConsentAddress);

  // Save the contract addresses
  const addresses = {
    VEHICLE_NFT_ADDRESS: vehicleNFTAddress,
    VEHICLE_REGISTRY_ADDRESS: vehicleRegistryAddress,
    VEHICLE_LIFECYCLE_ADDRESS: vehicleLifecycleAddress,
    VEHICLE_LIEN_ADDRESS: vehicleLienAddress,
    VEHICLE_CONSENT_ADDRESS: vehicleConsentAddress
  };

  const addressesStr = JSON.stringify(addresses, null, 2);
  console.log("\nContract Addresses:\n", addressesStr);
  fs.writeFileSync(path.join(__dirname, "deployed-addresses.json"), addressesStr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
