import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { RowDataPacket } from "mysql2";

const rpID = 'localhost'; // Change in prod

export async function POST(req: NextRequest) {
    const { action, initData, authResponse } = await req.json();

    if (!verifyTelegramWebAppData(initData)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user')!);

    try {
        if (action === 'generate-options') {
            const [passkeys] = await pool.query<RowDataPacket[]>("SELECT * FROM passkeys WHERE user_id = ?", [user.id]);

            if (passkeys.length === 0) {
                return NextResponse.json({ error: "No passkeys registered" }, { status: 400 });
            }

            const options = await generateAuthenticationOptions({
                rpID: process.env.RP_ID || rpID,
                allowCredentials: passkeys.map(pk => ({
                    id: pk.id,
                    transports: pk.transports ? JSON.parse(pk.transports) : undefined,
                })),
            });

            await pool.query("UPDATE users SET current_challenge = ? WHERE user_id = ?", [options.challenge, user.id]);

            return NextResponse.json(options);
        }

        if (action === 'verify') {
            const [userRows] = await pool.query<RowDataPacket[]>("SELECT current_challenge FROM users WHERE user_id = ?", [user.id]);
            const currentChallenge = userRows[0]?.current_challenge;

            if (!currentChallenge) {
                return NextResponse.json({ error: "No challenge found" }, { status: 400 });
            }

            // Find the passkey credential from DB
            const [passkeyRows] = await pool.query<RowDataPacket[]>("SELECT * FROM passkeys WHERE id = ?", [authResponse.id]);
            const passkey = passkeyRows[0];

            if (!passkey) {
                return NextResponse.json({ error: "Authenticator not found" }, { status: 400 });
            }

            const verification = await verifyAuthenticationResponse({
                response: authResponse,
                expectedChallenge: currentChallenge,
                expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
                expectedRPID: process.env.RP_ID || rpID,
                credential: {
                    id: passkey.id,
                    publicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64')),
                    counter: passkey.counter,
                },
            });

            if (verification.verified) {
                const { authenticationInfo } = verification;

                // Update counter and last_verified_at
                await pool.query(
                    "UPDATE passkeys SET counter = ? WHERE id = ?",
                    [authenticationInfo.newCounter, passkey.id]
                );

                await pool.query(
                    "UPDATE users SET last_verified_at = NOW(), current_challenge = NULL WHERE user_id = ?",
                    [user.id]
                );

                return NextResponse.json({ verified: true });
            }
            return NextResponse.json({ verified: false });
        }
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
