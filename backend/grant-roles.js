const { ethers } = require('ethers');
require('dotenv').config();

async function grant() {
    const rpcUrl = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId: 1337,
        name: 'ganache'
    });
    
    // We need the deployer/admin account (Account 0 in Ganache usually has the roles initially)
    const accounts = await provider.listAccounts();
    const adminSigner = await provider.getSigner(accounts[0].address);
    console.log('Using Admin/Deployer Signer:', accounts[0].address);

    const backendWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    console.log('Backend Wallet Address:', backendWallet.address);

    const registryAddr = process.env.VEHICLE_REGISTRY_ADDRESS;
    const nftAddr = process.env.VEHICLE_NFT_ADDRESS;

    const accessControlAbi = [
        "function grantRole(bytes32 role, address account) external",
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
    ];

    const registry = new ethers.Contract(registryAddr, accessControlAbi, adminSigner);
    const nft = new ethers.Contract(nftAddr, accessControlAbi, adminSigner);

    const DLT_OFFICER_ROLE = ethers.id("DLT_OFFICER_ROLE");
    const INSPECTOR_ROLE = ethers.id("INSPECTOR_ROLE");
    const MANUFACTURER_ROLE = ethers.id("MANUFACTURER_ROLE");
    const REGISTRY_ROLE = ethers.id("REGISTRY_ROLE");

    console.log('Granting roles to backend wallet...');
    
    // Grant roles on VehicleRegistry
    try {
        const tx1 = await registry.grantRole(DLT_OFFICER_ROLE, backendWallet.address);
        await tx1.wait();
        console.log('Granted DLT_OFFICER_ROLE to', backendWallet.address);
    } catch (e) { console.error('Failed to grant DLT_OFFICER_ROLE:', e.message); }

    try {
        const tx2 = await registry.grantRole(INSPECTOR_ROLE, backendWallet.address);
        await tx2.wait();
        console.log('Granted INSPECTOR_ROLE to', backendWallet.address);
    } catch (e) { console.error('Failed to grant INSPECTOR_ROLE:', e.message); }

    // Grant roles on VehicleNFT
    try {
        const tx3 = await nft.grantRole(MANUFACTURER_ROLE, backendWallet.address);
        await tx3.wait();
        console.log('Granted MANUFACTURER_ROLE to', backendWallet.address);
    } catch (e) { console.error('Failed to grant MANUFACTURER_ROLE:', e.message); }

    try {
        const tx4 = await nft.grantRole(REGISTRY_ROLE, registryAddr);
        await tx4.wait();
        console.log('Granted REGISTRY_ROLE to Registry Contract:', registryAddr);
    } catch (e) { console.error('Failed to grant REGISTRY_ROLE:', e.message); }

    console.log('Role granting complete.');
}

grant().catch(console.error);
