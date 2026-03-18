const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'blockchain_vin',
        });
        console.log('Connected to DB');

        const [rows] = await connection.execute('SELECT tokenId, specJson FROM vehicles LIMIT 5');
        console.log('Vehicles:', JSON.stringify(rows));

        const [plates] = await connection.execute('SELECT * FROM plate_records LIMIT 5');
        console.log('Plates:', JSON.stringify(plates));

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
