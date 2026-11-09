import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getPaymentInfo } from '@/lib/oxapay';
import { ensureDonationsTable, userFromRequest } from '@/lib/donationsDb';
import { normalizeStatus } from '@/lib/donations';

const UPDATE_STATUS = `UPDATE donations SET status = ?, paid_at = IF(? = 'paid' AND paid_at IS NULL, NOW(), paid_at) WHERE track_id = ?`;

/** Polled by the app while the user pays; refreshes the status from OxaPay. */
export async function POST(req: NextRequest) {
    try {
        const user = userFromRequest(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const trackId = String(body.trackId || '');
        await ensureDonationsTable();
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT status FROM donations WHERE track_id = ? AND user_id = ?',
            [trackId, user.id]
        );
        if (rows.length === 0) return NextResponse.json({ error: 'Donation not found' }, { status: 404 });

        let status = normalizeStatus(rows[0].status);
        if (status !== 'paid') {
            const info = await getPaymentInfo(trackId);
            status = normalizeStatus(info.status);
            await pool.query(UPDATE_STATUS, [status, status, trackId]);
        }
        return NextResponse.json({ success: true, status });
    } catch (error) {
        console.error('Error checking donation status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
