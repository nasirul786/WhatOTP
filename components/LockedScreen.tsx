'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Trash2, BellRing, ShieldOff, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

interface LockedScreenProps {
    lockedUntil: number;
    /** 'delete_account' for a scheduled deletion; anything else is a security (remove-auth) lock. */
    reason: string | null;
    onRestore: () => Promise<void>;
}

function CountdownRing({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
    const size = 232;
    const stroke = 10;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    // Keep a visible gap at the top even at 100%, so a full timer doesn't read as a closed ring.
    // The gap must exceed the stroke width because round caps extend stroke/2 past each end.
    const gap = (stroke * 2.5) / c;
    const arc = c * progress * (1 - gap);
    // Centre the gap on 12 o'clock: start the arc half a gap clockwise from the top.
    const startDeg = -90 + (gap / 2) * 360;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: `rotate(${startDeg}deg)` }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${arc} ${c}`}
                    style={{ transition: 'stroke-dasharray 1s linear', opacity: progress > 0 ? 1 : 0 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 px-4 py-3.5">
            <div className="mt-0.5 shrink-0 text-[var(--muted)]">{icon}</div>
            <div className="text-[15px] leading-snug">{children}</div>
        </div>
    );
}

/** Countdown shown while an account deletion or authentication removal is pending. */
export default function LockedScreen({ lockedUntil, reason, onRestore }: LockedScreenProps) {
    const { t, lang } = useTranslation();
    const [now, setNow] = useState(Date.now());
    const [restoring, setRestoring] = useState(false);
    const isDelete = reason === 'delete_account';

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const remaining = Math.max(0, lockedUntil - now);

    // Once the timer runs out the server applies the deletion/removal on the next login.
    useEffect(() => {
        if (remaining === 0) window.location.reload();
    }, [remaining]);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const time = [
        Math.floor(remaining / 3600000),
        Math.floor((remaining % 3600000) / 60000),
        Math.floor((remaining % 60000) / 1000),
    ].map(pad).join(':');

    const scheduledFor = new Date(lockedUntil).toLocaleString(lang, {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    const restore = async () => {
        setRestoring(true);
        try {
            await onRestore();
        } finally {
            setRestoring(false);
        }
    };

    return (
        <main className="min-h-app flex flex-col px-6 bg-[var(--background)] text-[var(--foreground)]">
            <motion.div
                className="flex-1 flex flex-col items-center justify-center text-center pt-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
            >
                <CountdownRing progress={Math.min(1, remaining / LOCK_DURATION_MS)} color={isDelete ? '#ff3b30' : '#ff9500'}>
                    <div className={`mb-2 ${isDelete ? 'text-[#ff3b30]' : 'text-[#ff9500]'}`}>
                        {isDelete ? <Trash2 size={26} /> : <ShieldOff size={26} />}
                    </div>
                    <div className="text-[34px] font-semibold tracking-tight tabular-nums">{time}</div>
                    <div className="text-[13px] text-[var(--muted)] mt-0.5">{t.time_remaining}</div>
                </CountdownRing>

                <h1 className="mt-8 text-[28px] leading-tight font-bold tracking-tight">
                    {isDelete ? t.account_deletion_scheduled : t.account_locked}
                </h1>
                <p className="mt-2 text-[15px] leading-snug text-[var(--muted)] max-w-[300px]">
                    {isDelete ? t.account_deletion_msg : t.account_locked_msg}
                </p>
            </motion.div>

            <motion.div
                className="w-full max-w-sm mx-auto pb-4 pt-6 space-y-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
            >
                <div className="rounded-[14px] bg-[var(--surface)] divide-y divide-[var(--border)]">
                    <InfoRow icon={<CalendarClock size={18} />}>
                        <span className="text-[var(--muted)]">{t.scheduled_for}</span>{' '}
                        <span className="font-medium">{scheduledFor}</span>
                    </InfoRow>
                    {isDelete && (
                        <>
                            <InfoRow icon={<Trash2 size={18} />}>{t.deletion_erases}</InfoRow>
                            <InfoRow icon={<BellRing size={18} />}>{t.notice_sent}</InfoRow>
                        </>
                    )}
                </div>

                <button
                    onClick={restore}
                    disabled={restoring}
                    className="w-full h-[52px] rounded-[14px] text-[17px] font-semibold flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-fg)] active:scale-[0.98] active:opacity-80 transition-all disabled:opacity-60"
                >
                    {restoring && <Loader2 size={20} className="animate-spin" />}
                    {isDelete ? t.cancel_deletion : t.restore_security}
                </button>
            </motion.div>
        </main>
    );
}
