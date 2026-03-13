import * as fs from "fs";
import { ethers } from "hardhat";
import * as path from "path";

/**
 * Grant all necessary roles to the Backend Admin Wallet
 * so it can call smart contract functions (mint, register, etc.)
 *
 * Run: npx hardhat run scripts/grant-roles.ts --network ganache
 */
/**
 * Grant all necessary roles to the Backend Admin Wallet
 * so it can call smart contract functions (mint, register, etc.)
 *
 * Exported so it can be called from deploy.ts
 */
export async function grantRoles() {
    const [deployer] = await ethers.getSigners();
    console.log("\n--- Granting Roles (Post-Deployment Sync) ---");
    console.log("Using deployer:", deployer.address);
// ... existing logic ...

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        console.error("deployed-addresses.json not found! Deploy contracts first.");
        return;
    }
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    // Read backend admin address from backend .env
    const backendEnvPath = path.join(__dirname, "..", "..", "backend", ".env");
    let adminAddress = "";
    if (fs.existsSync(backendEnvPath)) {
        const envContent = fs.readFileSync(backendEnvPath, "utf8");
        const match = envContent.match(/ADMIN_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
        if (match) {
            const wallet = new ethers.Wallet(match[1]);
            adminAddress = wallet.address;
        }
    }

    if (!adminAddress) {
        console.error("Could not determine backend admin address from backend/.env");
        return;
    }

    console.log(`Backend Admin Wallet: ${adminAddress}\n`);

    // Helper
    const grantIfNeeded = async (contract: any, roleName: string, roleHash: string, target: string, label: string) => {
        if (!(await contract.hasRole(roleHash, target))) {
            await contract.grantRole(roleHash, target);
            console.log(`✅ ${label}: Granted ${roleName} to ${target}`);
        } else {
            console.log(`⏭️  ${label}: ${roleName} already granted`);
        }
    };

    // ── VehicleNFT ──
    const vehicleNFT = await ethers.getContractAt("VehicleNFT", addresses.VEHICLE_NFT_ADDRESS);
    const MANUFACTURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"));
    const REGISTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
    const LIEN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LIEN_ROLE"));

    // store PK per Role
    const mfgPK = process.env.MANUFACTURER_PRIVATE_KEY || '';
    const dealerPK = process.env.DEALER_PRIVATE_KEY || '';
    const dltOfficerPK = process.env.DLT_OFFICER_PRIVATE_KEY || '';
    const lenderPK = process.env.LENDER_PRIVATE_KEY || '';
    const insurerPK = process.env.INSURER_PRIVATE_KEY || '';
    const serviceProviderPK = process.env.SERVICE_PROVIDER_PRIVATE_KEY || '';
    const inspectorPK = process.env.INSPECTOR_PRIVATE_KEY || '';

    // create all role wallet
    const mfgWallet = new ethers.Wallet(mfgPK);
    const dealerWallet = new ethers.Wallet(dealerPK);
    const dltOfficerWallet = new ethers.Wallet(dltOfficerPK);
    const lenderWallet = new ethers.Wallet(lenderPK);
    const insurerWallet = new ethers.Wallet(insurerPK);
    const serviceProviderWallet = new ethers.Wallet(serviceProviderPK);
    const inspectorWallet = new ethers.Wallet(inspectorPK);

    // ── VehicleRegistry ──
    const vehicleRegistry = await ethers.getContractAt("VehicleRegistry", addresses.VEHICLE_REGISTRY_ADDRESS);
    const DLT_OFFICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DLT_OFFICER_ROLE"));
    const INSPECTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE"));
    
    // ── VehicleLifecycle ──
    const vehicleLifecycle = await ethers.getContractAt("VehicleLifecycle", addresses.VEHICLE_LIFECYCLE_ADDRESS);
    const DEALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE"));
    const WORKSHOP_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WORKSHOP_ROLE"));
    const INSURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSURER_ROLE"));
    
    // ── VehicleLien ──
    const vehicleLien = await ethers.getContractAt("VehicleLien", addresses.VEHICLE_LIEN_ADDRESS);
    const FINANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FINANCE_ROLE"));
    
    await grantIfNeeded(vehicleNFT, "MANUFACTURER_ROLE", MANUFACTURER_ROLE, mfgWallet.address, "VehicleNFT");
    await grantIfNeeded(vehicleNFT, "REGISTRY_ROLE", REGISTRY_ROLE, addresses.VEHICLE_REGISTRY_ADDRESS, "VehicleNFT");
    await grantIfNeeded(vehicleNFT, "LIEN_ROLE", LIEN_ROLE, addresses.VEHICLE_LIEN_ADDRESS, "VehicleNFT");
    await grantIfNeeded(vehicleRegistry, "DLT_OFFICER_ROLE", DLT_OFFICER_ROLE, dltOfficerWallet.address, "VehicleRegistry");
    await grantIfNeeded(vehicleRegistry, "INSPECTOR_ROLE", INSPECTOR_ROLE, inspectorWallet.address, "VehicleRegistry");
    await grantIfNeeded(vehicleLifecycle, "DEALER_ROLE", DEALER_ROLE, dealerWallet.address, "VehicleLifecycle");
    await grantIfNeeded(vehicleLifecycle, "WORKSHOP_ROLE", WORKSHOP_ROLE, serviceProviderWallet.address, "VehicleLifecycle");
    await grantIfNeeded(vehicleLifecycle, "INSURER_ROLE", INSURER_ROLE, insurerWallet.address, "VehicleLifecycle");
    await grantIfNeeded(vehicleLien, "FINANCE_ROLE", FINANCE_ROLE, lenderWallet.address, "VehicleLien");

    console.log("\n🎉 All roles granted successfully!");
}

// Run directly if this script is executed via CLI
if (require.main === module) {
    grantRoles().catch(console.error);
}
