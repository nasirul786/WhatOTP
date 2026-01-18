import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
    const { action, initData, token, deviceId } = await req.json();

    if (!verifyTelegramWebAppData(initData)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user')!);
    const authDate = urlParams.get('auth_date');

    try {
        if (action === 'enable') {
            await pool.query(
                `INSERT INTO telegram_biometrics (user_id, device_id, token, enabled) 
                 VALUES (?, ?, ?, TRUE) 
                 ON DUPLICATE KEY UPDATE device_id=?, token=?, enabled=TRUE`,
                [user.id, deviceId, token, deviceId, token]
            );
            return NextResponse.json({ success: true });
        }

        if (action === 'disable') {
            await pool.query(
                "UPDATE telegram_biometrics SET enabled=FALSE, token=NULL WHERE user_id = ?",
                [user.id]
            );
            return NextResponse.json({ success: true });
        }

        if (action === 'verify_token') {
            // For Telegram biometrics, the token is stored on device.
            // When verifying, the app sends the token obtained from authenticate().
            // We check if it matches what we stored.
            // Though arguably, if Telegram says "authenticated" successfully, that might be enough trust for a mini-app?
            // But verifying the token against backend ensures the request comes from the authorized device state.

            const [rows] = await pool.query<RowDataPacket[]>("SELECT token, enabled FROM telegram_biometrics WHERE user_id = ?", [user.id]);

            if (!rows.length || !rows[0].enabled) {
                return NextResponse.json({ verified: false, error: "not_enabled" });
            }

            if (rows[0].token !== token) {
                // In some flows, token might rotate? Telegram docs say updateBiometricToken updates it.
                // If the client sends a token that matches DB, we are good.
                return NextResponse.json({ verified: false, error: "token_mismatch" });
            }

            // Update last verified and auth_date
            await pool.query("UPDATE users SET last_verified_at = NOW(), last_auth_date = ? WHERE user_id = ?", [authDate, user.id]);

            return NextResponse.json({ verified: true });
        }

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
