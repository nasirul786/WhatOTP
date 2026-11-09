import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/** Link that opens the WhatOTP mini app inside Telegram. */
export const BOT_APP_URL = process.env.BOT_APP_URL || 'https://t.me/what_otp_bot?startapp';

/** Shared email shell so every message looks the same. */
function layout(title: string, body: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { margin: 0; background: #f2f2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.55; color: #1c1c1e; }
            .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
            .card { background: #ffffff; border-radius: 16px; padding: 28px 24px; }
            h2 { margin: 0 0 16px; font-size: 22px; }
            .otp-box { background: #f2f2f7; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #007aff; }
            .notice { background: #fff1f0; border-radius: 12px; padding: 16px; margin: 20px 0; color: #c0261d; }
            .button { display: inline-block; background: #007aff; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 22px; border-radius: 12px; }
            .footer { text-align: center; font-size: 12px; color: #8e8e93; margin-top: 24px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <h2>${title}</h2>
                ${body}
            </div>
            <div class="footer"><p>WhatOTP App Security</p></div>
        </div>
    </body>
    </html>
    `;
}

export async function sendOtpEmail(to: string, otp: string) {
    const html = layout('Email Verification', `
        <p>Hello,</p>
        <p>Use the following One-Time Password (OTP) to verify your email address. This code will expire in 10 minutes.</p>
        <div class="otp-box"><div class="otp-code">${otp}</div></div>
        <p>If you didn't request this, please ignore this email.</p>
    `);

    await transporter.sendMail({
        from: `"WhatOTP Verification" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Your Verification Code',
        html,
    });
}

/** Warns the user that their account is scheduled for deletion and how to cancel it. */
export async function sendDeletionNoticeEmail(to: string, deleteAt: Date) {
    const when = deleteAt.toUTCString();
    const html = layout('Your WhatOTP account will be deleted', `
        <p>Hello,</p>
        <p>We received a request to delete your WhatOTP account. Your account, including all saved authenticator entries, will be <strong>permanently deleted in 24 hours</strong>.</p>
        <div class="notice">Scheduled deletion: <strong>${when}</strong></div>
        <p><strong>If this wasn't you</strong>, open the WhatOTP bot in Telegram and tap <strong>Cancel Deletion</strong> before that time.</p>
        <p style="text-align:center;margin:24px 0;"><a class="button" href="${BOT_APP_URL}">Open WhatOTP</a></p>
        <p>If you requested this, no action is needed.</p>
    `);

    await transporter.sendMail({
        from: `"WhatOTP Security" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Your WhatOTP account will be deleted in 24 hours',
        html,
    });
}
