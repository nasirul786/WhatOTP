'use client';
import { useEffect, useState } from 'react';
import Drawer from '@/components/Drawer';
import DrawerHeader from '@/components/DrawerHeader';
import PinPad from '@/components/PinPad';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { postAuth } from '@/lib/api';
import lockAnimation from '@/public/lotties/passcode.json';
import { haptic } from '@/lib/haptics';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

/** Create a 6-digit passcode: enter once, then confirm. */
export default function PasscodeSetupDrawer({ isOpen, onClose, onSaved }: Props) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [pin, setPin] = useState('');
    const [first, setFirst] = useState<string | null>(null);
    const [error, setError] = useState('');
    const confirming = first !== null;

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setFirst(null);
            setError('');
        }
    }, [isOpen]);

    const confirm = async (code: string) => {
        if (code !== first) {
            setError(t.passcode_mismatch);
            haptic.notify('error');
            setTimeout(() => {
                setPin('');
                setFirst(null);
            }, 1000);
            return;
        }
        try {
            const res = await postAuth('/api/auth/passcode', webApp?.initData, { action: 'set', passcode: code });
            if (res.ok) {
                onSaved();
                onClose();
                webApp?.showAlert(t.passcode_set);
                haptic.notify('success');
            } else {
                setError('Error saving');
                haptic.notify('error');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const onPress = (digit: string) => {
        setError('');
        if (pin.length >= 6) return;
        setPin(pin + digit);
    };

    const onComplete = (value: string) => {
        if (confirming) confirm(value);
        else setTimeout(() => { setFirst(value); setPin(''); }, 200);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="px-6 py-6 pb-6 flex flex-col items-center min-h-full">
                <DrawerHeader
                    animation={lockAnimation}
                    size="w-48 h-48"
                    title={confirming ? t.confirm_passcode : t.enter_passcode}
                    hint={confirming ? t.reenter_passcode_hint : t.create_passcode_hint}
                    error={error}
                />
                <PinPad value={pin} onPress={onPress} onComplete={onComplete} onDelete={() => { setError(''); setPin(p => p.slice(0, -1)); }} className="mb-10" />
            </div>
        </Drawer>
    );
}
