
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        console.log('Adding locked_until column...');
        await connection.query(`
            ALTER TABLE users
            ADD COLUMN locked_until TIMESTAMP NULL DEFAULT NULL
        `);
        console.log('Column added successfully.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error('Error adding column:', e);
        }
    } finally {
        await connection.end();
    }
}

main();
