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
                CREATE TABLE IF NOT EXISTS telegram_biometrics (
                    user_id BIGINT PRIMARY KEY,
                    device_id VARCHAR(255),
                    token TEXT,
                    enabled BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );
            `);
            console.log('telegram_biometrics table ensured.');
        } catch (e) {
            console.error('Error creating telegram_biometrics table:', e);
        }

        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

run();
