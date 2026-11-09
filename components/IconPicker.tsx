'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as simpleIcons from 'simple-icons';
import { HexColorPicker } from 'react-colorful';
import { Search, Check, XCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lottie } from 'lottie-react';
import { useTranslation } from '@/lib/useTranslation';
import searchNotFoundAnim from '@/public/lotties/search-not-found.json';

/** Popular services shown as quick picks. */
const FEATURED_ICONS = [
    'Google', 'Discord', 'Facebook', 'Instagram', 'Apple', 'Github', 'Twitch', 'Binance', 'Steam', 'X', 'Telegram',
];

/** iOS system colours. */
const PRESET_COLORS = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E', '#8E8E93',
];

type Icon = { title: string; hex: string; path: string };
const ALL_ICONS = Object.entries(simpleIcons).filter(([k]) => k.startsWith('si')) as [string, Icon][];

const getIcon = (slug: string) => (simpleIcons as any)[`si${slug}`] as Icon | undefined;
const isMonochrome = (hex: string) => ['000000', 'FFFFFF'].includes(hex.toUpperCase());

function Glyph({ path, color, className = 'w-5 h-5' }: { path: string; color: string; className?: string }) {
    return (
        <svg role="img" viewBox="0 0 24 24" className={className} style={{ fill: color }}>
            <path d={path} />
        </svg>
    );
}

interface IconPickerProps {
    value: { slug: string; hex: string };
    onChange: (val: { slug: string; hex: string }) => void;
    isSearchOpen: boolean;
    onSearchOpenChange: (open: boolean) => void;
}

/** Icon and colour sections of the entry form, plus the full-screen icon search. */
export default function IconPicker({ value, onChange, isSearchOpen, onSearchOpenChange }: IconPickerProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const customRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q ? ALL_ICONS.filter(([, icon]) => icon.title.toLowerCase().includes(q)) : ALL_ICONS;
        return list.slice(0, 60);
    }, [query]);

    const selectIcon = (key: string, brandHex: string) => {
        onChange({ slug: key.substring(2), hex: `#${brandHex}` }); // 'siGoogle' -> 'Google'
        onSearchOpenChange(false);
        setQuery('');
    };

    // Keep the current icon visible in the quick picks even if it isn't featured.
    const quickPicks = useMemo(() => {
        const list = FEATURED_ICONS.filter(getIcon);
        if (value.slug && getIcon(value.slug) && !list.includes(value.slug)) list.unshift(value.slug);
        // 10 icons + the 2-column Search button fill two rows of 6.
        return list.slice(0, 10);
    }, [value.slug]);

    const isPreset = PRESET_COLORS.includes(value.hex.toUpperCase());

    return (
        <>
            {/* Icon */}
            <section>
                <h3 className="px-4 pb-1.5 text-[13px] uppercase text-[var(--muted)]">{t.service_icon}</h3>
                <div className="bg-[var(--cell)] rounded-[10px] p-3 grid grid-cols-6 gap-2">
                    {quickPicks.map(name => {
                        const icon = getIcon(name)!;
                        const selected = value.slug === name;
                        return (
                            <button
                                key={name}
                                data-haptic="selection"
                                aria-label={icon.title}
                                onClick={() => selectIcon('si' + name, icon.hex)}
                                className="aspect-square rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                style={{
                                    backgroundColor: selected ? `${value.hex || '#007AFF'}26` : 'var(--fill)',
                                    boxShadow: selected ? `inset 0 0 0 2px ${value.hex || 'var(--primary)'}` : undefined,
                                }}
                            >
                                <Glyph path={icon.path} color={isMonochrome(icon.hex) ? 'var(--foreground)' : `#${icon.hex}`} />
                            </button>
                        );
                    })}
                    {/* Wider than an icon tile and labelled, so it doesn't read as a selectable icon */}
                    <button
                        onClick={() => onSearchOpenChange(true)}
                        aria-label={t.browse_icons}
                        className="col-span-2 rounded-[12px] flex items-center justify-center gap-1.5 bg-[var(--primary)]/12 text-[var(--primary)] text-[15px] font-semibold active:scale-95 transition-transform"
                    >
                        <Search size={17} strokeWidth={2.5} />
                        {t.search}
                    </button>
                </div>
            </section>

            {/* Colour */}
            <section>
                <h3 className="px-4 pb-1.5 text-[13px] uppercase text-[var(--muted)]">{t.accent_color}</h3>
                <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden">
                    <div className="p-3 grid grid-cols-6 gap-3 justify-items-center">
                        {PRESET_COLORS.map(c => {
                            const selected = value.hex.toUpperCase() === c;
                            return (
                                <button
                                    key={c}
                                    data-haptic="selection"
                                    aria-label={c}
                                    onClick={() => onChange({ ...value, hex: c })}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
                                    style={{
                                        backgroundColor: c,
                                        boxShadow: selected ? `0 0 0 2px var(--cell), 0 0 0 4px ${c}` : undefined,
                                    }}
                                >
                                    {selected && <Check size={18} strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setShowCustom(s => !s)}
                        className="w-full flex items-center pl-4 active:bg-[var(--cell-pressed)] transition-colors duration-75 border-t-[0.5px] border-[var(--separator)]"
                    >
                        <span
                            className="w-[29px] h-[29px] rounded-full shrink-0 mr-4"
                            style={{ background: !isPreset && value.hex ? value.hex : 'conic-gradient(#ff3b30, #ffcc00, #34c759, #007aff, #af52de, #ff3b30)' }}
                        />
                        <span className="flex-1 flex items-center justify-between min-h-[44px] pr-4">
                            <span className="text-[17px]">{t.custom_color}</span>
                            <span className="flex items-center gap-1.5 text-[17px] text-[var(--muted)]">
                                {!isPreset && value.hex ? value.hex.toUpperCase() : ''}
                                <ChevronRight size={20} strokeWidth={2.5} className={`opacity-40 -mr-1 transition-transform ${showCustom ? 'rotate-90' : ''}`} />
                            </span>
                        </span>
                    </button>
                    <AnimatePresence initial={false}>
                        {showCustom && (
                            <motion.div
                                ref={customRef}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                // Once expanded, bring the whole colour wheel into view.
                                // (only after opening — this also fires when the collapse animation ends)
                                onAnimationComplete={(def: any) => {
                                    if (def?.height === 'auto') customRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                }}
                                className="overflow-hidden scroll-mb-6"
                            >
                                <div className="p-4 pt-1">
                                    <HexColorPicker
                                        color={value.hex || '#007AFF'}
                                        onChange={c => onChange({ ...value, hex: c })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* Full-screen icon search. Portalled to <body>: inside the sheet, its transform would make
                `fixed` relative to the sheet instead of the screen, leaving the form visible underneath. */}
            {mounted && createPortal(
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        className="safe-area fixed inset-0 z-[60] h-[100dvh] bg-[var(--grouped-bg)] text-[var(--foreground)] flex flex-col"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                    >
                        <div className="px-4 pt-3 pb-3">
                            <h2 className="px-1 pb-3 text-[34px] leading-tight font-bold tracking-tight">{t.browse_icons}</h2>
                            <div className="flex items-center gap-1.5 h-9 px-2 rounded-[10px] bg-[var(--fill)]">
                                <Search size={17} className="text-[var(--muted)] shrink-0" />
                                <input
                                    className="flex-1 min-w-0 bg-transparent outline-none text-[17px] placeholder:text-[var(--muted)]"
                                    placeholder={t.search}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    autoFocus
                                />
                                {query && (
                                    <button onClick={() => setQuery('')} aria-label={t.cancel} className="text-[var(--muted)]">
                                        <XCircle size={17} fill="currentColor" stroke="var(--cell)" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
                            {results.length === 0 ? (
                                <div className="flex flex-col items-center justify-center pt-10">
                                    <div className="w-40 h-40">
                                        <Lottie autoplay src={searchNotFoundAnim} loop={true} />
                                    </div>
                                    <p className="text-[17px] text-[var(--muted)] mt-2">{t.no_icons_found}</p>
                                </div>
                            ) : (
                                <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden [&>*:last-child_.cell-body]:border-b-0">
                                    {results.map(([key, icon]) => {
                                        const selected = value.slug === key.substring(2);
                                        return (
                                            <button
                                                key={key}
                                                data-haptic="selection"
                                                onClick={() => selectIcon(key, icon.hex)}
                                                className="w-full flex items-center pl-4 text-left active:bg-[var(--cell-pressed)] transition-colors duration-75"
                                            >
                                                <span className="w-[29px] h-[29px] rounded-[7px] bg-[var(--fill)] flex items-center justify-center shrink-0 mr-4">
                                                    <Glyph path={icon.path} color={isMonochrome(icon.hex) ? 'var(--foreground)' : `#${icon.hex}`} className="w-[17px] h-[17px]" />
                                                </span>
                                                <span className="cell-body flex-1 min-w-0 min-h-[44px] flex items-center justify-between pr-4 border-b-[0.5px] border-[var(--separator)]">
                                                    <span className="text-[17px] truncate">{icon.title}</span>
                                                    {selected && <Check size={20} strokeWidth={2.75} className="text-[var(--primary)] shrink-0" />}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}
        </>
    );
}
