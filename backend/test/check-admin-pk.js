const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config();

const pk = process.env.ADMIN_PRIVATE_KEY;
if (pk) {
    const wallet = new ethers.Wallet(pk);
    console.log('Admin Address:', wallet.address);
} else {
    console.log('No ADMIN_PRIVATE_KEY found');
}
