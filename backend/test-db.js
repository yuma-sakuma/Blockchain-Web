const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        console.log('Connected to MySQL server');

        const [databases] = await connection.query('SHOW DATABASES;');
        console.log('Databases:', databases.map(db => db.Database));

        const dbName = process.env.DB_DATABASE || 'blockchain_vin';
        const exists = databases.some(db => db.Database === dbName);

        if (exists) {
            console.log(`Database ${dbName} exists`);
            await connection.query(`USE ${dbName};`);
            const [tables] = await connection.query('SHOW TABLES;');
            console.log('Tables:', tables);
        } else {
            console.log(`Database ${dbName} does NOT exist`);
        }

        await connection.end();
    } catch (err) {
        console.error('Error connecting to database:', err);
    }
}

test();
