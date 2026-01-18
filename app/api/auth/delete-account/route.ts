
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { initData } = await req.json();

        if (!initData || !verifyTelegramWebAppData(initData)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const urlParams = new URLSearchParams(initData);
        const userSt = urlParams.get('user');
        if (!userSt) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
        const user = JSON.parse(userSt);

        // Try to update locked_until and lock_reason
        // We use INTERVAL 24 HOUR for 24h lock
        try {
            await pool.query(
                `UPDATE users SET
                    locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR),
                    lock_reason = 'delete_account'
                 WHERE user_id = ?`,
                [user.id]
            );
        } catch (e: any) {
            // If lock_reason column doesn't exist, try adding it and retrying
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query(`ALTER TABLE users ADD COLUMN lock_reason VARCHAR(50) DEFAULT NULL`);
                // Retry
                await pool.query(
                    `UPDATE users SET
                        locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR),
                        lock_reason = 'delete_account'
                     WHERE user_id = ?`,
                    [user.id]
                );
            } else {
                throw e;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Account Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
