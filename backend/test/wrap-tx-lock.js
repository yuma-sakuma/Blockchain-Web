const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'event', 'event.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Regex to find blocks like:
// const tx = await this.blockchainService.[something].[method](...);
// const receipt = await tx.wait();
// txHash = receipt.hash;

// The challenge is the variadic arguments. 
// A better approach is to match: "const tx = await this.blockchainService" ... until "txHash = receipt.hash;" and capture the inner content.

const regex = /(const tx = await this\.blockchainService\.[^;]+;\s*const receipt = await tx\.wait\(\);\s*txHash = receipt\.hash;)/g;

let matchCount = 0;
content = content.replace(regex, (match) => {
    matchCount++;
    // Indent the matched content
    const indentedMatch = match.split('\n').map(line => '  ' + line).join('\n');
    return `await this.blockchainService.withTxLock(async () => {\n${indentedMatch}\n});`;
});

console.log(`Replaced ${matchCount} standard instances.`);

// There is one exception for `MANUFACTURER_MINTED` which doesn't have `txHash = receipt.hash;` immediately or in the exact same format (it's similar but let's check).
// Wait, looking at event.service.ts:
// MANUFACTURER_MINTED:
//           const tx = await this.blockchainService.vehicleNFTContract.mintVehicle(...)
//           const receipt = await tx.wait();
//           txHash = receipt.hash;

fs.writeFileSync(filePath, content);
console.log('Done.');
