
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import crypto from 'crypto';
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { initData, email } = body;

        if (!initData || !email) {
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

        // Check 1: Already bound to current user
        const [currentUserRows] = await pool.query<RowDataPacket[]>(
            "SELECT email, email_verified FROM users WHERE user_id = ?",
            [user.id]
        );

        if (currentUserRows.length > 0) {
            const currentUser = currentUserRows[0];
            if (currentUser.email === email && currentUser.email_verified) {
                return NextResponse.json({ error: "EMAIL_ALREADY_BOUND" }, { status: 400 });
            }
        }

        // Check 2: Used by another user
        const [otherUserRows] = await pool.query<RowDataPacket[]>(
            "SELECT user_id FROM users WHERE email = ? AND email_verified = 1 AND user_id != ?",
            [email, user.id]
        );

        if (otherUserRows.length > 0) {
            return NextResponse.json({ error: "EMAIL_ALREADY_USED" }, { status: 400 });
        }

        // Generate 6 digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Check if user exists (should exist if logged in)
        // Store email, OTP, expiry, and set verified to false
        await pool.query(
            "UPDATE users SET email = ?, email_otp = ?, email_otp_expires_at = ?, email_verified = FALSE WHERE user_id = ?",
            [email, otp, expiresAt, user.id]
        );

        // Send Email (Fire and forget, or await?) 
        // Await to ensure we report error if SMTP fails
        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
            return NextResponse.json({ error: "Failed to send email. Please check the address." }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Request OTP Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
