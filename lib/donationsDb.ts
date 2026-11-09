import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { validateAndGetUser } from '@/lib/auth';

let ensured: Promise<void> | null = null;

/** Creates the donations table on first use (same schema as db.sql). */
export function ensureDonationsTable() {
    ensured ??= pool.query(`
        CREATE TABLE IF NOT EXISTS donations (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(64) NOT NULL,
            track_id VARCHAR(64) NULL,
            user_id BIGINT UNSIGNED NULL,
            first_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
            last_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
            username VARCHAR(255) NULL,
            photo_url TEXT NULL,
            is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
            amount DECIMAL(18, 6) NOT NULL,
            network VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'waiting',
            pay_amount DECIMAL(24, 8) NULL,
            address VARCHAR(255) NULL,
            memo VARCHAR(255) NULL,
            qr_code TEXT NULL,
            expired_at INT UNSIGNED NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP NULL,
            UNIQUE KEY uq_order_id (order_id),
            UNIQUE KEY uq_track_id (track_id),
            KEY idx_status_paid (status, paid_at),
            KEY idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).then(() => undefined).catch((e) => {
        ensured = null; // retry next time
        throw e;
    });
    return ensured;
}

/** Telegram user from the `Authorization: Bearer <initData>` header, or null if invalid. */
export function userFromRequest(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';
    const initData = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    return initData ? validateAndGetUser(initData) : null;
}

/** Public https origin of this app (works behind ngrok / proxies), for the OxaPay callback URL. */
export function publicOrigin(req: NextRequest) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
    return host && proto === 'https' ? `https://${host}` : null;
}
