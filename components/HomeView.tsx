'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import { Plus, Search, Settings, XCircle } from 'lucide-react';
import { useTelegram } from '@/components/TelegramProvider';
import AccountRow, { Account } from '@/components/AccountRow';
import ActionSheet from '@/components/ActionSheet';
import Toast from '@/components/Toast';
import { useTranslation } from '@/lib/useTranslation';
import { usePageBackground } from '@/lib/usePageBackground';
import noAccountsAnim from '@/public/lotties/no-accounts.json';
import { haptic } from '@/lib/haptics';

interface HomeViewProps {
    accounts: Account[];
    onScan: () => void;
    onAddManual: () => void;
    onEdit: (account: Account) => void;
    onDelete: (id: number) => void;
    onSettings: () => void;
}

function ToolbarButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-9 h-9 rounded-full bg-[var(--fill)] text-[var(--primary)] flex items-center justify-center active:opacity-50 transition-opacity"
        >
            {children}
        </button>
    );
}

/** Main list of codes, styled like an iOS grouped list with a large title and search. */
export default function HomeView({ accounts, onScan, onAddManual, onEdit, onDelete, onSettings }: HomeViewProps) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    usePageBackground(webApp, 'var(--grouped-bg)');
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter(a =>
            a.service_name.toLowerCase().includes(q) || (a.issuer || '').toLowerCase().includes(q)
        );
    }, [accounts, query]);

    const copy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            // Clipboard can be blocked in some webviews; the code is still visible on screen.
            return;
        }
        haptic.notify('success');
        setToast(t.copied);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 1500);
    };

    const openAddSheet = () => {
        setIsAddSheetOpen(true);
    };

    return (
        <main className="min-h-app flex flex-col bg-[var(--grouped-bg)] text-[var(--foreground)] px-4 pb-10">
            {/* Large title with the toolbar buttons on the same line */}
            <div className="flex items-center justify-between gap-3 pt-3 pb-3">
                <h1 className="px-1 text-[34px] leading-tight font-bold tracking-tight truncate">WhatOTP</h1>
                <div className="flex items-center gap-2 shrink-0">
                    <ToolbarButton onClick={onSettings} label={t.settings}>
                        <Settings size={19} strokeWidth={2.25} />
                    </ToolbarButton>
                    <ToolbarButton onClick={openAddSheet} label={t.new_entry}>
                        <Plus size={21} strokeWidth={2.5} />
                    </ToolbarButton>
                </div>
            </div>

            {accounts.length === 0 ? (
                <motion.div
                    className="flex-1 flex flex-col items-center justify-center text-center pb-16"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="w-40 h-40">
                        <Lottie autoplay src={noAccountsAnim} loop={true} />
                    </div>
                    <h2 className="mt-4 text-[22px] font-bold tracking-tight">{t.no_accounts}</h2>
                    <p className="mt-1.5 text-[15px] text-[var(--muted)] max-w-[260px]">{t.add_first}</p>
                    <button
                        onClick={openAddSheet}
                        className="mt-6 h-11 px-5 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] text-[17px] font-semibold flex items-center gap-1.5 active:opacity-60 transition-opacity"
                    >
                        <Plus size={20} strokeWidth={2.5} />
                        {t.add_account}
                    </button>
                </motion.div>
            ) : (
                <>
                    {/* Search */}
                    <div className="mb-5 flex items-center gap-1.5 h-9 px-2 rounded-[10px] bg-[var(--fill)]">
                        <Search size={17} className="text-[var(--muted)] shrink-0" />
                        <input
                            type="text"
                            inputMode="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t.search}
                            className="flex-1 min-w-0 bg-transparent outline-none text-[17px] placeholder:text-[var(--muted)]"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} aria-label={t.cancel} className="text-[var(--muted)]">
                                <XCircle size={17} fill="currentColor" stroke="var(--cell)" />
                            </button>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <p className="text-center text-[17px] text-[var(--muted)] pt-16">{t.no_results}</p>
                    ) : (
                        <>
                            <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden [&>*:last-child_.cell-body]:border-b-0">
                                {filtered.map(acc => (
                                    <AccountRow
                                        key={acc.id}
                                        account={acc}
                                        isOpen={openId === acc.id}
                                        onOpenChange={open => setOpenId(open ? acc.id : (openId === acc.id ? null : openId))}
                                        onCopy={code => {
                                            if (openId !== null) setOpenId(null);
                                            else copy(code);
                                        }}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                            <p className="px-4 pt-1.5 text-[13px] leading-snug text-[var(--muted)]">{t.list_hint}</p>
                        </>
                    )}
                </>
            )}

            <ActionSheet
                isOpen={isAddSheetOpen}
                onClose={() => setIsAddSheetOpen(false)}
                title={t.new_entry}
                cancelText={t.cancel}
                actions={[
                    { label: t.scan_qr, onClick: onScan },
                    { label: t.enter_manually, onClick: onAddManual },
                ]}
            />
            <Toast message={toast} />
        </main>
    );
}
