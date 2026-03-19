const { ethers } = require('ethers');

async function testPeers() {
    const rpcUrl = 'http://127.0.0.1:7545'; // Default Ganache RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    try {
        const peerCount = await provider.send('net_peerCount', []);
        console.log('Peer count:', parseInt(peerCount, 16));
    } catch (err) {
        console.error('Error fetching peer count:', err.message);
    }
}

testPeers();
