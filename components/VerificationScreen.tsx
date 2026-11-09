'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import { ScanFace, KeyRound, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import ActionSheet from '@/components/ActionSheet';
import shieldAnimation from '@/public/lotties/shield.json';

interface VerificationScreenProps {
    onVerifyBiometric: () => void;
    onVerifyPasscode: () => void;
    onRemoveAuth: () => void;
    /** Called after the user confirms in the action sheet. */
    onDeleteAccount: () => void;
    hasBiometric: boolean;
    hasPasscode: boolean;
    hasEmail: boolean;
    isLoading: boolean;
    isDeleteLoading?: boolean;
}

const BUTTON = 'w-full h-[52px] rounded-[14px] text-[17px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] active:opacity-80 transition-all';
const LINK = 'h-11 px-2 text-[15px] font-medium flex items-center justify-center gap-2 active:opacity-60 transition-opacity disabled:opacity-50';

export default function VerificationScreen({
    onVerifyBiometric, onVerifyPasscode, onRemoveAuth, onDeleteAccount,
    hasBiometric, hasPasscode, hasEmail, isLoading = false, isDeleteLoading = false,
}: VerificationScreenProps) {
    const { t } = useTranslation();
    const [sheet, setSheet] = useState<'recovery' | 'delete' | null>(null);
    const busy = isLoading || isDeleteLoading;

    // Prompt for biometrics as soon as the screen opens, like an iOS app does with Face ID.
    const prompted = useRef(false);
    useEffect(() => {
        if (hasBiometric && !prompted.current) {
            prompted.current = true;
            onVerifyBiometric();
        }
    }, [hasBiometric, onVerifyBiometric]);

    return (
        <main className="min-h-app flex flex-col px-6 bg-[var(--background)] text-[var(--foreground)]">
            {/* Hero */}
            <motion.div
                className="flex-1 flex flex-col items-center justify-center text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
            >
                <div className="w-36 h-36">
                    <Lottie autoplay src={shieldAnimation} loop={true} />
                </div>
                <h1 className="mt-6 text-[28px] leading-tight font-bold tracking-tight">{t.verify_required}</h1>
                <p className="mt-2 text-[15px] leading-snug text-[var(--muted)] max-w-[280px]">{t.verify_subtitle}</p>
            </motion.div>

            {/* Actions, anchored to the bottom for thumb reach */}
            <motion.div
                className="w-full max-w-sm mx-auto pb-4 space-y-3"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
            >
                {hasBiometric && (
                    <button onClick={onVerifyBiometric} className={`${BUTTON} bg-[var(--primary)] text-[var(--primary-fg)]`}>
                        <ScanFace size={22} strokeWidth={2} />
                        {hasPasscode ? t.use_biometric : t.verify_passkey}
                    </button>
                )}

                {hasPasscode && (
                    <button
                        onClick={onVerifyPasscode}
                        className={`${BUTTON} ${hasBiometric
                            ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
                            : 'bg-[var(--primary)] text-[var(--primary-fg)]'
                            }`}
                    >
                        <KeyRound size={20} strokeWidth={2} />
                        {hasBiometric ? t.use_passcode : t.verify_with_passcode}
                    </button>
                )}

                <button onClick={() => setSheet('recovery')} disabled={busy} className={`${LINK} w-full text-[var(--primary)]`}>
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {t.trouble_signing_in}
                </button>
            </motion.div>

            {/* Recovery options; Delete Account opens a second, destructive confirmation sheet. */}
            <ActionSheet
                isOpen={sheet === 'recovery'}
                onClose={() => setSheet(null)}
                title={t.trouble_signing_in}
                message={hasEmail ? t.recovery_hint : undefined}
                cancelText={t.cancel}
                actions={[
                    ...(hasEmail ? [{ label: t.remove_auth, onClick: onRemoveAuth }] : []),
                    { label: t.delete_account_btn, onClick: () => setSheet('delete'), destructive: true },
                ]}
            />
            <ActionSheet
                isOpen={sheet === 'delete'}
                onClose={() => setSheet(null)}
                title={t.delete_account_btn}
                message={t.delete_account_confirm}
                cancelText={t.cancel}
                actions={[{ label: t.delete_account_btn, onClick: onDeleteAccount, destructive: true }]}
            />
        </main>
    );
}
