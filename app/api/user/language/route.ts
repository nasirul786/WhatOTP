import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { initData, language_code } = await req.json();

        if (!verifyTelegramWebAppData(initData)) {
            return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
        }

        const urlParams = new URLSearchParams(initData);
        const userStr = urlParams.get('user');
        if (!userStr) return NextResponse.json({ error: "No user" }, { status: 400 });
        const user = JSON.parse(userStr);

        await pool.query(
            "UPDATE users SET language = ? WHERE user_id = ?",
            [language_code, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
