
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { initData } = body;

        if (!initData) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (!verifyTelegramWebAppData(initData)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const urlParams = new URLSearchParams(initData);
        const userSt = urlParams.get('user');
        const user = JSON.parse(userSt!);

        // Restore security - simply remove the lock
        // Authentications were never removed DB side, only conditional check in auth endpoint hid them
        // Actually, logic in auth endpoint only removes them IF expired.
        // So restoring just means clearing `locked_until` so that expiry check never fires "delete".

        try {
            await pool.query(
                "UPDATE users SET locked_until = NULL, lock_reason = NULL WHERE user_id = ?",
                [user.id]
            );
        } catch (e: any) {
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                // Column missing, so just update locked_until is fine if we ignore reason
                await pool.query(
                    "UPDATE users SET locked_until = NULL WHERE user_id = ?",
                    [user.id]
                );
            } else {
                throw e;
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Restore Security Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
