const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
dotenv.config();

const AppDataSource = new DataSource({
    type: 'mariadb',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'blockchain_vin',
});

AppDataSource.initialize()
    .then(() => {
        console.log('Database connection successful!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Database connection failed:', error);
        process.exit(1);
    });
