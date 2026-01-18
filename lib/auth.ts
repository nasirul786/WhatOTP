import crypto from 'crypto';

export function verifyTelegramWebAppData(telegramInitData: string): boolean {
    if (!process.env.BOT_TOKEN) {
        console.error("BOT_TOKEN is not set");
        return false;
    }

    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    urlParams.delete('hash');

    const params: string[] = [];
    for (const [key, value] of urlParams.entries()) {
        params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join('\n');

    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(process.env.BOT_TOKEN)
        .digest();

    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return calculatedHash === hash;
}

export function validateAndGetUser(initData: string) {
    if (!verifyTelegramWebAppData(initData)) return null;
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
}
