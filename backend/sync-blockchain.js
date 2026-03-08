const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config();

const ABI = [
    "function mintVehicle(address to, bytes32 vinHash, uint64 manufacturedAt, bytes32 modelHash, bytes32 specHash) external returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function isVinUsed(bytes32 vinHash) external view returns (bool)"
];

async function sync() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'blockchain_vin',
        });
        console.log('✅ Connected to Database');

        const provider = new ethers.JsonRpcProvider(process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545', {
            chainId: 1337,
            name: 'ganache'
        });
        const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(process.env.VEHICLE_NFT_ADDRESS, ABI, wallet);
        console.log('✅ Connected to Blockchain');

        const [vehicles] = await connection.execute('SELECT * FROM vehicles');
        console.log(`Found ${vehicles.length} vehicles in database.`);

        for (const v of vehicles) {
            process.stdout.write(`Checking Token ${v.tokenId} (VIN: ${v.vinNumber})... `);
            try {
                await contract.ownerOf(v.tokenId);
                console.log('Exists ✅');
            } catch (err) {
                console.log('Missing ❌');
                
                // Try to re-mint
                console.log(`   Attempting Re-Mint for VIN ${v.vinNumber}...`);
                const vinHash = ethers.id(v.vinNumber);
                
                // Check if VIN used on-chain under different ID
                const vinUsed = await contract.isVinUsed(vinHash);
                if (vinUsed) {
                    console.log(`   ⚠️ VIN ${v.vinNumber} is already used on-chain. Cannot re-mint with same VIN. Skipping.`);
                    continue;
                }

                const modelHash = ethers.id(JSON.stringify(v.modelJson));
                const specHash = ethers.id(JSON.stringify(v.specJson));
                const manufacturedAt = BigInt(v.manufacturedAt || Date.now());

                const tx = await contract.mintVehicle(
                    wallet.address,
                    vinHash,
                    manufacturedAt,
                    modelHash,
                    specHash
                );
                const receipt = await tx.wait();
                
                // Get the NEW Token ID
                const transferLog = receipt.logs.find(l => {
                    try {
                        return contract.interface.parseLog(l).name === 'Transfer';
                    } catch (e) { return false; }
                });
                const newTokenId = contract.interface.parseLog(transferLog).args.tokenId.toString();
                
                console.log(`   ✨ Re-minted! New Token ID: ${newTokenId}. Updating Database...`);
                
                // Tables to update
                const tables = [
                    'vehicles',
                    'registrations',
                    'plate_records',
                    'tax_payments',
                    'ownership_transfers',
                    'maintenance_logs',
                    'insurance_policies',
                    'insurance_claims',
                    'inspections',
                    'consent_grants',
                    'vehicle_flags'
                ];

                for (const table of tables) {
                    try {
                        const [result] = await connection.execute(`UPDATE ${table} SET tokenId = ? WHERE tokenId = ?`, [newTokenId, v.tokenId]);
                        if (result.affectedRows > 0) {
                            console.log(`      ✅ Updated ${table} (${result.affectedRows} rows)`);
                        }
                    } catch (e) {
                        // Table might not exist or field named differently (though mostly they use tokenId)
                        // console.log(`      ⚠️ Skipped ${table}: ${e.message}`);
                    }
                }
            }
        }

    } catch (err) {
        console.error('❌ Sync Failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

sync();
