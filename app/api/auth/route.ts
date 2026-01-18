import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
    try {
        const { initData } = await req.json();

        if (!initData) {
            return NextResponse.json({ error: "Missing initData" }, { status: 400 });
        }

        if (!process.env.BOT_TOKEN) {
            console.error("BOT_TOKEN is not set in environment variables");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        if (!verifyTelegramWebAppData(initData)) {
            console.warn("Invalid initData received");
            return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
        }

        // Parse user data
        const urlParams = new URLSearchParams(initData);
        const userSt = urlParams.get('user');
        if (!userSt) {
            return NextResponse.json({ error: "Missing user data" }, { status: 400 });
        }
        const user = JSON.parse(userSt);
        const authDate = urlParams.get('auth_date');

        // Save/Update user in DB
        const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE user_id = ?", [user.id]);

        let finalUser = { ...user };
        let isNewUser = rows.length === 0;

        if (isNewUser) {

            await pool.query(
                "INSERT INTO users (user_id, first_name, last_name, username, language) VALUES (?, ?, ?, ?, ?)",
                [user.id, user.first_name, user.last_name, user.username, 'en']
            );
            finalUser.language_code = 'en';
        } else {
            // Update profile info, but preserve DB language preference
            await pool.query(
                "UPDATE users SET first_name=?, last_name=?, username=? WHERE user_id=?",
                [user.first_name, user.last_name, user.username, user.id]
            );
            // Override with DB language
            if (rows[0].language) {
                finalUser.language_code = rows[0].language;
            }
            if (rows[0].theme) {
                (finalUser as any).theme = rows[0].theme;
            }
        }

        // Check Lock Status
        let lockedUntil = null;
        let lockReason = null;
        if (!isNewUser && rows[0]?.locked_until) {
            lockReason = rows[0].lock_reason;
            const lockTime = new Date(rows[0].locked_until);
            if (lockTime > new Date()) {
                lockedUntil = rows[0].locked_until;
            } else {
                // Lock expired
                if (lockReason === 'delete_account') {
                    // Permanently delete user
                    await pool.query("DELETE FROM users WHERE user_id = ?", [user.id]);
                    // Cascade should handle accounts, but let's be safe if cascade missing
                    await pool.query("DELETE FROM accounts WHERE user_id = ?", [user.id]);
                    await pool.query("DELETE FROM telegram_biometrics WHERE user_id = ?", [user.id]);

                    // Reset to new user state
                    isNewUser = true;
                    finalUser = { ...user, language_code: 'en' };
                    // Re-insert as new user creates a fresh row effectively? 
                    // Actually, if we delete, isNewUser becomes true in next load. 
                    // But here we just deleted it. So we should treat this request as "New User Login" flow essentially.

                    await pool.query(
                        "INSERT INTO users (user_id, first_name, last_name, username, language) VALUES (?, ?, ?, ?, ?)",
                        [user.id, user.first_name, user.last_name, user.username, 'en']
                    );

                    // Reset variables
                    lockedUntil = null;
                    lockReason = null;
                } else {
                    // Remove Auth (Default)
                    await pool.query(
                        "UPDATE users SET locked_until = NULL, passcode_hash = NULL, passcode_salt = NULL, lock_reason = NULL WHERE user_id = ?",
                        [user.id]
                    );
                    await pool.query("DELETE FROM telegram_biometrics WHERE user_id = ?", [user.id]);

                    // Refresh rows to reflect changes for hasPasscode check
                    const [refreshedRows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE user_id = ?", [user.id]);
                    rows[0] = refreshedRows[0];
                }
            }
        }

        // Check Passkey status (Telegram Biometrics)
        const [biometrics] = await pool.query<RowDataPacket[]>("SELECT count(*) as count FROM telegram_biometrics WHERE user_id = ? AND enabled = 1", [user.id]);
        const hasPasskey = (biometrics[0] as any).count > 0;

        // Check Passcode status
        const hasPasscode = !!(rows[0] && rows[0].passcode_hash);

        // Check Email status
        const hasEmail = !!(rows[0] && rows[0].email && rows[0].email_verified);

        let isSessionVerified = true;
        if (hasPasskey || hasPasscode) {
            const [uRows] = await pool.query<RowDataPacket[]>("SELECT last_verified_at, last_auth_date FROM users WHERE user_id = ?", [user.id]);
            const lastVerified = uRows[0]?.last_verified_at;
            const lastAuthDate = uRows[0]?.last_auth_date;

            if (!lastVerified) {
                isSessionVerified = false;
            } else {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                const isTimeValid = new Date(lastVerified) > oneHourAgo;
                // authDate is a string in unix timestamp (seconds), but last_auth_date is BIGINT (seconds)
                // We should compare them loosely or as strings
                const isAuthDateValid = lastAuthDate && String(lastAuthDate) === String(authDate);

                isSessionVerified = isTimeValid && isAuthDateValid;
            }
        }

        return NextResponse.json({ success: true, user: finalUser, isNewUser, hasPasskey, hasPasscode, hasEmail, isSessionVerified, lockedUntil, lockReason });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
