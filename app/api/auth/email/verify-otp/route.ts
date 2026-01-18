
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
        if (!userSt) {
            return NextResponse.json({ error: "User not found in initData" }, { status: 400 });
        }
        const user = JSON.parse(userSt);

        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT email_otp, email_otp_expires_at FROM users WHERE user_id = ?",
            [user.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = rows[0];

        if (!userData.email_otp) {
            return NextResponse.json({ error: "No pending OTP" }, { status: 400 });
        }

        const expiresAt = new Date(userData.email_otp_expires_at);
        if (new Date() > expiresAt) {
            return NextResponse.json({ error: "OTP expired" }, { status: 400 });
        }

        if (String(userData.email_otp) !== String(otp)) {
            return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
        }

        // Verify Success
        await pool.query(
            "UPDATE users SET email_otp = NULL, email_otp_expires_at = NULL, email_verified = TRUE WHERE user_id = ?",
            [user.id]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
