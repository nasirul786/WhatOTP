'use client';
import { ChevronRight, Loader2 } from 'lucide-react';

/** iOS system colours used for the rounded-square row icons. */
export const IOS = {
    blue: '#007aff',
    green: '#34c759',
    indigo: '#5856d6',
    orange: '#ff9500',
    pink: '#ff2d55',
    red: '#ff3b30',
    teal: '#30b0c7',
    gray: '#8e8e93',
    telegram: '#2aabee',
} as const;

interface SettingsGroupProps {
    header?: string;
    footer?: React.ReactNode;
    children: React.ReactNode;
}

/** Inset grouped list section: optional header above, rounded card, optional footer note below. */
export function SettingsGroup({ header, footer, children }: SettingsGroupProps) {
    return (
        <section>
            {header && <h2 className="px-4 pb-1.5 text-[13px] uppercase text-[var(--muted)]">{header}</h2>}
            <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden [&>*:last-child_.cell-body]:border-b-0">
                {children}
            </div>
            {footer && <p className="px-4 pt-1.5 text-[13px] leading-snug text-[var(--muted)]">{footer}</p>}
        </section>
    );
}

interface SettingsRowProps {
    label: string;
    icon?: React.ReactNode;
    /** Background colour of the icon tile. */
    color?: string;
    /** Secondary text or control on the right. */
    value?: React.ReactNode;
    onClick?: () => void;
    /** Show the disclosure chevron (defaults to true when clickable). */
    chevron?: boolean;
    destructive?: boolean;
}

/** One cell in a grouped list. The separator is inset to start after the icon, like iOS. */
export function SettingsRow({ label, icon, color = IOS.gray, value, onClick, chevron = !!onClick, destructive }: SettingsRowProps) {
    const content = (
        <>
            {icon && (
                <div
                    className="w-[29px] h-[29px] rounded-[7px] flex items-center justify-center text-white shrink-0 mr-4"
                    style={{ backgroundColor: color }}
                >
                    {icon}
                </div>
            )}
            <div className="cell-body flex-1 min-w-0 self-stretch flex items-center justify-between gap-3 min-h-[44px] py-2.5 pr-4 border-b-[0.5px] border-[var(--separator)]">
                <span className={`text-[17px] truncate ${destructive ? 'text-[#ff3b30]' : ''}`}>{label}</span>
                <span className="flex items-center gap-1.5 text-[17px] text-[var(--muted)] shrink-0">
                    {value}
                    {chevron && <ChevronRight size={20} strokeWidth={2.5} className="opacity-40 -mr-1" />}
                </span>
            </div>
        </>
    );
    const cls = 'w-full flex items-center pl-4 text-left';

    return onClick ? (
        <button onClick={onClick} className={`${cls} active:bg-[var(--cell-pressed)] transition-colors duration-75`}>
            {content}
        </button>
    ) : (
        <div className={cls}>{content}</div>
    );
}

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    loading?: boolean;
    label: string;
}

/** iOS switch (51×31). Shows a spinner instead while a change is in progress. */
export function Toggle({ checked, onChange, loading, label }: ToggleProps) {
    if (loading) return <Loader2 size={22} className="animate-spin mr-3" />;
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={label}
            data-haptic="selection"
            onClick={(e) => {
                e.stopPropagation();
                onChange();
            }}
            className="relative w-[51px] h-[31px] rounded-full transition-colors duration-200 shrink-0"
            style={{ backgroundColor: checked ? IOS.green : 'var(--toggle-off)' }}
        >
            <span
                className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-200"
                style={{ transform: `translateX(${checked ? 20 : 0}px)` }}
            />
        </button>
    );
}
