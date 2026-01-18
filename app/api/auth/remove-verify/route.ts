
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { initData, otp } = body;

        if (!initData || !otp) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (!verifyTelegramWebAppData(initData)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const urlParams = new URLSearchParams(initData);
        const userSt = urlParams.get('user');
        const user = JSON.parse(userSt!);

        // Verify OTP
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT email_otp, email_otp_expires_at FROM users WHERE user_id = ?",
            [user.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const dbOtp = rows[0].email_otp;
        const expiresAt = new Date(rows[0].email_otp_expires_at);

        if (otp !== dbOtp) {
            return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
        }

        if (expiresAt < new Date()) {
            return NextResponse.json({ error: "OTP Expired" }, { status: 400 });
        }

        // Set Lock (24 hours)
        const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        try {
            await pool.query(
                "UPDATE users SET email_otp = NULL, email_otp_expires_at = NULL, locked_until = ?, lock_reason = 'remove_auth' WHERE user_id = ?",
                [lockedUntil, user.id]
            );
        } catch (e: any) {
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query(`ALTER TABLE users ADD COLUMN lock_reason VARCHAR(50) DEFAULT NULL`);
                await pool.query(
                    "UPDATE users SET email_otp = NULL, email_otp_expires_at = NULL, locked_until = ?, lock_reason = 'remove_auth' WHERE user_id = ?",
                    [lockedUntil, user.id]
                );
            } else {
                throw e;
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Remove Auth Verify Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
