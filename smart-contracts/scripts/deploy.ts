import * as dotenv from "dotenv";
import * as fs from "fs";
import { ethers } from "hardhat";
import * as path from "path";
import {
  VehicleConsent__factory,
  VehicleLien__factory,
  VehicleLifecycle__factory,
  VehicleNFT__factory,
  VehicleRegistry__factory,
} from "../typechain-types";

// Load smart-contracts/.env
dotenv.config();

async function main() {
  // ============================================================
  // 1. Build role wallets from private keys in .env
  // ============================================================
  const provider = ethers.provider;
  const signers = await ethers.getSigners();
  const deployer = signers[0]; // The first account = DEPLOYER_PRIVATE_KEY

  console.log("=== Multi-Account Deployment ===");
  console.log("Deployer address:", deployer.address);

  // Helper: create a Wallet from env key, fallback to deployer
  function walletFromEnv(envKey: string): { address: string; wallet: any } {
    const pk = process.env[envKey];
    if (pk) {
      const w = new ethers.Wallet(pk, provider);
      return { address: w.address, wallet: w };
    }
    console.warn(`⚠️  ${envKey} not set, falling back to deployer`);
    return { address: deployer.address, wallet: deployer };
  }

  const manufacturer = walletFromEnv("MANUFACTURER_PRIVATE_KEY");
  const dealer = walletFromEnv("DEALER_PRIVATE_KEY");
  const dltOfficer = walletFromEnv("DLT_OFFICER_PRIVATE_KEY");
  const consumer = walletFromEnv("CONSUMER_PRIVATE_KEY");
  const lender = walletFromEnv("LENDER_PRIVATE_KEY");
  const insurer = walletFromEnv("INSURER_PRIVATE_KEY");
  const serviceProvider = walletFromEnv("SERVICE_PROVIDER_PRIVATE_KEY");
  const inspector = walletFromEnv("INSPECTOR_PRIVATE_KEY");

  console.log("\n--- Role Addresses (derived from Private Keys) ---");
  console.log("Manufacturer :", manufacturer.address);
  console.log("Dealer       :", dealer.address);
  console.log("DLT Officer  :", dltOfficer.address);
  console.log("Consumer     :", consumer.address);
  console.log("Lender       :", lender.address);
  console.log("Insurer      :", insurer.address);
  console.log("Service Prov.:", serviceProvider.address);
  console.log("Inspector    :", inspector.address);

  // ============================================================
  // 2. Deploy base contracts (Deployer pays gas)
  // ============================================================
  console.log("\n=== Deploying Contracts (gas paid by Deployer) ===");

  const vehicleNFT = await new VehicleNFT__factory(deployer).deploy();
  await vehicleNFT.waitForDeployment();
  const vehicleNFTAddress = await vehicleNFT.getAddress();
  console.log("✅ VehicleNFT deployed to:", vehicleNFTAddress);

  const vehicleRegistry = await new VehicleRegistry__factory(deployer).deploy(vehicleNFTAddress);
  await vehicleRegistry.waitForDeployment();
  const vehicleRegistryAddress = await vehicleRegistry.getAddress();
  console.log("✅ VehicleRegistry deployed to:", vehicleRegistryAddress);

  const vehicleLifecycle = await new VehicleLifecycle__factory(deployer).deploy(vehicleNFTAddress);
  await vehicleLifecycle.waitForDeployment();
  const vehicleLifecycleAddress = await vehicleLifecycle.getAddress();
  console.log("✅ VehicleLifecycle deployed to:", vehicleLifecycleAddress);

  const vehicleLien = await new VehicleLien__factory(deployer).deploy(vehicleNFTAddress);
  await vehicleLien.waitForDeployment();
  const vehicleLienAddress = await vehicleLien.getAddress();
  console.log("✅ VehicleLien deployed to:", vehicleLienAddress);

  const vehicleConsent = await new VehicleConsent__factory(deployer).deploy(vehicleNFTAddress);
  await vehicleConsent.waitForDeployment();
  const vehicleConsentAddress = await vehicleConsent.getAddress();
  console.log("✅ VehicleConsent deployed to:", vehicleConsentAddress);

  // ============================================================
  // 3. Grant roles (Deployer = Admin, pays gas for grantRole)
  // ============================================================
  console.log("\n=== Granting Roles (gas paid by Deployer as Admin) ===");

  // -- VehicleRegistry roles --
  const DLT_OFFICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DLT_OFFICER_ROLE"));
  const INSPECTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE"));

  await (await vehicleRegistry.connect(deployer).grantRole(DLT_OFFICER_ROLE, dltOfficer.address)).wait();
  console.log(`✅ DLT_OFFICER_ROLE granted to ${dltOfficer.address}`);

  await (await vehicleRegistry.connect(deployer).grantRole(INSPECTOR_ROLE, inspector.address)).wait();
  console.log(`✅ INSPECTOR_ROLE granted to ${inspector.address}`);

  // -- VehicleLifecycle roles --
  const WORKSHOP_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WORKSHOP_ROLE"));
  const INSURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSURER_ROLE"));

  await (await vehicleLifecycle.connect(deployer).grantRole(WORKSHOP_ROLE, serviceProvider.address)).wait();
  console.log(`✅ WORKSHOP_ROLE granted to ${serviceProvider.address}`);

  await (await vehicleLifecycle.connect(deployer).grantRole(INSURER_ROLE, insurer.address)).wait();
  console.log(`✅ INSURER_ROLE granted to ${insurer.address}`);

  // -- VehicleLien roles --
  const FINANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FINANCE_ROLE"));

  await (await vehicleLien.connect(deployer).grantRole(FINANCE_ROLE, lender.address)).wait();
  console.log(`✅ FINANCE_ROLE granted to ${lender.address}`);

  // -- VehicleNFT roles --
  const REGISTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
  const LIEN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LIEN_ROLE"));

  await (await vehicleNFT.connect(deployer).grantRole(REGISTRY_ROLE, deployer.address)).wait();
  console.log(`✅ REGISTRY_ROLE granted to deployer ${deployer.address}`);

  await (await vehicleNFT.connect(deployer).grantRole(LIEN_ROLE, deployer.address)).wait();
  console.log(`✅ LIEN_ROLE granted to deployer ${deployer.address}`);

  console.log("\n=== All Roles Granted ===");

  // ============================================================
  // 4. Save deployed contract addresses
  // ============================================================
  const contractAddresses = {
    VEHICLE_NFT_ADDRESS: vehicleNFTAddress,
    VEHICLE_REGISTRY_ADDRESS: vehicleRegistryAddress,
    VEHICLE_LIFECYCLE_ADDRESS: vehicleLifecycleAddress,
    VEHICLE_LIEN_ADDRESS: vehicleLienAddress,
    VEHICLE_CONSENT_ADDRESS: vehicleConsentAddress,
  };

  const addressesStr = JSON.stringify(contractAddresses, null, 2);
  console.log("\nContract Addresses:\n", addressesStr);
  fs.writeFileSync(path.join(__dirname, "deployed-addresses.json"), addressesStr);

  // ============================================================
  // 5. Auto-sync to backend/.env (contract addresses + admin key)
  // ============================================================
  const backendEnvPath = path.join(__dirname, "..", "..", "backend", ".env");
  try {
    let envContent = "";
    if (fs.existsSync(backendEnvPath)) {
      envContent = fs.readFileSync(backendEnvPath, "utf8");
    }

    // Sync contract addresses
    for (const [key, value] of Object.entries(contractAddresses)) {
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
  }

  // ============================================================
  // 6. Auto-sync to frontend/.env (public addresses for roles)
  // ============================================================
  const frontendEnvPath = path.join(__dirname, "..", "..", "frontend", ".env");
  try {
    let envContent = "";
    if (fs.existsSync(frontendEnvPath)) {
      envContent = fs.readFileSync(frontendEnvPath, "utf8");
    }

    const roleAddresses: Record<string, string> = {
      VITE_MANUFACTURER_ADDRESS: manufacturer.address,
      VITE_DEALER_ADDRESS: dealer.address,
      VITE_DLT_OFFICER_ADDRESS: dltOfficer.address,
      VITE_CONSUMER_ADDRESS: consumer.address,
      VITE_LENDER_ADDRESS: lender.address,
      VITE_INSURER_ADDRESS: insurer.address,
      VITE_SERVICE_PROVIDER_ADDRESS: serviceProvider.address,
      VITE_INSPECTOR_ADDRESS: inspector.address,
    };

    for (const [key, value] of Object.entries(roleAddresses)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent = envContent.trimEnd() + `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(frontendEnvPath, envContent);
    console.log(`✅ Frontend .env updated at: ${frontendEnvPath}`);
    console.log("\n--- Frontend Role Addresses Written ---");
    for (const [key, value] of Object.entries(roleAddresses)) {
      console.log(`   ${key}=${value}`);
    }
  } catch (err) {
    console.warn(`\n⚠️  Could not update frontend .env: ${err}`);
  }

  console.log("\n🎉 Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
