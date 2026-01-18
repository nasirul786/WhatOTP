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
};

let pool: mysql.Pool;

if (process.env.NODE_ENV === 'production') {
    pool = mysql.createPool(dbConfig);
} else {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!(global as any).mysqlPool) {
        (global as any).mysqlPool = mysql.createPool(dbConfig);
    }
    pool = (global as any).mysqlPool;
}

export default pool;
