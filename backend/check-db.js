const { DataSource } = require('typeorm');
require('dotenv').config();

// We'll just use raw SQL to avoid needing to import entities which might be complex in a script
async function check() {
    const ds = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'blockchain_vin',
    });

    try {
        await ds.initialize();
        console.log('Connected to DB');

        const vehicles = await ds.query('SELECT tokenId, vinNumber, specJson FROM vehicles');
        console.log('--- Vehicles ---');
        vehicles.forEach(v => {
            console.log(`Token: ${v.tokenId}, VIN: ${v.vinNumber}, specJson: ${v.specJson}`);
        });

        const plates = await ds.query('SELECT * FROM plate_records');
        console.log('--- Plate Records ---');
        plates.forEach(p => {
            console.log(`ID: ${p.id}, Token: ${p.tokenId}, Plate: ${p.plateNo}, Type: ${p.eventType}`);
        });

        await ds.destroy();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
