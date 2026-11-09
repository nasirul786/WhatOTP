/**
 * Haptic feedback through Telegram's WebApp.HapticFeedback API, respecting the user's
 * on/off preference (stored in localStorage). Safe to call anywhere: it does nothing
 * outside Telegram, on clients without haptics, or when the user turned it off.
 */

const STORAGE_KEY = 'whatotp:haptics';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'success' | 'warning' | 'error';

export function isHapticsEnabled(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true; // storage unavailable: default to on
    }
}

export function setHapticsEnabled(enabled: boolean) {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // storage unavailable (private mode etc.); preference just won't persist
    }
}

function run(fn: (hf: any) => void) {
    if (typeof window === 'undefined' || !isHapticsEnabled()) return;
    const hf = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!hf) return;
    try {
        fn(hf);
    } catch {
        // older clients may not support a given style
    }
}

export const haptic = {
    /** A physical tap, e.g. pressing a key. */
    impact: (style: ImpactStyle = 'light') => run(hf => hf.impactOccurred(style)),
    /** Outcome of an action. */
    notify: (type: NotificationType) => run(hf => hf.notificationOccurred(type)),
    /** A selection changed, e.g. flipping a switch or opening a menu. */
    selection: () => run(hf => hf.selectionChanged()),
};

/** Values accepted by the `data-haptic` attribute. */
export type HapticKind = 'none' | 'selection' | ImpactStyle | NotificationType;

const IMPACTS = ['light', 'medium', 'heavy', 'rigid', 'soft'];
const NOTIFICATIONS = ['success', 'warning', 'error'];

function play(kind: string) {
    if (kind === 'none') return;
    if (kind === 'selection') haptic.selection();
    else if (NOTIFICATIONS.includes(kind)) haptic.notify(kind as NotificationType);
    else haptic.impact((IMPACTS.includes(kind) ? kind : 'light') as ImpactStyle);
}

/**
 * Gives every button and link in the app a haptic tap, so new UI gets it for free.
 * Elements choose the feel with `data-haptic="medium" | "selection" | "warning" | ..."`,
 * or opt out with `data-haptic="none"`. Returns a cleanup function.
 */
export function installGlobalHaptics() {
    const onClick = (e: MouseEvent) => {
        const el = (e.target as Element | null)?.closest?.('button, a[href], [role="button"], [data-haptic]');
        if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
        play(el.getAttribute('data-haptic') || 'light');
    };
    // Capture phase so it still runs if a handler stops propagation.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
}
