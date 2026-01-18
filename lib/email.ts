
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

export async function sendOtpEmail(to: string, otp: string) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .otp-box { background-color: #fff; padding: 20px; text-align: center; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff; }
            .footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Email Verification</h2>
            </div>
            <p>Hello,</p>
            <p>Use the following One-Time Password (OTP) to verify your email address. This code will expire in 10 minutes.</p>
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
            </div>
            <p>If you didn't request this, please ignore this email.</p>
            <div class="footer">
                <p>WhatOTP App Security</p>
            </div>
        </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: `"WhatOTP Verification" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Your Verification Code',
        html,
    });
}
