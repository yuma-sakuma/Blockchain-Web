const { ethers } = require('ethers');
const pk = '0x9086dd4fa40775839848b41923e5394bd5062f5764e9da15e03a286a28e15c7d';
const wallet = new ethers.Wallet(pk);
console.log('Address:', wallet.address);
console.log('Length:', wallet.address.length);
