import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    // Treat every DATETIME as UTC, regardless of where the app server runs.
    // Without this, mysql2 reads UTC values (e.g. from NOW()) as the server's local time.
    timezone: 'Z',
};

function createPool() {
    const p = mysql.createPool(dbConfig);
    // Make NOW() and friends return UTC too, so SQL- and JS-generated times agree.
    p.pool.on('connection', (conn) => {
        conn.query("SET time_zone = '+00:00'");
    });
    return p;
}

let pool: mysql.Pool;

if (process.env.NODE_ENV === 'production') {
    pool = createPool();
} else {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!(global as any).mysqlPool) {
        (global as any).mysqlPool = createPool();
    }
    pool = (global as any).mysqlPool;
}

export default pool;
