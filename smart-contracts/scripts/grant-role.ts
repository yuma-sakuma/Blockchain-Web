import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    // The account address from the backend's ADMIN_PRIVATE_KEY
    const backendAdmin = ethers.getAddress("0x0c2eD2f1E2c7e7e9395FBa0A33457703e9F2fBd4");

    // Addresses from the most recent deployment
    const nftAddress = "0x3c6caD1a4d099F3f18496Ed7Fb589155A214C5d9";

    const nft = await ethers.getContractAt("VehicleNFT", nftAddress);

    const MANUFACTURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"));

    console.log(`Granting MANUFACTURER_ROLE to ${backendAdmin}...`);
    const tx = await nft.grantRole(MANUFACTURER_ROLE, backendAdmin);
    await tx.wait();
    console.log("Role granted successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
