'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext<any>(null);

export const useTelegram = () => useContext(TelegramContext);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [webApp, setWebApp] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initWebApp = () => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                const app = (window as any).Telegram.WebApp;
                app.ready();
                setWebApp(app);
                setIsReady(true);
                // Expand to full height
                app.expand();
            }
        };

        // Check if script is already loaded
        if ((window as any).Telegram?.WebApp) {
            initWebApp();
        } else {
            const interval = setInterval(() => {
                if ((window as any).Telegram?.WebApp) {
                    initWebApp();
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }

    }, []);

    return (
        <TelegramContext.Provider value={webApp}>
            <Script
                src="https://telegram.org/js/telegram-web-app.js"
                strategy="beforeInteractive"
            />
            {children}
        </TelegramContext.Provider>
    );
}
