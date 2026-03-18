const { ethers } = require('ethers');
require('dotenv').config();

async function check() {
    const rpcUrl = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminPK = process.env.ADMIN_PRIVATE_KEY;
    const wallet = new ethers.Wallet(adminPK, provider);
    console.log('Admin Wallet Address:', wallet.address);

    const registryAddr = process.env.VEHICLE_REGISTRY_ADDRESS;
    const nftAddr = process.env.VEHICLE_NFT_ADDRESS;

    const registryAbi = [
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function registrations(uint256 tokenId) view returns (bool isRegistered, uint64 registeredAt, address dltOfficer, bytes32 greenBookNoHash, bytes32 registrationDocHash, uint8 status)",
        "function DLT_OFFICER_ROLE() view returns (bytes32)"
    ];

    const nftAbi = [
        "function ownerOf(uint256 tokenId) view returns (address)"
    ];

    const registry = new ethers.Contract(registryAddr, registryAbi, provider);
    const nft = new ethers.Contract(nftAddr, nftAbi, provider);

    const dltRole = await registry.DLT_OFFICER_ROLE();
    const hasDlt = await registry.hasRole(dltRole, wallet.address);
    console.log('Has DLT_OFFICER_ROLE:', hasDlt);

    const tokenId = 1; // Assuming checking for tokenId 1
    try {
        const owner = await nft.ownerOf(tokenId);
        console.log(`Token ${tokenId} owner on-chain:`, owner);
    } catch (e) {
        console.log(`Token ${tokenId} check failed:`, e.message);
    }

    const reg = await registry.registrations(tokenId);
    console.log(`Token ${tokenId} registration on-chain:`, reg.isRegistered);
}

check().catch(console.error);
