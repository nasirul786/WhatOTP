'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { syncTelegramColors } from '@/lib/telegram';
import BlurBackdrop from '@/components/BlurBackdrop';
import { installGlobalHaptics } from '@/lib/haptics';

const TelegramContext = createContext<any>(null);

export const useTelegram = () => useContext(TelegramContext);

/** Telegram clients that run on a phone; everything else (desktop, web) stays windowed. */
const MOBILE_PLATFORMS = ['android', 'android_x', 'ios'];

/** Points at the mounted provider's setter, so patched popup methods survive remounts (HMR). */
let setPopupOpen: (open: boolean) => void = () => { };

/**
 * Wraps Telegram's native popup methods so the app can blur its background while one is showing.
 * Each is (params, callback); the callback fires when the popup closes.
 */
function trackNativePopups(app: any) {
    if (app.__popupTracking) return;
    app.__popupTracking = true;

    for (const name of ['showPopup', 'showAlert', 'showConfirm']) {
        const original = app[name]?.bind(app);
        if (!original) continue;
        app[name] = (params: unknown, callback?: (...args: unknown[]) => void) => {
            setPopupOpen(true);
            try {
                return original(params, (...args: unknown[]) => {
                    setPopupOpen(false); // before the callback, which may open the next popup
                    callback?.(...args);
                });
            } catch (e) {
                setPopupOpen(false);
                throw e;
            }
        };
    }

    // The QR scanner stays open across scans and reports its own close event.
    const originalScan = app.showScanQrPopup?.bind(app);
    if (originalScan) {
        app.showScanQrPopup = (params: unknown, callback?: (text: string) => unknown) => {
            setPopupOpen(true);
            try {
                return originalScan(params, (text: string) => {
                    const result = callback?.(text);
                    if (result === true) setPopupOpen(false); // returning true closes the scanner
                    return result;
                });
            } catch (e) {
                setPopupOpen(false);
                throw e;
            }
        };
    }
    // scanQrPopupClosed only fires when the *user* closes it, so also catch programmatic closes.
    const originalCloseScan = app.closeScanQrPopup?.bind(app);
    if (originalCloseScan) {
        app.closeScanQrPopup = () => {
            setPopupOpen(false);
            return originalCloseScan();
        };
    }
    app.onEvent?.('scanQrPopupClosed', () => setPopupOpen(false));
    app.onEvent?.('popupClosed', () => setPopupOpen(false));
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [webApp, setWebApp] = useState<any>(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const { resolvedTheme } = useTheme();

    // Haptic tap on every button/link across the app (respects the user's haptics setting).
    useEffect(() => installGlobalHaptics(), []);

    useEffect(() => {
        setPopupOpen = setIsPopupOpen;
        return () => {
            setPopupOpen = () => { };
        };
    }, []);

    useEffect(() => {
        const initWebApp = () => {
            const app = (window as any).Telegram?.WebApp;
            if (!app) return false;

            app.ready();
            app.expand();
            trackNativePopups(app);

            // Fullscreen on phones only (Bot API 8.0+).
            if (MOBILE_PLATFORMS.includes(app.platform) && app.isVersionAtLeast?.('8.0') && !app.isFullscreen) {
                try {
                    app.requestFullscreen();
                } catch (e) {
                    console.error('requestFullscreen failed:', e);
                }
            }

            setWebApp(app);
            return true;
        };

        if (initWebApp()) return;
        const interval = setInterval(() => {
            if (initWebApp()) clearInterval(interval);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Match Telegram's header/background to the app theme so the status bar picks a contrasting colour.
    useEffect(() => {
        if (!webApp) return;
        const frame = requestAnimationFrame(() => syncTelegramColors(webApp));
        return () => cancelAnimationFrame(frame);
    }, [webApp, resolvedTheme]);

    return (
        <TelegramContext.Provider value={webApp}>
            <Script
                src="https://telegram.org/js/telegram-web-app.js"
                strategy="beforeInteractive"
            />
            {children}
            {/* Above everything in the app; Telegram draws its native popup on top of the webview. */}
            <BlurBackdrop show={isPopupOpen} zIndex={100} />
        </TelegramContext.Provider>
    );
}
