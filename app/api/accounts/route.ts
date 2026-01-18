import { NextRequest, NextResponse } from "next/server";
import { validateAndGetUser } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
    const initData = req.headers.get("Authorization")?.split(" ")[1];
    if (!initData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = validateAndGetUser(initData);
    if (!user) return NextResponse.json({ error: "Invalid InitData" }, { status: 401 });

    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC",
            [user.id]
        );
        return NextResponse.json({ accounts: rows });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const initData = req.headers.get("Authorization")?.split(" ")[1];
    if (!initData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = validateAndGetUser(initData);
    if (!user) return NextResponse.json({ error: "Invalid InitData" }, { status: 401 });

    const body = await req.json();
    const { service_name, secret, issuer, algorithm, digits, period, slug, hex } = body;

    if (!secret || !service_name) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    try {
        await pool.query(
            "INSERT INTO accounts (user_id, service_name, secret, issuer, algorithm, digits, period, slug, hex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user.id, service_name, secret, issuer || '', algorithm || 'sha1', digits || 6, period || 30, slug || null, hex || null]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const initData = req.headers.get("Authorization")?.split(" ")[1];
    if (!initData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = validateAndGetUser(initData);
    if (!user) return NextResponse.json({ error: "Invalid InitData" }, { status: 401 });

    const body = await req.json();
    const { id, service_name, secret, issuer, slug, hex } = body;

    if (!id || !secret || !service_name) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    try {
        await pool.query(
            "UPDATE accounts SET service_name = ?, secret = ?, issuer = ?, slug = ?, hex = ? WHERE id = ? AND user_id = ?",
            [service_name, secret, issuer || '', slug || null, hex || null, id, user.id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const initData = req.headers.get("Authorization")?.split(" ")[1];
    if (!initData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = validateAndGetUser(initData);
    if (!user) return NextResponse.json({ error: "Invalid InitData" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    try {
        await pool.query("DELETE FROM accounts WHERE id = ? AND user_id = ?", [id, user.id]);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
