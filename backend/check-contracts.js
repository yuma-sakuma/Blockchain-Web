const { ethers } = require('ethers');

async function check() {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const addresses = [
        '0xE95E068B4B6d9b1a039204e6637482bAd2D53Dc6',
        '0x92D414a520345CD1C9bc16d57A298eBfBa001fF4',
        '0xC2b478eC78Cee09546c10872Bf19704A2fdcC561',
        '0xA0bA3B02a28929aaAB321acEbA09D3c45bE10529',
        '0xD48CE767a0419aE8d03a800595Dba26212610EdC'
    ];

    for (const addr of addresses) {
        const code = await provider.getCode(addr);
        console.log(`${addr}: ${code === '0x' ? 'NO CODE' : 'HAS CODE'}`);
    }
}

check().catch(console.error);
