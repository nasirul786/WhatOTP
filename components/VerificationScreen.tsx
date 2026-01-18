import React from 'react';
import { useTranslation } from '@/lib/useTranslation';
import Lottie from "lottie-react";
import shieldAnimation from "@/public/lotties/shield.json";
import { Scan, Keyboard } from 'lucide-react';

interface VerificationScreenProps {
    onVerifyBiometric: () => void;
    onVerifyPasscode: () => void;
    onRemoveAuth: () => void;
    onDeleteAccount: () => Promise<void>;
    hasBiometric: boolean;
    hasPasscode: boolean;
    hasEmail: boolean;
    isLoading: boolean;
    isDeleteLoading?: boolean;
}

export default function VerificationScreen({ onVerifyBiometric, onVerifyPasscode, onRemoveAuth, hasBiometric, hasPasscode, hasEmail, isLoading = false, onDeleteAccount, isDeleteLoading = false }: VerificationScreenProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 pb-32 space-y-8">
            <div className="w-48 h-48 mb-4">
                <Lottie animationData={shieldAnimation} loop={true} />
            </div>
            <h2 className="text-2xl font-bold text-center text-[var(--foreground)]">{t.verify_required}</h2>

            <div className="w-full max-w-xs space-y-3">
                {hasBiometric && (
                    <button
                        onClick={onVerifyBiometric}
                        className="w-full py-3 rounded-xl font-medium text-base bg-[var(--primary)] text-[var(--primary-fg)] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Scan size={20} />
                        {hasPasscode ? t.use_biometric : t.verify_passkey}
                    </button>
                )}

                {hasPasscode && (
                    <button
                        onClick={onVerifyPasscode}
                        className={`w-full py-3 rounded-xl font-medium text-base ${!hasBiometric ? 'bg-[var(--primary)] text-[var(--primary-fg)]' : 'bg-[var(--surface)] text-[var(--foreground)]'} shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2`}
                    >
                        <Keyboard size={20} />
                        {hasBiometric ? t.use_passcode : t.verify_with_passcode}
                    </button>
                )}
            </div>

            {hasEmail && (
                <div className="w-full max-w-xs flex flex-col items-center gap-6 mt-2">
                    <div className="w-full h-px bg-[var(--border)]" />
                    <button
                        onClick={onRemoveAuth}
                        disabled={isLoading || isDeleteLoading}
                        className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] active:opacity-70 transition-colors flex items-center gap-2"
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />}
                        {t.remove_auth}
                    </button>

                    <button
                        onClick={onDeleteAccount}
                        disabled={isLoading || isDeleteLoading}
                        className="text-sm font-medium text-red-500 hover:text-red-600 active:opacity-70 transition-colors flex items-center gap-2"
                    >
                        {isDeleteLoading && <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
                        {t.delete_account_btn}
                    </button>
                </div>
            )}
        </div>
    );
}
