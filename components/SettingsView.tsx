'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Heart, Globe, Moon, Sun, SunMoon, Palette, Vibrate, ScanFace, Lock, Mail, Send, Hand, Info, ArrowUpFromLine, ArrowDownToLine, Loader2 } from 'lucide-react';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { api, postAuth } from '@/lib/api';
import { confirmPopup, openExternal } from '@/lib/telegram';
import { usePageBackground } from '@/lib/usePageBackground';
import { GITHUB_URL } from '@/lib/links';
import { haptic, isHapticsEnabled, setHapticsEnabled } from '@/lib/haptics';
import { decodeMigrationUrl } from '@/lib/migration';
import Drawer from '@/components/Drawer';
import LanguageSelector from '@/components/LanguageSelector';
import { SettingsGroup, SettingsRow, Toggle, IOS } from '@/components/SettingsRow';
import SelectMenu from '@/components/SelectMenu';
import DonateDrawer from '@/components/DonateDrawer';
import { siGithub } from 'simple-icons';
import PasscodeSetupDrawer from '@/components/PasscodeSetupDrawer';
import EmailDrawer, { EmailStep } from '@/components/EmailDrawer';
import ExportDrawer, { ExportStep } from '@/components/ExportDrawer';

export interface SecurityState {
    passkey: boolean;
    passcode: boolean;
    email: boolean;
}

interface SettingsViewProps {
    security: SecurityState;
    onSecurityChange: (patch: Partial<SecurityState>) => void;
    onBack: () => void;
}

type DrawerName = 'language' | 'passcode' | 'email' | 'export' | 'donate' | null;

/** GitHub mark (simple-icons). */
function GithubIcon() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden>
            <path d={siGithub.path} />
        </svg>
    );
}

export default function SettingsView({ security, onSecurityChange, onBack }: SettingsViewProps) {
    const webApp = useTelegram();
    const { t, lang, setLanguage } = useTranslation();
    const { theme, setTheme } = useTheme();

    const [drawer, setDrawer] = useState<DrawerName>(null);
    const [emailStep, setEmailStep] = useState<EmailStep>('input');
    const [exportStep, setExportStep] = useState<ExportStep>('select');
    const [exportAccounts, setExportAccounts] = useState<any[]>([]);
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [langName, setLangName] = useState(lang.toUpperCase());
    const [hapticsOn, setHapticsOn] = useState(true);

    useEffect(() => setHapticsOn(isHapticsEnabled()), []);

    const toggleHaptics = () => {
        const next = !hapticsOn;
        setHapticsEnabled(next);
        setHapticsOn(next);
        // The switch already ticks before the change (felt when turning off); add one when turning on.
        if (next) haptic.selection();
    };

    const closeDrawer = () => setDrawer(null);
    const initData = webApp?.initData;

    useEffect(() => setMounted(true), []);

    // Settings uses the iOS grouped grey backdrop; match Telegram's header/status bar to it while open.
    usePageBackground(webApp, 'var(--grouped-bg)');

    useEffect(() => {
        fetch('/api/languages')
            .then(res => res.json())
            .then(data => {
                const match = Array.isArray(data) && data.find((l: any) => l.code === lang);
                if (match) setLangName(match.name);
            })
            .catch(() => { });
    }, [lang]);

    // Telegram back button: step back through open drawers, then leave settings.
    useEffect(() => {
        const bb = webApp?.BackButton;
        if (!bb) return;
        const handleBack = () => {
            if (drawer === 'email' && emailStep === 'otp') setEmailStep('input');
            else if (drawer === 'export' && exportStep === 'qr') setExportStep('select');
            else if (drawer) setDrawer(null);
            else onBack();
        };
        bb.show();
        bb.onClick(handleBack);
        return () => bb.offClick(handleBack);
    }, [webApp, drawer, emailStep, exportStep, onBack]);

    const handleLanguageSelect = (code: string) => {
        setLanguage(code);
        if (initData) {
            api('/api/user/language', initData, { body: { language_code: code, initData } }).catch(console.error);
        }
        closeDrawer();
    };

    // --- Security ---
    const onPasskeyClick = () => {
        if (!initData) return;
        if (security.passkey) {
            confirmPopup(webApp, {
                title: t.remove_passkey, message: t.remove_biometric_confirm, cancelText: t.cancel, confirmText: t.delete,
            }, async () => {
                setIsPasskeyLoading(true);
                try {
                    const res = await postAuth('/api/auth/biometrics', initData, { action: 'disable' });
                    if (res.ok) {
                        onSecurityChange({ passkey: false });
                        webApp.showAlert('Biometric removed');
                    } else {
                        webApp.showAlert('Failed to remove');
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsPasskeyLoading(false);
                }
            });
            return;
        }

        const bm = webApp.BiometricManager;
        if (!bm) {
            webApp.showAlert('Biometrics not supported in this client version.');
            return;
        }

        const setup = async () => {
            setIsPasskeyLoading(true);
            try {
                if (!bm.isBiometricAvailable) {
                    webApp.showAlert('Biometrics not available on this device.');
                    return;
                }
                if (!bm.isAccessGranted) {
                    const granted = await new Promise(resolve => bm.requestAccess({ reason: 'Protect your 2FA codes' }, resolve));
                    if (!granted) {
                        webApp.showAlert('Biometric access denied.');
                        return;
                    }
                }
                const ok = await new Promise<boolean>(resolve =>
                    bm.authenticate({ reason: 'Setup security' }, (success: boolean) => resolve(success))
                );
                if (!ok) {
                    webApp.showAlert('Biometric authentication failed.');
                    return;
                }

                const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
                if (!bm.updateBiometricToken(token)) {
                    webApp.showAlert('Failed to update biometric token on device.');
                    return;
                }

                const res = await postAuth('/api/auth/biometrics', initData, {
                    action: 'enable', token, deviceId: bm.deviceId || 'unknown',
                });
                if (res.ok) {
                    onSecurityChange({ passkey: true });
                    webApp.showAlert(t.passkey_added);
                } else {
                    webApp.showAlert(t.passkey_failed);
                }
            } catch (e: any) {
                console.error(e);
                webApp.showAlert('Error: ' + e.message);
            } finally {
                setIsPasskeyLoading(false);
            }
        };

        if (!bm.isInited) bm.init(setup);
        else setup();
    };

    const onPasscodeClick = () => {
        if (!security.passcode) {
            setDrawer('passcode');
            return;
        }
        confirmPopup(webApp, {
            title: t.remove_passcode, message: t.remove_passcode_confirm, cancelText: t.cancel, confirmText: t.delete,
        }, async () => {
            try {
                const res = await postAuth('/api/auth/passcode', initData, { action: 'remove' });
                if (res.ok) {
                    onSecurityChange({ passcode: false });
                    webApp?.showAlert(t.passcode_removed);
                }
            } catch (e) {
                console.error(e);
            }
        });
    };

    const onEmailClick = () => {
        if (!security.email) {
            setDrawer('email');
            return;
        }
        confirmPopup(webApp, {
            title: t.change_email, message: t.email_change_confirm, cancelText: t.cancel, confirmText: t.change_email,
        }, () => setDrawer('email'));
    };

    // --- Transfer ---
    const onExportClick = async () => {
        if (!initData) return;
        try {
            const res = await api('/api/accounts', initData);
            if (res.ok) {
                setExportAccounts((await res.json()).accounts);
                setDrawer('export');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const importMigration = async (data: string) => {
        if (!data.startsWith('otpauth-migration://')) {
            webApp?.showAlert(t.invalid_qr);
            return;
        }
        try {
            setIsImportLoading(true);
            const accounts = decodeMigrationUrl(data);
            for (const acc of accounts) {
                await api('/api/accounts', initData, {
                    body: {
                        service_name: acc.service_name,
                        secret: acc.secret,
                        issuer: acc.issuer,
                        slug: 'Googleauthenticator',
                        hex: '#4285F4',
                    },
                });
            }
            webApp?.showAlert(t.import_success + ` (${accounts.length})`);
        } catch (e) {
            console.error(e);
            webApp?.showAlert(t.import_failed);
        } finally {
            setIsImportLoading(false);
        }
    };

    const onImportClick = () => {
        webApp?.showPopup({
            title: t.import_confirm_title,
            message: t.import_confirm_msg,
            buttons: [
                { type: 'default', id: 'cancel', text: t.cancel },
                { type: 'default', id: 'scan', text: t.scan_qr_btn || 'Scan QR' },
            ],
        }, (btnId: string) => {
            if (btnId !== 'scan') return;
            webApp?.showScanQrPopup({ text: t.scan_import_qr }, (data: string) => {
                if (!data) return;
                webApp?.closeScanQrPopup();
                importMigration(data);
            });
        });
    };

    const selectTheme = (id: 'system' | 'light' | 'dark') => {
        setTheme(id);
        if (initData) {
            api('/api/user/theme', initData, { body: { theme: id, initData } }).catch(console.error);
        }
    };
    const user = webApp?.initDataUnsafe?.user;
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    const ICON = { size: 18, strokeWidth: 2.25 } as const;

    return (
        <main className="min-h-app bg-[var(--grouped-bg)] text-[var(--foreground)] px-4 pb-10">
            <h1 className="px-1 pt-3 pb-4 text-[34px] leading-tight font-bold tracking-tight">{t.settings}</h1>

            <div className="space-y-8">
                {/* Profile card, like the Apple ID cell */}
                {user && (
                    <div className="bg-[var(--cell)] rounded-[10px] flex items-center gap-3.5 px-4 py-3">
                        {user.photo_url ? (
                            <img src={user.photo_url} alt="" className="w-[60px] h-[60px] rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center text-white text-2xl font-semibold bg-gradient-to-b from-[#a1a1a6] to-[#86868b]">
                                {(user.first_name?.[0] || '?').toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-[20px] font-semibold leading-tight truncate">{fullName}</div>
                            {user.username && (
                                <div className="text-[15px] text-[var(--muted)] truncate mt-0.5">@{user.username}</div>
                            )}
                        </div>
                    </div>
                )}

                <SettingsGroup header={t.general}>
                    <SettingsRow
                        icon={<Globe {...ICON} />} color={IOS.blue} label={t.language}
                        value={langName}
                        onClick={() => setDrawer('language')}
                    />
                    <SettingsRow
                        icon={<Palette {...ICON} />} color={IOS.indigo} label={t.theme}
                        value={mounted && (
                            <SelectMenu
                                label={t.theme}
                                value={theme as 'system' | 'light' | 'dark' | undefined}
                                onChange={selectTheme}
                                options={[
                                    { value: 'system', label: t.theme_system, icon: <SunMoon size={20} /> },
                                    { value: 'light', label: t.theme_light, icon: <Sun size={20} /> },
                                    { value: 'dark', label: t.theme_dark, icon: <Moon size={20} /> },
                                ]}
                            />
                        )}
                    />
                    <SettingsRow
                        icon={<Vibrate {...ICON} />} color={IOS.pink} label={t.haptic_feedback}
                        value={<Toggle label={t.haptic_feedback} checked={hapticsOn} onChange={toggleHaptics} />}
                    />
                </SettingsGroup>

                <SettingsGroup header={t.security}>
                    <SettingsRow
                        icon={<ScanFace {...ICON} />} color={IOS.green} label={t.passkey}
                        value={<Toggle label={t.passkey} checked={security.passkey} loading={isPasskeyLoading} onChange={onPasskeyClick} />}
                    />
                    <SettingsRow
                        icon={<Lock {...ICON} />} color={IOS.red} label={t.passcode}
                        value={<Toggle label={t.passcode} checked={security.passcode} onChange={onPasscodeClick} />}
                    />
                    <SettingsRow
                        icon={<Mail {...ICON} />} color={IOS.blue} label={t.email}
                        value={security.email ? t.status_on : t.setup_email}
                        onClick={onEmailClick}
                    />
                </SettingsGroup>

                <SettingsGroup header={t.transfer_code} footer={t.transfer_help_msg}>
                    <SettingsRow
                        icon={<ArrowUpFromLine {...ICON} />} color={IOS.teal} label={t.export_code}
                        onClick={onExportClick}
                    />
                    <SettingsRow
                        icon={<ArrowDownToLine {...ICON} />} color={IOS.orange} label={t.import_code}
                        value={isImportLoading ? <Loader2 size={20} className="animate-spin" /> : undefined}
                        onClick={isImportLoading ? undefined : onImportClick}
                        chevron
                    />
                </SettingsGroup>

                <SettingsGroup header={t.support} footer={t.support_footer}>
                    <SettingsRow
                        icon={<Heart {...ICON} fill="currentColor" />} color={IOS.pink} label={t.donate}
                        onClick={() => setDrawer('donate')}
                    />
                    <SettingsRow
                        icon={<GithubIcon />} color="#24292f" label={t.github}
                        value={t.github_star}
                        onClick={() => openExternal(webApp, GITHUB_URL)}
                    />
                </SettingsGroup>

                <SettingsGroup header={t.about_title}>
                    <SettingsRow
                        icon={<Send {...ICON} />} color={IOS.telegram} label={t.developer_channel}
                        onClick={() => openExternal(webApp, 'https://t.me/bottercc')}
                    />
                    <SettingsRow
                        icon={<Hand {...ICON} />} color={IOS.blue} label={t.privacy_policy}
                        onClick={() => openExternal(webApp, window.location.origin + '/privacy')}
                    />
                    <SettingsRow
                        icon={<Info {...ICON} />} color={IOS.gray} label={t.version}
                        value={process.env.NEXT_PUBLIC_APP_VERSION}
                    />
                </SettingsGroup>
            </div>

            <PasscodeSetupDrawer
                isOpen={drawer === 'passcode'}
                onClose={closeDrawer}
                onSaved={() => onSecurityChange({ passcode: true })}
            />
            <EmailDrawer
                isOpen={drawer === 'email'}
                onClose={closeDrawer}
                onVerified={() => onSecurityChange({ email: true })}
                step={emailStep}
                onStepChange={setEmailStep}
            />
            <ExportDrawer
                isOpen={drawer === 'export'}
                onClose={closeDrawer}
                accounts={exportAccounts}
                step={exportStep}
                onStepChange={setExportStep}
            />
            <DonateDrawer isOpen={drawer === 'donate'} onClose={closeDrawer} />
            <Drawer isOpen={drawer === 'language'} onClose={closeDrawer}>
                <LanguageSelector variant="drawer" current={lang} onSelect={handleLanguageSelect} />
            </Drawer>
        </main>
    );
}
