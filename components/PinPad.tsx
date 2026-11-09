'use client';
import { useEffect, useRef } from 'react';
import PasscodeKeypad from '@/components/PasscodeKeypad';

interface PinPadProps {
    value: string;
    onPress: (digit: string) => void;
    onDelete: () => void;
    /** Called as soon as `length` digits are entered, or when Submit is pressed with a full pin. */
    onComplete: (value: string) => void;
    length?: number;
    /** Disables Submit (e.g. while a request is in flight). */
    busy?: boolean;
    className?: string;
}

/** Progress dots plus keypad. Auto-submits on the last digit; supports the physical keyboard. */
export default function PinPad({ value, onPress, onDelete, onComplete, length = 6, busy, className = 'mb-8' }: PinPadProps) {
    const full = value.length === length;
    const submitted = useRef<string | null>(null);

    // Auto-detect a complete pin (once per value).
    useEffect(() => {
        if (!full) {
            submitted.current = null;
        } else if (submitted.current !== value) {
            submitted.current = value;
            onComplete(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, full]);

    // Keep the latest handlers available to the keydown listener.
    const latest = useRef({ onPress, onDelete, onComplete, value, full, busy });
    latest.current = { onPress, onDelete, onComplete, value, full, busy };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const s = latest.current;

            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();
                s.onPress(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                s.onDelete();
            } else if (e.key === 'Enter' && s.full && !s.busy) {
                e.preventDefault();
                s.onComplete(s.value);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="w-full flex-1 flex flex-col items-center">
            <div className={`flex gap-4 ${className}`}>
                {Array.from({ length }, (_, i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${value.length > i ? 'bg-[var(--primary)] scale-110' : 'bg-[var(--border)]'
                            }`}
                    />
                ))}
            </div>
            <div className="mt-auto w-full">
            <PasscodeKeypad
                onPress={onPress}
                onDelete={onDelete}
                onSubmit={() => full && onComplete(value)}
                submitDisabled={!full || busy}
            />
            </div>
        </div>
    );
}
