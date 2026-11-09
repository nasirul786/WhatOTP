'use client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Drawer from '@/components/Drawer';
import DrawerHeader from '@/components/DrawerHeader';
import PinPad from '@/components/PinPad';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { postAuth } from '@/lib/api';
import emailAnim from '@/public/lotties/email.json';
import { haptic } from '@/lib/haptics';

export type EmailStep = 'input' | 'otp';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    /** Step is controlled by the parent so its Back button can step backwards. */
    step: EmailStep;
    onStepChange: (step: EmailStep) => void;
}

/** Bind an email address: enter address, then verify the 6-digit code sent to it. */
export default function EmailDrawer({ isOpen, onClose, onVerified, step, onStepChange }: Props) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [address, setAddress] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAddress('');
            setOtp('');
            setError('');
            onStepChange('input');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const requestOtp = async () => {
        if (!address || !address.includes('@')) {
            setError(t.invalid_email);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await postAuth('/api/auth/email/request-otp', webApp?.initData, { email: address });
            if (res.ok) {
                onStepChange('otp');
                webApp?.showAlert(t.otp_sent);
            } else {
                const data = await res.json();
                setError(
                    data.error === 'EMAIL_ALREADY_USED' ? t.email_already_used
                        : data.error === 'EMAIL_ALREADY_BOUND' ? t.email_already_bound
                            : data.error || t.error_send_otp
                );
            }
        } catch {
            setError(t.error_network);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (code: string) => {
        setLoading(true);
        try {
            const res = await postAuth('/api/auth/email/verify-otp', webApp?.initData, { otp: code });
            if (res.ok) {
                onVerified();
                onClose();
                webApp?.showAlert(t.email_verified);
                haptic.notify('success');
            } else {
                const data = await res.json();
                setError(data.error || t.error_invalid_otp);
                haptic.notify('error');
                setTimeout(() => setOtp(''), 1000);
            }
        } catch {
            setError(t.error_verification);
        } finally {
            setLoading(false);
        }
    };

    const onPress = (digit: string) => {
        setError('');
        if (otp.length >= 6) return;
        setOtp(otp + digit);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="px-6 py-6 pb-6 flex flex-col items-center min-h-full">
                <DrawerHeader
                    animation={emailAnim}
                    title={step === 'input' ? t.setup_email : t.enter_otp}
                    hint={step === 'input' ? t.email_hint : t.otp_hint}
                    error={error}
                />

                {step === 'input' ? (
                    <div className="w-full space-y-4">
                        <input
                            type="email"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t.email_placeholder}
                            className="w-full p-4 rounded-xl bg-[var(--input-bg)] border border-transparent focus:border-[var(--primary)] outline-none text-center text-lg transition-all"
                            autoFocus
                        />
                        <button
                            onClick={requestOtp}
                            disabled={loading || !address}
                            className="w-full py-3.5 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] font-semibold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : t.verify}
                        </button>
                    </div>
                ) : (
                    <>
                        <PinPad value={otp} onPress={onPress} onComplete={verifyOtp} busy={loading} onDelete={() => { setError(''); setOtp(p => p.slice(0, -1)); }} className="mb-10" />
                        <button
                            onClick={() => onStepChange('input')}
                            className="mt-8 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                            {t.change_email}
                        </button>
                    </>
                )}
            </div>
        </Drawer>
    );
}
