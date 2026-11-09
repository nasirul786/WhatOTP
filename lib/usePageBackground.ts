'use client';
import { useEffect } from 'react';
import { syncTelegramColors } from '@/lib/telegram';

/**
 * Screens that asked for a backdrop, newest last. A stack (not a single value) because during
 * a screen transition both screens are mounted, and the leaving one unmounts *after* the new
 * one has set its background — it must not wipe the new screen's value.
 */
const stack: { id: symbol; value: string }[] = [];

function apply(webApp: any) {
    const root = document.documentElement;
    const top = stack[stack.length - 1];
    if (top) root.style.setProperty('--page-bg', top.value);
    else root.style.removeProperty('--page-bg');
    syncTelegramColors(webApp);
}

/**
 * Sets this screen's backdrop (the --page-bg variable on <html>) while it's mounted,
 * and keeps Telegram's header/status bar colour in sync with it.
 */
export function usePageBackground(webApp: any, value: string) {
    useEffect(() => {
        const entry = { id: Symbol('page-bg'), value };
        stack.push(entry);
        apply(webApp);
        return () => {
            const i = stack.findIndex(e => e.id === entry.id);
            if (i !== -1) stack.splice(i, 1);
            apply(webApp);
        };
    }, [webApp, value]);
}
