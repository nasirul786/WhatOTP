import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppData } from "@/lib/auth";
import pool from "@/lib/db";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { RowDataPacket } from "mysql2";

const rpName = 'TG 2FA App';
const rpID = 'localhost'; // Change this in production!

export async function POST(req: NextRequest) {
    const { action, initData, attestationResponse } = await req.json();

    if (!verifyTelegramWebAppData(initData)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user')!);

    try {
        if (action === 'generate-options') {
            const [passkeys] = await pool.query<RowDataPacket[]>("SELECT * FROM passkeys WHERE user_id = ?", [user.id]);

            const options = await generateRegistrationOptions({
                rpName,
                rpID: process.env.RP_ID || rpID,
                userID: new Uint8Array(Buffer.from(String(user.id))),
                userName: user.username || `User ${user.id}`,
                attestationType: 'none',
                excludeCredentials: passkeys.map(pk => ({
                    id: pk.id,
                    transports: pk.transports ? JSON.parse(pk.transports) : undefined,
                })),
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred',
                    authenticatorAttachment: 'platform',
                },
            });

            // Save challenge to DB (temporarily use users table or a separate challenges table? or just in-memory if serverless? 
            // Since this is Next.js API routes which might be serverless, in-memory Map won't work well across instances.
            // For simplicity in this environment, I'll store it in the 'users' table or return it signed. 
            // Better: Store in DB users table `current_challenge` column.

            await pool.query("UPDATE users SET current_challenge = ? WHERE user_id = ?", [options.challenge, user.id]);

            return NextResponse.json(options);
        }

        if (action === 'verify') {
            const [rows] = await pool.query<RowDataPacket[]>("SELECT current_challenge FROM users WHERE user_id = ?", [user.id]);
            const currentChallenge = rows[0]?.current_challenge;

            if (!currentChallenge) {
                return NextResponse.json({ error: "No challenge found" }, { status: 400 });
            }

            const verification = await verifyRegistrationResponse({
                response: attestationResponse,
                expectedChallenge: currentChallenge,
                expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
                expectedRPID: process.env.RP_ID || rpID,
            });

            if (verification.verified && verification.registrationInfo) {
                const { credential, credentialType, attestationObject } = verification.registrationInfo;
                // For v10+ it seems they moved things or I might be mixing versions.
                // Based on lint error: registrationInfo has 'credential'.

                // Let's inspect the types carefully based on the error.
                // Error says registrationInfo contains: { fmt, aaguid, credential, credentialType, attestationObject... }
                // So we access specific fields from 'credential'.

                await pool.query(
                    "INSERT INTO passkeys (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)",
                    [
                        credential.id,
                        user.id,
                        Buffer.from(credential.publicKey).toString('base64'),
                        credential.counter,
                        JSON.stringify(attestationResponse.response.transports || [])
                    ]
                );

                // Clear challenge
                await pool.query("UPDATE users SET current_challenge = NULL WHERE user_id = ?", [user.id]);

                return NextResponse.json({ verified: true });
            }
            return NextResponse.json({ verified: false, error: "Verification failed" });
        }
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
