'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import QRCode from 'qrcode';
import Drawer from '@/components/Drawer';
import BrandIcon from '@/components/BrandIcon';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { encodeMigrationUrl } from '@/lib/migration';

export type ExportStep = 'select' | 'qr';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    accounts: any[];
    /** Step is controlled by the parent so its Back button can step backwards. */
    step: ExportStep;
    onStepChange: (step: ExportStep) => void;
}

/** Pick accounts, then show a Google Authenticator migration QR for them. */
export default function ExportDrawer({ isOpen, onClose, accounts, step, onStepChange }: Props) {
    const webApp = useTelegram();
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [qr, setQr] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelected(new Set(accounts.map(a => a.id)));
            setQr('');
            onStepChange('select');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, accounts]);

    const toggle = (id: number) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleAll = () =>
        setSelected(selected.size === accounts.length ? new Set() : new Set(accounts.map(a => a.id)));

    const generate = async () => {
        if (selected.size === 0) {
            webApp?.showAlert(t.no_accounts_selected);
            return;
        }
        try {
            const uri = encodeMigrationUrl(accounts.filter(a => selected.has(a.id)));
            setQr(await QRCode.toDataURL(uri, { margin: 2, scale: 8 }));
            onStepChange('qr');
        } catch (e) {
            console.error(e);
            webApp?.showAlert('Error generating QR');
        }
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="px-6 py-6 flex flex-col h-full">
                {step === 'select' ? (
                    <>
                        <h2 className="text-xl font-bold mb-6 text-center">{t.export_select_title}</h2>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-[var(--muted)]">{selected.size} {t.selected_count}</span>
                            <button data-haptic="selection" onClick={toggleAll} className="text-sm text-[var(--primary)] font-medium">
                                {selected.size === accounts.length ? t.deselect_all : t.select_all}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                            {accounts.map(acc => (
                                <button data-haptic="selection"
                                    key={acc.id}
                                    onClick={() => toggle(acc.id)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--input-bg)] border border-transparent active:scale-[0.99] transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <BrandIcon slug={acc.slug} hex={acc.hex} name={acc.service_name} textSize="text-sm" />
                                        <div className="text-left min-w-0">
                                            <div className="font-semibold text-sm truncate">{acc.service_name}</div>
                                            <div className="text-xs text-[var(--muted)] truncate">{acc.issuer || 'Account'}</div>
                                        </div>
                                    </div>
                                    <div className={`text-[var(--primary)] shrink-0 pl-2 ${selected.has(acc.id) ? 'opacity-100' : 'opacity-20'}`}>
                                        {selected.has(acc.id) ? <CheckCircle size={24} /> : <Circle size={24} />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={generate}
                                className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] font-bold shadow-lg active:scale-95 transition-all"
                            >
                                {t.export_btn} ({selected.size})
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 space-y-8">
                        <div className="bg-white p-4 rounded-3xl shadow-xl">
                            {qr && <img src={qr} className="w-64 h-64 object-contain" alt="Export QR" />}
                        </div>
                        <p className="text-center text-[var(--muted)] text-sm max-w-xs whitespace-pre-wrap">
                            {t.export_qr_hint || "Scan with Google Authenticator to import.\n⚠️ Do not save or share this QR code."}
                        </p>
                    </div>
                )}
            </div>
        </Drawer>
    );
}
