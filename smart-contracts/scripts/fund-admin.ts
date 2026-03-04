import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();

    // Read backend admin address from .env
    const backendEnvPath = path.join(__dirname, "..", "..", "backend", ".env");
    const envContent = fs.readFileSync(backendEnvPath, "utf8");
    const match = envContent.match(/ADMIN_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
    if (!match) { console.error("No ADMIN_PRIVATE_KEY found"); return; }
    const adminAddress = new ethers.Wallet(match[1]).address;

    console.log(`Deployer: ${deployer.address}`);
    console.log(`Backend Admin: ${adminAddress}`);

    const balBefore = await ethers.provider.getBalance(adminAddress);
    console.log(`Balance before: ${ethers.formatEther(balBefore)} ETH`);

    const tx = await deployer.sendTransaction({
        to: adminAddress,
        value: ethers.parseEther("10")
    });
    await tx.wait();

    const balAfter = await ethers.provider.getBalance(adminAddress);
    console.log(`Balance after: ${ethers.formatEther(balAfter)} ETH`);
    console.log("✅ Done!");
}

main().catch(console.error);
