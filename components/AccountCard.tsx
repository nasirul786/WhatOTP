'use client';
import { useEffect, useState } from 'react';
import { Trash2, Copy, Check, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import * as simpleIcons from 'simple-icons';

interface Account {
    id: number;
    service_name: string;
    issuer: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    slug?: string;
    hex?: string;
}

interface AccountCardProps {
    account: Account;
    onDelete: (id: number) => void;
    onEdit: (account: Account) => void;
}

export default function AccountCard({ account, onDelete, onEdit }: AccountCardProps) {
    const [code, setCode] = useState('000 000');
    const [timeLeft, setTimeLeft] = useState(30);
    const [copied, setCopied] = useState(false);

    // Haptics Helper
    const haptic = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error') => {
        if (typeof window === 'undefined' || !(window as any).Telegram?.WebApp?.HapticFeedback) return;
        const hf = (window as any).Telegram.WebApp.HapticFeedback;
        if (type === 'selection') hf.selectionChanged();
        else if (['success', 'warning', 'error'].includes(type)) hf.notificationOccurred(type);
        else hf.impactOccurred(type);
    };

    useEffect(() => {
        const OTPAuth = require('otpauth');

        const update = () => {
            try {
                let algo = (account.algorithm || 'sha1').toUpperCase();
                let totp = new OTPAuth.TOTP({
                    issuer: account.issuer || 'App',
                    label: account.service_name || 'Account',
                    algorithm: algo,
                    digits: account.digits || 6,
                    period: account.period || 30,
                    secret: OTPAuth.Secret.fromBase32(account.secret)
                });

                const token = totp.generate();
                const formatted = (token.length === 6)
                    ? token.replace(/(\d{3})(\d{3})/, '$1 $2')
                    : token.replace(/(.{3})/g, '$1 ').trim();

                setCode(formatted);

                const period = account.period || 30;
                const remaining = period - (Math.floor(Date.now() / 1000) % period);
                setTimeLeft(remaining);
            } catch (e) {
                console.error("TOTP Error:", e);
                setCode('Error');
            }
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [account]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code.replace(/\s/g, ''));
        setCopied(true);
        haptic('medium');
        haptic('success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic('warning');
        onDelete(account.id);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic('light');
        onEdit(account);
    };

    // Derived Colors and Icon
    const brandColor = account.hex || 'var(--primary)'; // Default to primary if no brand color
    // Determine icon path
    let iconPath = null;
    if (account.slug && (simpleIcons as any)[`si${account.slug}`]) {
        iconPath = (simpleIcons as any)[`si${account.slug}`].path;
    }

    // Fix monochrome icon visibility in the circular badge
    const isMonochrome = account.hex?.toUpperCase() === '000000' || account.hex?.toUpperCase() === 'FFFFFF';
    const iconColor = isMonochrome ? 'white' : 'white'; // Always white on colored badge usually, or adjust?
    // User logic in Picker was: if monochrome -> var(--foreground).
    // Here we act as a "badge". Usually badges have the brand color background.
    // If brand is Black (Apple), badge is Black. Icon should be White.
    // If brand is White (?), badge is White. Icon should be Black.
    // Simpler: Just use White text for now unless it's white background.

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl p-5 mb-3 select-none bg-[var(--surface)] border border-[var(--border)]"
        >
            {/* Progress Bar */}
            <div
                className="absolute bottom-0 left-0 h-1 transition-all duration-1000 linear"
                style={{
                    width: `${(timeLeft / (account.period || 30)) * 100}%`,
                    opacity: timeLeft < 5 ? 0.8 : 0.3,
                    backgroundColor: brandColor
                }}
            />

            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    {/* Icon Badge */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: brandColor, color: '#ffffff' }}
                    >
                        {iconPath ? (
                            <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                <path d={iconPath} />
                            </svg>
                        ) : (
                            <span className="font-bold text-lg">{(account.service_name[0] || '?').toUpperCase()}</span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-medium truncate uppercase tracking-wider text-[var(--muted)]">
                            {account.issuer || account.service_name}
                        </h3>
                        <h2 className="text-base font-bold truncate text-[var(--foreground)]">
                            {account.service_name}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleEdit}
                        className="p-2 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-[var(--muted)] hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between cursor-pointer group" onClick={handleCopy}>
                <div
                    className="font-mono text-3xl font-bold tracking-widest transition-opacity group-active:opacity-70"
                    style={{ color: brandColor }}
                >
                    {code}
                </div>
                <button
                    className="transition-colors text-[var(--muted)] group-hover:text-[var(--foreground)]"
                >
                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
            </div>
        </motion.div>
    );
}
