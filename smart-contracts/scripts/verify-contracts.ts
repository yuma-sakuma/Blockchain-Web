import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const addressesPath = path.join(__dirname, "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        console.error("deployed-addresses.json not found!");
        return;
    }
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    console.log("Checking contracts on-chain...\n");

    for (const [name, address] of Object.entries(addresses)) {
        const code = await ethers.provider.getCode(address as string);
        if (code === "0x") {
            console.log(`❌ ${name} has NO CODE at ${address}`);
            continue;
        }

        console.log(`✅ ${name} found at ${address}`);

        // Detailed checks for specific contracts
        if (name === "VEHICLE_NFT_ADDRESS") {
            const nft = await ethers.getContractAt("VehicleNFT", address as string);
            const nftName = await nft.name();
            const nftSymbol = await nft.symbol();
            console.log(`   - Name: ${nftName}, Symbol: ${nftSymbol}`);
        }
    }

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`\nDeployer Address: ${deployer.address}`);
    console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);
}

main().catch(console.error);
