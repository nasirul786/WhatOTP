import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.BOT_TOKEN;

async function sendWelcomePhoto(chatId: number) {
    if (!BOT_TOKEN) {
        console.error("BOT_TOKEN is not defined in environment variables.");
        return;
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'welcome.png');

        // Ensure file exists
        if (!fs.existsSync(filePath)) {
            console.error("Welcome image not found at:", filePath);
            // Fallback to text message if image missing
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: "Welcome to WhatOTP! 🛡️\n\nImage missing server-side, but hey, we are secure!\n\nTap below to start.",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "Open WhatOTP", url: "https://t.me/what_otp_bot?startapp" }
                        ]]
                    }
                })
            });
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'image/png' });

        const formData = new FormData();
        formData.append('chat_id', chatId.toString());
        formData.append('photo', blob, 'welcome.png');
        formData.append('caption', "Welcome to WhatOTP! 🛡️\n\nThe most secure and premium Two-Factor Authentication experience on Telegram.\n\n🔒 Encrypted Storage\n✨ Premium Design\n🚀 Fast & Reliable\n\nClick below to launch the app.");

        const replyMarkup = JSON.stringify({
            inline_keyboard: [[
                { text: "🚀 Open App", url: "https://t.me/what_otp_bot?startapp" }
            ]]
        });
        formData.append('reply_markup', replyMarkup);

        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Failed to send photo to Telegram:", err);
        }

    } catch (e) {
        console.error("Error sending welcome message:", e);
    }
}

export async function POST(req: Request) {
    try {
        const update = await req.json();

        if (update.message && update.message.text === '/start') {
            const chatId = update.message.chat.id;
            await sendWelcomePhoto(chatId);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error in bot webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
