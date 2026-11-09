'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { siTelegram } from 'simple-icons';
import { useTranslation } from '@/lib/useTranslation';
import { BOT_USERNAME, MINI_APP_URL } from '@/lib/links';

const TELEGRAM_BLUE = '#2AABEE';
const SUPPORTED = ['bn', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'pt', 'ru', 'zh'];

function TelegramLogo({ size }: { size: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
            <path d={siTelegram.path} />
        </svg>
    );
}

/** Shown when the app is opened in a normal browser: it only works as a Telegram Mini App. */
export default function TelegramOnlyScreen() {
    const { t, setLanguage } = useTranslation();

    // No Telegram user here, so fall back to the browser's language when we have it.
    useEffect(() => {
        const code = navigator.language?.slice(0, 2).toLowerCase();
        if (code && code !== 'en' && SUPPORTED.includes(code)) setLanguage(code);
        // Once on mount: setLanguage isn't stable, and re-running would reload the language in a loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="min-h-app flex flex-col px-6 bg-[var(--grouped-bg)] text-[var(--foreground)]">
            <motion.div
                className="flex-1 flex flex-col items-center justify-center text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
            >
                <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ color: TELEGRAM_BLUE, boxShadow: `0 12px 40px ${TELEGRAM_BLUE}40` }}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
                >
                    <TelegramLogo size={96} />
                </motion.div>
                <h1 className="mt-7 text-[28px] leading-tight font-bold tracking-tight">{t.telegram_only_title}</h1>
                <p className="mt-2 text-[15px] leading-snug text-[var(--muted)] max-w-[300px]">{t.telegram_only_msg}</p>
            </motion.div>

            <motion.div
                className="w-full max-w-sm mx-auto pb-6 space-y-3"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
            >
                <a
                    href={MINI_APP_URL}
                    className="w-full h-[52px] rounded-[14px] text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] active:opacity-80 transition-all"
                    style={{ backgroundColor: TELEGRAM_BLUE }}
                >
                    <TelegramLogo size={20} />
                    {t.open_in_telegram}
                </a>
                <p className="text-center text-[13px] text-[var(--muted)]">@{BOT_USERNAME}</p>
            </motion.div>
        </main>
    );
}
