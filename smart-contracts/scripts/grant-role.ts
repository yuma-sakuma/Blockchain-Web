import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    const backendAdmin = ethers.getAddress("0x0c2eD2f1E2c7e7e9395FBa0A33457703e9F2fBd4");

    const addresses = {
        nft: "0x3c6caD1a4d099F3f18496Ed7Fb589155A214C5d9",
        registry: "0xC2D1A7E8b374424e6D84112D33361C27f0d9A64f",
        lifecycle: "0xBe65f6caC58A23658A92F373CF129fFBc7450Aa9",
        lien: "0x917FeF123ffc0a1750AB96E182C4F243Bf115Ca1",
    };

    console.log(`Setting up roles for backend admin: ${backendAdmin}`);

    // 1. VehicleNFT Roles
    const nft = await ethers.getContractAt("VehicleNFT", addresses.nft);
    const nftRoles = ["MANUFACTURER_ROLE", "REGISTRY_ROLE", "LIEN_ROLE"];
    for (const roleName of nftRoles) {
        const role = ethers.keccak256(ethers.toUtf8Bytes(roleName));
        if (!(await nft.hasRole(role, backendAdmin))) {
            console.log(`Granting VehicleNFT.${roleName}...`);
            await (await nft.grantRole(role, backendAdmin)).wait();
        }
    }

    // 2. VehicleRegistry Roles
    const registry = await ethers.getContractAt("VehicleRegistry", addresses.registry);
    const registryRoles = ["DLT_OFFICER_ROLE", "INSPECTOR_ROLE"];
    for (const roleName of registryRoles) {
        const role = ethers.keccak256(ethers.toUtf8Bytes(roleName));
        if (!(await registry.hasRole(role, backendAdmin))) {
            console.log(`Granting VehicleRegistry.${roleName}...`);
            await (await registry.grantRole(role, backendAdmin)).wait();
        }
    }

    // 3. VehicleLien Roles
    const lien = await ethers.getContractAt("VehicleLien", addresses.lien);
    const lienRoles = ["FINANCE_ROLE"];
    for (const roleName of lienRoles) {
        const role = ethers.keccak256(ethers.toUtf8Bytes(roleName));
        if (!(await lien.hasRole(role, backendAdmin))) {
            console.log(`Granting VehicleLien.${roleName}...`);
            await (await lien.grantRole(role, backendAdmin)).wait();
        }
    }

    // 4. VehicleLifecycle Roles
    const lifecycle = await ethers.getContractAt("VehicleLifecycle", addresses.lifecycle);
    const lifecycleRoles = ["DEALER_ROLE", "WORKSHOP_ROLE", "INSURER_ROLE"];
    for (const roleName of lifecycleRoles) {
        const role = ethers.keccak256(ethers.toUtf8Bytes(roleName));
        if (!(await lifecycle.hasRole(role, backendAdmin))) {
            console.log(`Granting VehicleLifecycle.${roleName}...`);
            await (await lifecycle.grantRole(role, backendAdmin)).wait();
        }
    }

    console.log("All roles granted successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
