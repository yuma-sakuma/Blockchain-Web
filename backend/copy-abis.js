const fs = require('fs');
const path = require('path');

const contracts = [
    'VehicleNFT',
    'VehicleRegistry',
    'VehicleLifecycle',
    'VehicleLien',
    'VehicleConsent'
];

const srcBase = path.join(__dirname, '..', 'smart-contracts', 'artifacts', 'contracts');
const destBase = path.join(__dirname, '..', 'backend', 'src', 'blockchain', 'abi');

contracts.forEach(contract => {
    const src = path.join(srcBase, `${contract}.sol`, `${contract}.json`);
    const destDir = path.join(destBase, `${contract}.sol`);
    const dest = path.join(destDir, `${contract}.json`);

    try {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
        console.log(`Copied ${contract}.json`);
    } catch (err) {
        console.error(`Error copying ${contract}:`, err.message);
    }
});
