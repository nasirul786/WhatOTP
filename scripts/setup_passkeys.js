const mysql = require('mysql2/promise');

async function run() {
    console.log('Connecting to DB...');
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
            await connection.query(`
                CREATE TABLE IF NOT EXISTS passkeys (
                    id VARCHAR(255) PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    public_key TEXT NOT NULL,
                    counter INT DEFAULT 0,
                    transports VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );
            `);
            console.log('Passkeys table ensured.');
        } catch (e) {
            console.error('Error creating passkeys table:', e);
        }

        try {
            await connection.query("ALTER TABLE users ADD COLUMN last_verified_at TIMESTAMP NULL");
            console.log('last_verified_at column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('last_verified_at column already exists.');
            } else {
                console.error('Error adding last_verified_at:', e);
            }
        }
        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

run();
