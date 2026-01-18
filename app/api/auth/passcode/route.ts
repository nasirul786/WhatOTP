import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
    const { action, initData, passcode } = await req.json();

    if (!verifyTelegramWebAppData(initData)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user')!);
    const authDate = urlParams.get('auth_date');

    try {
        if (action === 'set') {
            const hash = await bcrypt.hash(passcode, 10);
            await pool.query("UPDATE users SET passcode_hash = ? WHERE user_id = ?", [hash, user.id]);
            return NextResponse.json({ success: true });
        }

        if (action === 'remove') {
            await pool.query("UPDATE users SET passcode_hash = NULL WHERE user_id = ?", [user.id]);
            return NextResponse.json({ success: true });
        }

        if (action === 'verify') {
            const [rows] = await pool.query<RowDataPacket[]>("SELECT passcode_hash FROM users WHERE user_id = ?", [user.id]);

            if (!rows.length || !rows[0].passcode_hash) {
                return NextResponse.json({ verified: false, error: "not_set" });
            }

            const isValid = await bcrypt.compare(passcode, rows[0].passcode_hash);

            if (isValid) {
                // Update last verified
                await pool.query("UPDATE users SET last_verified_at = NOW(), last_auth_date = ? WHERE user_id = ?", [authDate, user.id]);
                return NextResponse.json({ verified: true });
            } else {
                return NextResponse.json({ verified: false });
            }
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
