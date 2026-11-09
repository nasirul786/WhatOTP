import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyCallbackSignature } from '@/lib/oxapay';
import { ensureDonationsTable } from '@/lib/donationsDb';
import { normalizeStatus } from '@/lib/donations';

/** OxaPay payment webhook (HMAC-signed). Must answer plain "ok" with HTTP 200 once processed. */
export async function POST(req: NextRequest) {
    const raw = await req.text();
    if (!verifyCallbackSignature(raw, req.headers.get('hmac'))) {
        return new NextResponse('Invalid signature', { status: 400 });
    }

    try {
        const payload = JSON.parse(raw);
        const trackId = String(payload.track_id || payload.trackId || '');
        if (!trackId) return new NextResponse('ok', { status: 200 });

        const status = normalizeStatus(payload.status);
        await ensureDonationsTable();
        await pool.query(
            `UPDATE donations SET status = ?, paid_at = IF(? = 'paid' AND paid_at IS NULL, NOW(), paid_at) WHERE track_id = ?`,
            [status, status, trackId]
        );
        return new NextResponse('ok', { status: 200 });
    } catch (error) {
        console.error('Error handling OxaPay callback:', error);
        return new NextResponse('error', { status: 500 });
    }
}
