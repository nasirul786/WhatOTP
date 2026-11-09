'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { AlertTriangle, Check, Clock, Copy, EyeOff, Heart, Loader2, UserRound, X } from 'lucide-react';
import Drawer from '@/components/Drawer';
import { Toggle } from '@/components/SettingsRow';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import {
    DONATION_PRESETS, MAX_DONATION, MIN_DONATION, USDT_NETWORKS,
    type DonationPayment, type DonationStatus, type WallEntry,
} from '@/lib/donations';

const POLL_MS = 5000;
const CARD = 'bg-[var(--cell)] rounded-[10px] overflow-hidden';
const SEP = 'border-b-[0.5px] border-[var(--separator)]';
const ACCENT = '#ff2d55'; // iOS pink, matches the Donate row

/** Keeps an in-progress payment alive if the drawer is closed and reopened. */
let activePayment: DonationPayment | null = null;

type Wall = { total: number; count: number; entries: WallEntry[] };

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

/** Donate with USDT through OxaPay, plus the public donation wall. */
export default function DonateDrawer({ isOpen, onClose }: Props) {
    const { lang } = useTranslation();
    const [payment, setPaymentState] = useState<DonationPayment | null>(activePayment);
    const setPayment = useCallback((p: DonationPayment | null) => {
        activePayment = p;
        setPaymentState(p);
    }, []);

    const [wall, setWall] = useState<Wall | null>(null);
    const loadWall = useCallback(() => {
        fetch('/api/donate/wall')
            .then(r => r.json())
            .then(d => d.success && setWall({ total: d.total, count: d.count, entries: d.entries }))
            .catch(err => console.error('Failed to load donation wall:', err));
    }, []);
    useEffect(() => {
        if (isOpen) loadWall();
    }, [isOpen, loadWall]);

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="min-h-full bg-[var(--grouped-bg)] px-4 pt-4 pb-10 space-y-8">
                <AnimatePresence mode="wait" initial={false}>
                    {payment ? (
                        <motion.div key="pay" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                            <PaymentScreen
                                payment={payment}
                                onUpdate={setPayment}
                                onClose={paid => {
                                    setPayment(null);
                                    if (paid) loadWall();
                                }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                            <DonateForm wall={wall} lang={lang} onCreated={setPayment} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {!payment && <DonationWall wall={wall} lang={lang} />}
            </div>
        </Drawer>
    );
}

/* ---------- donate form ---------- */

function DonateForm({ wall, lang, onCreated }: { wall: Wall | null; lang: string; onCreated: (p: DonationPayment) => void }) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [amountText, setAmountText] = useState('5');
    const [network, setNetwork] = useState(USDT_NETWORKS[0].id);
    const [anonymous, setAnonymous] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const amount = Number(amountText.replace(',', '.'));
    const valid = Number.isFinite(amount) && amount >= MIN_DONATION && amount <= MAX_DONATION;

    const submit = async () => {
        if (!valid || creating) return;
        setCreating(true);
        setError('');
        try {
            const res = await api('/api/donate/create', webApp?.initData, { body: { amount, network, anonymous } });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);
            haptic.notify('success');
            onCreated(data.payment);
        } catch (err) {
            console.error('Create donation failed:', err);
            haptic.notify('error');
            setError(err instanceof Error && err.message ? err.message : t.donate_error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Hero */}
            <div className="flex flex-col items-center text-center px-4 pt-2">
                <motion.div
                    animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, repeatDelay: 0.8 }}
                    className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #ff6482)`, boxShadow: `0 10px 30px ${ACCENT}40` }}
                >
                    <Heart className="w-9 h-9 text-white" fill="currentColor" />
                </motion.div>
                <h1 className="mt-4 text-[28px] font-bold tracking-tight leading-tight">{t.donate_title}</h1>
                <p className="mt-1.5 text-[15px] leading-snug text-[var(--muted)] max-w-[320px]">{t.donate_subtitle}</p>
            </div>

            {wall && (
                <div className={`${CARD} grid grid-cols-2`}>
                    <Stat value={`${compact(wall.total, lang)} USDT`} label={t.donate_raised} />
                    <Stat value={compact(wall.count, lang)} label={t.donate_supporters} border />
                </div>
            )}

            {/* Amount */}
            <section>
                <SectionLabel>{t.donate_amount}</SectionLabel>
                <div className={CARD}>
                    <label className={`flex items-center gap-3 px-4 h-[52px] ${SEP}`}>
                        <img src="/networks/usdt.svg" alt="" className="w-6 h-6 shrink-0" />
                        <input
                            inputMode="decimal"
                            value={amountText}
                            onChange={e => setAmountText(e.target.value.replace(/[^\d.,]/g, '').slice(0, 9))}
                            placeholder="0.00"
                            aria-label={t.donate_amount}
                            className="flex-1 min-w-0 bg-transparent outline-none text-[17px] font-semibold tabular-nums placeholder:text-[var(--muted)]"
                        />
                        <span className="text-[15px] font-medium text-[var(--muted)] shrink-0">USDT</span>
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
                        {DONATION_PRESETS.map(v => (
                            <button
                                key={v}
                                type="button"
                                data-haptic="selection"
                                onClick={() => setAmountText(String(v))}
                                className="min-w-[44px] h-8 px-3 rounded-full text-[14px] font-semibold shrink-0 transition-colors"
                                style={amount === v
                                    ? { backgroundColor: ACCENT, color: '#fff' }
                                    : { backgroundColor: 'var(--fill)', color: 'var(--foreground)' }}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
                {!valid && amountText !== '' && (
                    <p className="px-4 pt-1.5 text-[13px] text-[#ff3b30]">{t.donate_min.replace('{min}', String(MIN_DONATION))}</p>
                )}
            </section>

            {/* Network */}
            <section>
                <SectionLabel>{t.donate_network}</SectionLabel>
                <div className={CARD}>
                    {USDT_NETWORKS.map((n, i) => (
                        <button
                            key={n.id}
                            type="button"
                            data-haptic="selection"
                            onClick={() => setNetwork(n.id)}
                            className="w-full flex items-center text-left active:bg-[var(--cell-pressed)] transition-colors duration-75"
                        >
                            <NetworkLogo logo={n.logo} className="ml-4" />
                            <span className={`flex-1 min-w-0 ml-3 pr-4 py-2.5 flex items-center gap-2 ${i < USDT_NETWORKS.length - 1 ? SEP : ''}`}>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[17px] leading-tight">{n.label}</span>
                                    <span className="block text-[13px] text-[var(--muted)]">USDT · {n.tag}</span>
                                </span>
                                {n.id === network && <Check className="w-5 h-5 text-[var(--primary)]" strokeWidth={2.75} />}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Anonymous */}
            <section>
                <div className={`${CARD} flex items-center gap-3 px-4 py-2.5`}>
                    <span className="w-[29px] h-[29px] rounded-[7px] bg-[#8e8e93] text-white flex items-center justify-center shrink-0">
                        <EyeOff size={17} />
                    </span>
                    <span className="flex-1 min-w-0 text-[17px]">{t.donate_anonymous}</span>
                    <Toggle label={t.donate_anonymous} checked={anonymous} onChange={() => setAnonymous(a => !a)} />
                </div>
                <p className="px-4 pt-1.5 text-[13px] text-[var(--muted)]">{t.donate_anonymous_sub}</p>
            </section>

            {error && <p className="px-4 text-[13px] text-[#ff3b30]">{error}</p>}

            <button
                type="button"
                data-haptic="medium"
                onClick={submit}
                disabled={!valid || creating}
                className="w-full h-[52px] rounded-[14px] text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] active:opacity-80 transition-all disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
            >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" fill="currentColor" />}
                {t.donate_btn.replace('{amount}', valid ? String(amount) : '…')}
            </button>
        </div>
    );
}

/* ---------- in-app payment ---------- */

function PaymentScreen({ payment, onUpdate, onClose }: {
    payment: DonationPayment;
    onUpdate: (p: DonationPayment) => void;
    onClose: (paid: boolean) => void;
}) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    const [copied, setCopied] = useState<string | null>(null);
    const network = USDT_NETWORKS.find(n => n.id === payment.network);
    const secondsLeft = Math.max(0, payment.expiredAt - now);
    const status: DonationStatus = payment.status === 'waiting' && secondsLeft === 0 ? 'expired' : payment.status;
    const finished = status === 'paid' || status === 'expired' || status === 'failed';

    useEffect(() => {
        if (finished) return;
        const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(id);
    }, [finished]);

    // Poll the payment status until it's settled.
    useEffect(() => {
        if (finished) return;
        const id = setInterval(async () => {
            try {
                const res = await api('/api/donate/status', webApp?.initData, { body: { trackId: payment.trackId } });
                const data = await res.json();
                if (data.success && data.status !== payment.status) {
                    onUpdate({ ...payment, status: data.status });
                    if (data.status === 'paid') {
                        haptic.notify('success');
                        confetti({ particleCount: 160, spread: 80, origin: { y: 0.5 }, zIndex: 200 });
                    }
                }
            } catch (err) {
                console.error('Donation status check failed:', err);
            }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [finished, webApp, payment, onUpdate]);

    const copy = async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            return;
        }
        haptic.notify('success');
        setCopied(key);
        setTimeout(() => setCopied(c => (c === key ? null : c)), 1500);
    };

    if (status === 'paid') {
        return (
            <ResultCard
                icon={<Heart className="w-10 h-10 text-white" fill="currentColor" />}
                title={t.pay_paid_title}
                text={t.pay_paid_desc.replace('{amount}', String(payment.amount))}
                action={t.pay_done}
                onAction={() => onClose(true)}
            />
        );
    }
    if (status === 'expired' || status === 'failed') {
        return (
            <ResultCard
                muted
                icon={<X className="w-10 h-10 text-white" />}
                title={status === 'expired' ? t.pay_expired : t.pay_failed}
                action={t.pay_retry}
                onAction={() => onClose(false)}
            />
        );
    }

    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    const networkName = network ? `${network.label} (${network.tag})` : payment.network;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
                    {status === 'paying' ? t.pay_confirming : t.pay_waiting}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] text-[var(--muted)] tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {mm}:{ss}
                </span>
            </div>

            {payment.qrCode && (
                <div className="flex justify-center">
                    <div className="p-3 rounded-[22px] bg-white shadow-lg">
                        <img src={payment.qrCode} alt="Payment QR code" className="w-48 h-48" />
                    </div>
                </div>
            )}

            <div className={CARD}>
                <CopyRow
                    label={t.pay_send_exactly}
                    value={`${payment.payAmount} ${payment.payCurrency}`}
                    onCopy={() => copy('amount', String(payment.payAmount))}
                    copied={copied === 'amount'}
                    big
                />
                <CopyRow
                    label={t.pay_to_address}
                    value={payment.address}
                    onCopy={() => copy('address', payment.address)}
                    copied={copied === 'address'}
                    mono
                />
                {payment.memo && (
                    <CopyRow
                        label={t.pay_memo}
                        value={payment.memo}
                        onCopy={() => copy('memo', payment.memo)}
                        copied={copied === 'memo'}
                        mono
                    />
                )}
                <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-[13px] text-[var(--muted)]">{t.donate_network}</span>
                    <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                        {network && <NetworkLogo logo={network.logo} small />}
                        {networkName}
                    </span>
                </div>
            </div>

            <div className="flex gap-2.5 px-1 text-[13px] leading-snug text-[#ff9500]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t.pay_warning.replace('{network}', networkName)}</span>
            </div>

            <button
                type="button"
                onClick={() => onClose(false)}
                className={`${CARD} w-full h-[50px] text-[17px] text-[var(--primary)] active:bg-[var(--cell-pressed)] transition-colors`}
            >
                {t.pay_cancel}
            </button>
        </div>
    );
}

function CopyRow({ label, value, onCopy, copied, big, mono }: {
    label: string; value: string; onCopy: () => void; copied: boolean; big?: boolean; mono?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            data-haptic="none"
            onClick={onCopy}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 ${SEP} active:bg-[var(--cell-pressed)] transition-colors duration-75`}
        >
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-[var(--muted)]">{label}</span>
                <span className={`block mt-0.5 break-all ${big ? 'text-[22px] font-bold tabular-nums' : 'text-[15px]'} ${mono ? 'font-mono' : ''}`}>
                    {value}
                </span>
            </span>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold ${copied ? 'text-[#34c759]' : 'text-[var(--primary)]'}`}>
                {copied ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                {copied && t.copied}
            </span>
        </button>
    );
}

function ResultCard({ icon, title, text, action, onAction, muted }: {
    icon: React.ReactNode; title: string; text?: string; action: string; onAction: () => void; muted?: boolean;
}) {
    return (
        <div className={`${CARD} px-6 py-10 text-center flex flex-col items-center`}>
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="w-20 h-20 rounded-[24px] flex items-center justify-center"
                style={{ background: muted ? '#8e8e93' : `linear-gradient(135deg, ${ACCENT}, #ff6482)` }}
            >
                {icon}
            </motion.div>
            <h2 className="mt-5 text-[22px] font-bold">{title}</h2>
            {text && <p className="mt-1.5 text-[15px] text-[var(--muted)]">{text}</p>}
            <button
                type="button"
                onClick={onAction}
                className="mt-6 px-8 h-[48px] rounded-full text-white text-[17px] font-semibold active:scale-95 transition-transform"
                style={{ backgroundColor: muted ? 'var(--primary)' : ACCENT }}
            >
                {action}
            </button>
        </div>
    );
}

/* ---------- donation wall ---------- */

function DonationWall({ wall, lang }: { wall: Wall | null; lang: string }) {
    const { t } = useTranslation();
    const [now] = useState(() => Date.now());
    const rel = useMemo(() => {
        try {
            return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        } catch {
            return null;
        }
    }, [lang]);

    const ago = (iso: string) => {
        const diff = (new Date(iso).getTime() - now) / 1000;
        const units: [Intl.RelativeTimeFormatUnit, number][] = [
            ['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60],
        ];
        for (const [unit, secs] of units) {
            if (Math.abs(diff) >= secs) return rel?.format(Math.round(diff / secs), unit) ?? '';
        }
        return rel?.format(0, 'minute') ?? '';
    };

    if (!wall) return null;

    return (
        <section>
            <SectionLabel>{t.donate_wall}</SectionLabel>
            <div className={CARD}>
                {wall.entries.length === 0 ? (
                    <p className="py-6 text-center text-[15px] text-[var(--muted)]">{t.donate_wall_empty}</p>
                ) : (
                    wall.entries.map((e, i) => {
                        const name = e.anonymous ? t.anonymous : e.name || (e.username ? `@${e.username}` : t.anonymous);
                        return (
                            <motion.div
                                key={e.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                className="flex items-center"
                            >
                                <div className="ml-4 w-10 h-10 rounded-full overflow-hidden shrink-0">
                                    {e.anonymous ? (
                                        <div className="w-full h-full bg-[var(--fill)] flex items-center justify-center text-[var(--muted)]">
                                            <UserRound className="w-5 h-5" />
                                        </div>
                                    ) : e.photoUrl ? (
                                        <img src={e.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-b from-[#a1a1a6] to-[#86868b]">
                                            {(name[0] || '?').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 min-w-0 ml-3 pr-4 py-2.5 flex items-center gap-2 ${i < wall.entries.length - 1 ? SEP : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[17px] truncate">{name}</p>
                                        <p className="text-[13px] text-[var(--muted)] truncate">{ago(e.paidAt)}</p>
                                    </div>
                                    <span className="text-[16px] font-bold tabular-nums shrink-0" style={{ color: ACCENT }}>
                                        +{Number(e.amount.toFixed(2))} <span className="text-[12px] font-semibold">USDT</span>
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

/* ---------- small pieces ---------- */

function compact(n: number, lang: string) {
    try {
        return new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    } catch {
        return String(n);
    }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="px-4 pb-1.5 text-[13px] uppercase text-[var(--muted)]">{children}</p>;
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
    return (
        <div className={`py-3.5 flex flex-col items-center gap-1 ${border ? 'border-l-[0.5px] border-[var(--separator)]' : ''}`}>
            <span className="text-[20px] font-bold leading-none tabular-nums">{value}</span>
            <span className="text-[12px] text-[var(--muted)]">{label}</span>
        </div>
    );
}

/** Chain logo with a small USDT badge in the corner. */
function NetworkLogo({ logo, className = '', small }: { logo: string; className?: string; small?: boolean }) {
    const size = small ? 'w-5 h-5' : 'w-8 h-8';
    return (
        <span className={`relative ${size} shrink-0 ${className}`}>
            <img src={logo} alt="" className="w-full h-full" />
            {!small && (
                <img src="/networks/usdt.svg" alt="" className="absolute -bottom-0.5 -right-1 w-[15px] h-[15px] rounded-full ring-2 ring-[var(--cell)]" />
            )}
        </span>
    );
}
