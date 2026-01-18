const mysql = require('mysql2/promise');

async function run() {
    console.log('Connecting to DB...');
    // Log variables to be sure (mask password)
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Pass:', process.env.DB_PASS ? '*****' : 'ND');
    console.log('DB:', process.env.DB_NAME);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT) || 3306
        });

        console.log('Connected.');
        try {
            await connection.query("ALTER TABLE users ADD COLUMN theme VARCHAR(10) DEFAULT 'system'");
            console.log('Theme column added successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column already exists.');
            } else {
                console.error(e);
            }
        }
        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

run();
