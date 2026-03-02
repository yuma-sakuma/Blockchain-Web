const { ethers } = require('ethers');
require('dotenv').config();

async function test() {
    const rpcUrl = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
    console.log(`Checking Ganache at ${rpcUrl}...`);

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        console.log('Connected to Ganache!');
        console.log('Network:', network.name, 'ChainId:', network.chainId);

        const accounts = await provider.listAccounts();
        console.log('Available accounts:', accounts.length);

        // Check contract addresses
        const contracts = [
            { name: 'VehicleRegistry', address: process.env.VEHICLE_REGISTRY_ADDRESS },
            { name: 'VehicleNFT', address: process.env.VEHICLE_NFT_ADDRESS },
            { name: 'VehicleLifecycle', address: process.env.VEHICLE_LIFECYCLE_ADDRESS },
            { name: 'VehicleLien', address: process.env.VEHICLE_LIEN_ADDRESS },
            { name: 'VehicleConsent', address: process.env.VEHICLE_CONSENT_ADDRESS },
        ];

        for (const contract of contracts) {
            if (contract.address) {
                const code = await provider.getCode(contract.address);
                if (code === '0x') {
                    console.warn(`[WARNING] No contract deployed at ${contract.name} address: ${contract.address}`);
                } else {
                    console.log(`[OK] Contract ${contract.name} found at ${contract.address}`);
                }
            } else {
                console.error(`[ERROR] No address configured for ${contract.name}`);
            }
        }
    } catch (err) {
        console.error('Error connecting to Ganache:', err.message);
    }
}

test();
