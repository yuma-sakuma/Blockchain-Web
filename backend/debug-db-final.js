const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'blockchain_vin',
    };

    console.log('Connecting to:', config.host, config.database);

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected!');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const [columns] = await connection.execute('DESCRIBE vehicles');
        console.log('Vehicles Columns:', columns.map(c => `${c.Field} (${c.Type})`));

        const [rows] = await connection.execute('SELECT tokenId, specJson FROM vehicles');
        console.log('Rows count:', rows.length);
        rows.forEach(r => {
            console.log(`Token ${r.tokenId}:`, typeof r.specJson, r.specJson);
        });

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
