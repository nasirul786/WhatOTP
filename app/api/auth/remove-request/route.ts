
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import crypto from 'crypto';
import { RowDataPacket } from "mysql2";

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
        if (!userSt) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }
        const user = JSON.parse(userSt);

        // Check if user has verified email
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT email, email_verified FROM users WHERE user_id = ?",
            [user.id]
        );

        if (rows.length === 0 || !rows[0].email || !rows[0].email_verified) {
            return NextResponse.json({ error: "No verified email found" }, { status: 400 });
        }

        const email = rows[0].email;

        // Generate 6 digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP - Reusing email_otp column
        await pool.query(
            "UPDATE users SET email_otp = ?, email_otp_expires_at = ? WHERE user_id = ?",
            [otp, expiresAt, user.id]
        );

        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ success: true, email });

    } catch (error) {
        console.error("Remove Auth Request Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
