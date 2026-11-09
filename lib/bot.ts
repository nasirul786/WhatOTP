import { BOT_APP_URL } from '@/lib/email';

/** Sends a plain Telegram message from the bot, with an "Open WhatOTP" button. */
export async function sendBotMessage(chatId: number, text: string, buttonText = 'Open WhatOTP') {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error('BOT_TOKEN is not set');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: buttonText, url: BOT_APP_URL }]] },
        }),
    });
    if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
}
