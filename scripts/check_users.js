
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        const [rows] = await connection.query("SELECT * FROM users LIMIT 5");
        console.log('Users:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

main();
