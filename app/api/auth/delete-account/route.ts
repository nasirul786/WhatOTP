import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { sendDeletionNoticeEmail } from "@/lib/email";
import { sendBotMessage } from "@/lib/bot";

const SCHEDULE_SQL = `UPDATE users SET
    locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR),
    lock_reason = 'delete_account'
 WHERE user_id = ?`;

export async function POST(req: NextRequest) {
    try {
        const { initData } = await req.json();

        if (!initData || !verifyTelegramWebAppData(initData)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userSt = new URLSearchParams(initData).get('user');
        if (!userSt) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
        const user = JSON.parse(userSt);

        try {
            await pool.query(SCHEDULE_SQL, [user.id]);
        } catch (e: any) {
            // Older databases may not have lock_reason yet.
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
            await pool.query(`ALTER TABLE users ADD COLUMN lock_reason VARCHAR(50) DEFAULT NULL`);
            await pool.query(SCHEDULE_SQL, [user.id]);
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT locked_until, email, email_verified FROM users WHERE user_id = ?",
            [user.id]
        );
        const row = rows[0];
        const deleteAt = new Date(row?.locked_until ?? Date.now() + 24 * 60 * 60 * 1000);

        // Notify the owner so an unauthorised request can be cancelled. Failures don't block the request.
        const notifications: Promise<unknown>[] = [
            sendBotMessage(
                user.id,
                `⚠️ <b>Your WhatOTP account will be deleted in 24 hours.</b>\n\n` +
                `Scheduled for: ${deleteAt.toUTCString()}\n\n` +
                `If this wasn't you, open WhatOTP and tap <b>Cancel Deletion</b>.`
            ),
        ];
        if (row?.email && row.email_verified) {
            notifications.push(sendDeletionNoticeEmail(row.email, deleteAt));
        }
        const results = await Promise.allSettled(notifications);
        results.forEach(r => {
            if (r.status === 'rejected') console.error("Deletion notice failed:", r.reason);
        });

        return NextResponse.json({ success: true, lockedUntil: deleteAt.toISOString() });
    } catch (error) {
        console.error("Delete Account Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
