export const GITHUB_URL = 'https://github.com/nasirul786/WhatOTP';

/**
 * Opens the "Language request" issue form (.github/ISSUE_TEMPLATE/language_request.yml),
 * prefilling the language name when we have one (issue forms accept field ids as query params).
 */
export function languageRequestUrl(languageName?: string) {
    const params = new URLSearchParams({ template: 'language_request.yml' });
    const name = languageName?.trim();
    if (name) {
        params.set('title', `[Language] ${name}`);
        params.set('language_name', name);
    }
    return `${GITHUB_URL}/issues/new?${params}`;
}

export const BOT_USERNAME = 'what_otp_bot';
/** Opens the bot's Mini App inside Telegram. */
export const MINI_APP_URL = `https://t.me/${BOT_USERNAME}?startapp`;
