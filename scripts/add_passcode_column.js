const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306'),
    });

    try {
        console.log('Adding passcode_hash to users table...');

        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passcode_hash';
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN passcode_hash VARCHAR(255) DEFAULT NULL");
            console.log("Column passcode_hash added.");
        } else {
            console.log("Column passcode_hash already exists.");
        }

        console.log('Migration completed.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
