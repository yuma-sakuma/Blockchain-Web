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

  // Grant required roles to deployer on all contracts
  console.log("\n--- Granting Roles ---");

  // VehicleRegistry: DLT_OFFICER_ROLE, INSPECTOR_ROLE
  const DLT_OFFICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DLT_OFFICER_ROLE"));
  const INSPECTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE"));
  await (await vehicleRegistry.grantRole(DLT_OFFICER_ROLE, deployer.address)).wait();
  console.log("✅ DLT_OFFICER_ROLE granted on VehicleRegistry");
  await (await vehicleRegistry.grantRole(INSPECTOR_ROLE, deployer.address)).wait();
  console.log("✅ INSPECTOR_ROLE granted on VehicleRegistry");

  // VehicleLifecycle: WORKSHOP_ROLE, INSURER_ROLE
  const WORKSHOP_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WORKSHOP_ROLE"));
  const INSURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSURER_ROLE"));
  await (await vehicleLifecycle.grantRole(WORKSHOP_ROLE, deployer.address)).wait();
  console.log("✅ WORKSHOP_ROLE granted on VehicleLifecycle");
  await (await vehicleLifecycle.grantRole(INSURER_ROLE, deployer.address)).wait();
  console.log("✅ INSURER_ROLE granted on VehicleLifecycle");

  // VehicleLien: FINANCE_ROLE
  const FINANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FINANCE_ROLE"));
  await (await vehicleLien.grantRole(FINANCE_ROLE, deployer.address)).wait();
  console.log("✅ FINANCE_ROLE granted on VehicleLien");

  // VehicleNFT: REGISTRY_ROLE, LIEN_ROLE (for setTransferLock)
  const REGISTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
  const LIEN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LIEN_ROLE"));
  await (await vehicleNFT.grantRole(REGISTRY_ROLE, deployer.address)).wait();
  console.log("✅ REGISTRY_ROLE granted on VehicleNFT");
  await (await vehicleNFT.grantRole(LIEN_ROLE, deployer.address)).wait();
  console.log("✅ LIEN_ROLE granted on VehicleNFT");

  console.log("--- All Roles Granted ---\n");

  // Auto-sync contract addresses to backend .env
  const backendEnvPath = path.join(__dirname, "..", "..", "backend", ".env");
  try {
    let envContent = "";
    if (fs.existsSync(backendEnvPath)) {
      envContent = fs.readFileSync(backendEnvPath, "utf8");
    }

    // Update or append each contract address
    for (const [key, value] of Object.entries(addresses)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent = envContent.trimEnd() + `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(backendEnvPath, envContent);
    console.log(`\n✅ Backend .env updated at: ${backendEnvPath}`);
  } catch (err) {
    console.warn(`\n⚠️  Could not update backend .env: ${err}`);
    console.warn("Please manually copy addresses from deployed-addresses.json to backend/.env");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
