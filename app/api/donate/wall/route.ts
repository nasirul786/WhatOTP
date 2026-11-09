import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { ensureDonationsTable } from '@/lib/donationsDb';
import type { WallEntry } from '@/lib/donations';

export const dynamic = 'force-dynamic';

/** Public donation wall: paid donations, newest first, plus totals. */
export async function GET() {
    try {
        await ensureDonationsTable();
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, user_id, first_name, last_name, username, photo_url, is_anonymous, amount, network, paid_at
               FROM donations WHERE status = 'paid' ORDER BY paid_at DESC LIMIT 100`
        );
        const [totals] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM donations WHERE status = 'paid'`
        );

        const entries: WallEntry[] = rows.map((r) => {
            const anonymous = !!r.is_anonymous || !r.user_id;
            return {
                id: r.id,
                anonymous,
                name: anonymous ? null : [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
                username: anonymous ? null : r.username || null,
                photoUrl: anonymous ? null : r.photo_url || null,
                userId: anonymous ? null : String(r.user_id),
                amount: Number(r.amount),
                network: r.network,
                paidAt: new Date(r.paid_at).toISOString(),
            };
        });

        return NextResponse.json({
            success: true,
            total: Number(totals[0]?.total || 0),
            count: Number(totals[0]?.count || 0),
            entries,
        });
    } catch (error) {
        console.error('Error loading donation wall:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
