'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsUpDown } from 'lucide-react';

export interface MenuOption<T extends string> {
    value: T;
    label: string;
    icon?: React.ReactNode;
}

interface SelectMenuProps<T extends string> {
    options: MenuOption<T>[];
    value: T | undefined;
    onChange: (value: T) => void;
    /** Accessible name for the trigger. */
    label: string;
}

const MENU_WIDTH = 250;
const ITEM_HEIGHT = 44;
const GAP = 8;

interface Position {
    top?: number;
    bottom?: number;
    right: number;
    originY: 'top' | 'bottom';
}

/**
 * iOS pull-down menu: a "Value ⌃⌄" trigger that opens a small translucent menu anchored to it,
 * with a checkmark on the selected option and an optional icon on the right.
 */
export default function SelectMenu<T extends string>({ options, value, onChange, label }: SelectMenuProps<T>) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState<Position | null>(null);
    const [mounted, setMounted] = useState(false);
    const current = options.find(o => o.value === value);

    useEffect(() => setMounted(true), []);

    const open = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const height = options.length * ITEM_HEIGHT;
        const right = Math.max(GAP, window.innerWidth - rect.right);
        // Open downwards when it fits, otherwise upwards (like iOS).
        if (rect.bottom + GAP + height < window.innerHeight - GAP) {
            setPos({ top: rect.bottom + GAP, right, originY: 'top' });
        } else {
            setPos({ bottom: window.innerHeight - rect.top + GAP, right, originY: 'bottom' });
        }
    };
    const close = () => setPos(null);

    // A menu anchored to a moving element would drift; close it on scroll/resize instead.
    useEffect(() => {
        if (!pos) return;
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [pos]);

    return (
        <>
            <button
                ref={triggerRef}
                onClick={open}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={!!pos}
                className="flex items-center gap-1 text-[17px] text-[var(--muted)] active:opacity-50 transition-opacity -my-2 py-2"
            >
                {current?.label}
                <ChevronsUpDown size={16} strokeWidth={2.25} />
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {pos && (
                        <>
                            {/* Invisible layer: tapping anywhere outside closes the menu */}
                            <div className="fixed inset-0 z-[80]" onClick={close} />
                            <motion.div
                                role="menu"
                                className="fixed z-[81] rounded-[14px] overflow-hidden bg-[var(--menu-bg)] backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.25)] border-[0.5px] border-[var(--separator)] divide-y-[0.5px] divide-[var(--separator)] text-[var(--foreground)]"
                                style={{
                                    width: MENU_WIDTH,
                                    top: pos.top,
                                    bottom: pos.bottom,
                                    right: pos.right,
                                    transformOrigin: `${pos.originY} right`,
                                    WebkitBackdropFilter: 'blur(40px)',
                                }}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                            >
                                {options.map(option => {
                                    const selected = option.value === value;
                                    return (
                                        <button
                                            key={option.value}
                                            role="menuitemradio"
                                            aria-checked={selected}
                                            data-haptic="selection"
                                            onClick={() => {
                                                close();
                                                if (!selected) onChange(option.value);
                                            }}
                                            className="w-full flex items-center gap-2 pl-3 pr-4 text-left active:bg-[var(--fill)] transition-colors"
                                            style={{ height: ITEM_HEIGHT }}
                                        >
                                            <span className="w-5 shrink-0 text-[var(--primary)]">
                                                {selected && <Check size={18} strokeWidth={2.75} />}
                                            </span>
                                            <span className="flex-1 text-[17px] truncate">{option.label}</span>
                                            {option.icon && <span className="shrink-0">{option.icon}</span>}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
