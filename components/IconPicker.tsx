'use client';
import { useState, useEffect } from 'react';
import * as simpleIcons from 'simple-icons';
import { HexColorPicker } from 'react-colorful';
import { Search, ChevronRight, X, Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/useTranslation';
import Lottie from 'lottie-react';
const searchNotFoundAnim = require('../public/lotties/search-not-found.json');

// Common brand colors/icons for quick selection
const FEATURED_ICONS = [
    'Google', 'Discord', 'Facebook', 'Instagram', 'Apple', 'Twitch', 'Dropbox', 'Netflix', 'Binance', 'Steam'
];

const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280', '#FFC107', '#07ff34ff', '#ff0000ff', '#0000ffff', '#00ffffff'
];

interface IconPickerProps {
    value: { slug: string; hex: string };
    onChange: (val: { slug: string; hex: string }) => void;
    isSearchOpen: boolean;
    onSearchOpenChange: (open: boolean) => void;
}

export default function IconPicker({ value, onChange, isSearchOpen, onSearchOpenChange }: IconPickerProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showColorPicker, setShowColorPicker] = useState(false);

    const allIcons = Object.entries(simpleIcons).filter(([k]) => k.startsWith('si'));

    const filteredIcons = allIcons.filter(([key, icon]: [string, any]) =>
        icon.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50);

    const handleIconSelect = (key: string, brandHex: string) => {
        // key is like 'siGoogle', we want 'Google'
        const slug = key.substring(2);
        onChange({ ...value, slug, hex: `#${brandHex}` });
        onSearchOpenChange(false);
    };

    const SvgIcon = ({ path, color, className }: any) => (
        <svg role="img" viewBox="0 0 24 24" className={className} style={{ fill: color }}>
            <path d={path} />
        </svg>
    );

    // Handle display of selected icon if not in featured
    const displayIcons = [...FEATURED_ICONS];
    if (value.slug && !FEATURED_ICONS.includes(value.slug)) {
        displayIcons.unshift(value.slug);
    }

    return (
        <div className="space-y-4">
            {/* Color Section */}
            <div>
                <label className="text-xs font-medium text-[var(--muted)] mb-2 block uppercase tracking-wider">{t.accent_color}</label>
                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${showColorPicker ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : 'border-[var(--border)]'}`}
                        style={{ backgroundColor: value.hex || 'var(--input-bg)' }}
                    >
                        <Palette size={14} className={value.hex ? 'text-white mix-blend-difference' : 'text-[var(--muted)]'} />
                    </button>

                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => onChange({ ...value, hex: c })}
                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${value.hex === c ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <AnimatePresence>
                    {showColorPicker && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3"
                        >
                            <HexColorPicker color={value.hex} onChange={(c) => onChange({ ...value, hex: c })} style={{ width: '100%' }} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Icon Section */}
            <div>
                <label className="text-xs font-medium text-[var(--muted)] mb-2 block uppercase tracking-wider">{t.service_icon}</label>
                <div className="grid grid-cols-6 gap-3">
                    {displayIcons
                        .filter(name => (simpleIcons as any)[`si${name}`])
                        .slice(0, 10)
                        .map(name => {
                            // @ts-ignore
                            const icon = simpleIcons[`si${name}`];
                            const isSelected = value.slug === name;

                            const isMonochrome = icon.hex.toUpperCase() === '000000' || icon.hex.toUpperCase() === 'FFFFFF';

                            let bgStyle = {};
                            if (isSelected) {
                                bgStyle = { backgroundColor: value.hex ? `${value.hex}33` : 'var(--input-bg)' };
                            } else {
                                bgStyle = { backgroundColor: 'var(--input-bg)' };
                            }

                            // Always use foreground for monochrome icons to ensure visibility
                            const iconFill = isMonochrome ? 'var(--foreground)' : (isSelected ? value.hex : `#${icon.hex}`);

                            return (
                                <button
                                    key={name}
                                    onClick={() => handleIconSelect('si' + name, icon.hex)}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${isSelected ? 'ring-2 ring-[var(--primary)]' : 'hover:bg-white/5'}`}
                                    style={bgStyle}
                                >
                                    <SvgIcon
                                        path={icon.path}
                                        color={iconFill}
                                        className="w-5 h-5"
                                    />
                                </button>
                            )
                        })}

                    <button
                        onClick={() => onSearchOpenChange(true)}
                        className="col-span-2 h-full rounded-xl flex items-center justify-center gap-2 bg-[var(--input-bg)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                    >
                        <Search size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t.search}</span>
                    </button>
                </div>
            </div>

            {/* Full Screen Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        className="fixed inset-0 z-[60] bg-[var(--background)] flex flex-col"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween' }}
                    >
                        <div
                            className="p-4 border-b border-[var(--border)] flex items-center gap-3 pt-safe-top bg-[var(--background)]"
                            style={{
                                paddingTop: 'calc(1rem + var(--tg-safe-area-inset-top, 0px))'
                            }}
                        >
                            {/* Visual Back Button REMOVED - Relying on Telegram BackButton */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                <input
                                    className="w-full bg-[var(--input-bg)] h-10 rounded-lg pl-10 pr-4 outline-none text-[var(--foreground)]"
                                    placeholder={t.browse_icons}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <X size={16} className="text-[var(--muted)]" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 pb-safe-bottom bg-[var(--background)]">
                            {filteredIcons.length === 0 && searchQuery ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-100 pb-20">
                                    <div className="w-40 h-40">
                                        <Lottie animationData={searchNotFoundAnim} loop={true} />
                                    </div>
                                    <p className="text-[var(--muted)] font-medium mt-2">{t.no_icons_found}</p>
                                </div>
                            ) : (
                                filteredIcons.map(([key, icon]: [string, any], i) => {
                                    const isMonochrome = icon.hex.toUpperCase() === '000000' || icon.hex.toUpperCase() === 'FFFFFF';
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleIconSelect(key, icon.hex)}
                                            className="flex items-center gap-4 w-full p-3 hover:bg-[var(--input-bg)] rounded-xl transition-colors text-left"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--input-bg)]"
                                            >
                                                <SvgIcon
                                                    path={icon.path}
                                                    color={isMonochrome ? 'var(--foreground)' : `#${icon.hex}`}
                                                    className="w-5 h-5"
                                                />
                                            </div>
                                            <span className="text-[var(--foreground)] font-medium">{icon.title}</span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
