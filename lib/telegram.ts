/** Shows a Telegram cancel/confirm popup and runs onConfirm only on confirm. */
export function confirmPopup(
    webApp: any,
    opts: { title: string; message: string; cancelText: string; confirmText: string; destructive?: boolean },
    onConfirm: () => void | Promise<void>
) {
    webApp?.showPopup(
        {
            title: opts.title,
            message: opts.message,
            buttons: [
                { id: 'cancel', type: 'default', text: opts.cancelText },
                { id: 'confirm', type: opts.destructive === false ? 'default' : 'destructive', text: opts.confirmText },
            ],
        },
        (id: string) => {
            if (id === 'confirm') onConfirm();
        }
    );
}

/**
 * Sets Telegram's header/background/bottom-bar colours to the current screen's background
 * (the --page-bg CSS variable), so the status bar picks a contrasting colour.
 */
export function syncTelegramColors(webApp: any) {
    if (!webApp || typeof document === 'undefined') return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
    if (!/^#[0-9a-f]{6}$/i.test(bg)) return;
    try {
        webApp.setHeaderColor?.(bg);
        webApp.setBackgroundColor?.(bg);
        webApp.setBottomBarColor?.(bg);
    } catch (e) {
        console.error('Setting Telegram colours failed:', e);
    }
}

export function openExternal(webApp: any, url: string) {
    if (webApp?.openLink) webApp.openLink(url, { try_instant_view: true });
    else window.open(url, '_blank');
}
