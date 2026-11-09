import React from 'react';
import { Delete } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface PasscodeKeypadProps {
    onPress: (digit: string) => void;
    onDelete: () => void;
    onSubmit?: () => void;
    submitDisabled?: boolean;
}

const KEY = 'h-14 rounded-full flex items-center justify-center select-none transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100';

/** Numeric keypad. Haptics come from the app-wide button handler (see lib/haptics). */
export default function PasscodeKeypad({ onPress, onDelete, onSubmit, submitDisabled }: PasscodeKeypadProps) {
    const { t } = useTranslation();

    const digit = (k: string) => (
        <button
            key={k}
            data-haptic="light"
            className={`${KEY} text-3xl font-normal bg-[var(--surface)] active:bg-[var(--input-bg)]`}
            onClick={() => onPress(k)}
        >
            {k}
        </button>
    );

    return (
        <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit)}

            <button
                data-haptic="medium"
                className={`${KEY} bg-[var(--primary)]/20 text-[var(--foreground)]`}
                onClick={onDelete}
                aria-label="Delete"
            >
                <Delete size={28} />
            </button>

            {digit('0')}

            <button
                data-haptic="medium"
                className={`${KEY} bg-[var(--primary)] text-[var(--primary-fg)] text-lg font-semibold`}
                onClick={() => onSubmit?.()}
                disabled={submitDisabled}
            >
                {t.submit || 'Submit'}
            </button>
        </div>
    );
}
