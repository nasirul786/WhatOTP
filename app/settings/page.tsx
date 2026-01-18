'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/components/TelegramProvider';
import { useTranslation } from '@/lib/useTranslation';
import { useTheme } from 'next-themes';
import { ChevronRight, Globe, Moon, Shield, Lock, Check, Loader2, Scan, Keyboard, Mail } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import Drawer from '@/components/Drawer';
import Lottie from "lottie-react";
import lockAnimation from "@/public/lotties/passcode.json";
import PasscodeKeypad from '@/components/PasscodeKeypad';
import lightAnim from "@/public/lotties/light.json";
import darkAnim from "@/public/lotties/dark.json";
import systemAnim from "@/public/lotties/system.json";
import emailAnim from "@/public/lotties/email.json";
import { CircleHelp, Download, CheckCircle, Circle, ArrowUp, ArrowDown, Send, FileText, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { encodeMigrationUrl, decodeMigrationUrl } from '@/lib/migration';
import * as simpleIcons from 'simple-icons';

export default function SettingsPage() {
    const router = useRouter();
    const webApp = useTelegram();
    const { t, lang, setLanguage } = useTranslation();
    const { theme, setTheme } = useTheme();

    const [view, setView] = useState<'main' | 'language'>('main');
    const [isLanguageDrawerOpen, setIsLanguageDrawerOpen] = useState(false);
    const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
    const [isPasscodeDrawerOpen, setIsPasscodeDrawerOpen] = useState(false);
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [hasPasskey, setHasPasskey] = useState(false);

    const [hasPasscode, setHasPasscode] = useState(false);
    const [hasEmail, setHasEmail] = useState(false);

    // Email State
    const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false);
    const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
    const [emailAddress, setEmailAddress] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Transfer Code State
    const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
    const [exportStep, setExportStep] = useState<'select' | 'qr'>('select');
    const [exportAccounts, setExportAccounts] = useState<any[]>([]);
    const [selectedExportIds, setSelectedExportIds] = useState<Set<number>>(new Set());
    const [exportQrImage, setExportQrImage] = useState('');
    const [isImportLoading, setIsImportLoading] = useState(false);

    // Help Popup
    const showTransferHelp = () => {
        webApp?.showPopup({
            title: t.transfer_help_title,
            message: t.transfer_help_msg,
            buttons: [{ type: 'ok', id: 'ok' }]
        });
    };

    const handleExportClick = async () => {
        // Fetch accounts
        if (!webApp?.initData) return;
        try {
            const res = await fetch('/api/accounts', {
                headers: { 'Authorization': `Bearer ${webApp.initData}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExportAccounts(data.accounts);
                // Select all by default
                setSelectedExportIds(new Set(data.accounts.map((a: any) => a.id)));
                setExportStep('select');
                setExportQrImage('');
                setIsExportDrawerOpen(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleExportGenerate = async () => {
        if (selectedExportIds.size === 0) {
            webApp?.showAlert(t.no_accounts_selected);
            return;
        }

        const selected = exportAccounts.filter(a => selectedExportIds.has(a.id));
        try {
            const uri = encodeMigrationUrl(selected);
            const qr = await QRCode.toDataURL(uri, { margin: 2, scale: 8 });
            setExportQrImage(qr);
            setExportStep('qr');
        } catch (e) {
            console.error(e);
            webApp?.showAlert("Error generating QR");
        }
    };

    const handleImportClick = () => {
        webApp?.showPopup({
            title: t.import_confirm_title,
            message: t.import_confirm_msg,
            buttons: [
                { type: 'default', id: 'cancel', text: t.cancel },
                { type: 'default', id: 'scan', text: t.scan_qr_btn || "Scan QR" }
            ]
        }, (btnId: string) => {
            if (btnId === 'scan') {
                webApp?.showScanQrPopup({
                    text: t.scan_import_qr
                }, async (data: string) => {
                    // Handle scan
                    if (!data) return;

                    // Close scan popup handled by Telegram? usually yes or manual close
                    webApp?.closeScanQrPopup();

                    if (data.startsWith('otpauth-migration://')) {
                        try {
                            setIsImportLoading(true);
                            const accounts = decodeMigrationUrl(data);
                            let count = 0;
                            for (const acc of accounts) {
                                // Add account
                                await fetch('/api/accounts', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${webApp.initData}`
                                    },
                                    body: JSON.stringify({
                                        service_name: acc.service_name,
                                        secret: acc.secret,
                                        issuer: acc.issuer,
                                        slug: 'Googleauthenticator',
                                        hex: '#4285F4'
                                    })
                                });
                                count++;
                            }
                            webApp?.showAlert(t.import_success + ` (${count})`);
                        } catch (e) {
                            console.error(e);
                            webApp?.showAlert(t.import_failed);
                        } finally {
                            setIsImportLoading(false);
                        }
                    } else {
                        webApp?.showAlert(t.invalid_qr);
                    }
                });
            }
        });
    };

    const toggleExportSelection = (id: number) => {
        const newSet = new Set(selectedExportIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedExportIds(newSet);
    };

    const toggleAllExport = () => {
        if (selectedExportIds.size === exportAccounts.length) {
            setSelectedExportIds(new Set());
        } else {
            setSelectedExportIds(new Set(exportAccounts.map(a => a.id)));
        }
    };
    useEffect(() => {
        setMounted(true);
        // Check status
        if (webApp?.initData) {
            fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: webApp.initData })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.hasPasskey) setHasPasskey(true);
                    if (data.hasPasscode) setHasPasscode(true);
                    if (data.hasEmail) setHasEmail(true);
                })
                .catch(console.error);
        }
    }, [webApp]);

    // Passcode State
    const [passcodeInput, setPasscodeInput] = useState('');
    const [confirmInput, setConfirmInput] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [passcodeError, setPasscodeError] = useState('');

    // Reset passcode state when drawer opens
    useEffect(() => {
        if (isPasscodeDrawerOpen) {
            setPasscodeInput('');
            setConfirmInput('');
            setIsConfirming(false);
            setPasscodeError('');
        }
    }, [isPasscodeDrawerOpen]);

    const handlePasscodeDigit = (digit: string) => {
        setPasscodeError('');
        if (isConfirming) {
            if (confirmInput.length < 6) {
                const newVal = confirmInput + digit;
                setConfirmInput(newVal);
                if (newVal.length === 6) {
                    handlePasscodeComplete(newVal, true);
                }
            }
        } else {
            if (passcodeInput.length < 6) {
                const newVal = passcodeInput + digit;
                setPasscodeInput(newVal);
                if (newVal.length === 6) {
                    if (hasPasscode) {
                        // already set, removal logic handled by button outside
                    } else {
                        setTimeout(() => {
                            setIsConfirming(true);
                            setPasscodeInput(newVal);
                        }, 200);
                    }
                }
            }
        }
    };

    const handlePasscodeDelete = () => {
        setPasscodeError('');
        if (isConfirming) {
            setConfirmInput(prev => prev.slice(0, -1));
        } else {
            setPasscodeInput(prev => prev.slice(0, -1));
        }
    };

    const handlePasscodeComplete = async (code: string, isConfirmation: boolean) => {
        if (isConfirmation) {
            if (code === passcodeInput) {
                // Save
                try {
                    const res = await fetch('/api/auth/passcode', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${webApp?.initData}`
                        },
                        body: JSON.stringify({
                            action: 'set',
                            initData: webApp?.initData,
                            passcode: code
                        })
                    });
                    if (res.ok) {
                        setHasPasscode(true);
                        setIsPasscodeDrawerOpen(false);
                        webApp?.showAlert(t.passcode_set);
                        webApp?.HapticFeedback.notificationOccurred('success');
                    } else {
                        setPasscodeError("Error saving");
                        webApp?.HapticFeedback.notificationOccurred('error');
                    }
                } catch (e) {
                    console.error(e);
                }
            } else {
                setPasscodeError(t.passcode_mismatch);
                webApp?.HapticFeedback.notificationOccurred('error');
                setTimeout(() => {
                    setConfirmInput('');
                    setPasscodeInput('');
                    setIsConfirming(false);
                }, 1000);
            }
        }
    };

    // Email Handlers
    const handleEmailRequestOtp = async () => {
        if (!emailAddress || !emailAddress.includes('@')) {
            setEmailError(t.invalid_email);
            return;
        }

        setEmailLoading(true);
        setEmailError('');

        try {
            const res = await fetch('/api/auth/email/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    email: emailAddress
                })
            });

            if (res.ok) {
                setEmailStep('otp');
                webApp?.showAlert(t.otp_sent);
            } else {
                const text = await res.json();
                if (text.error === 'EMAIL_ALREADY_USED') {
                    setEmailError(t.email_already_used);
                } else if (text.error === 'EMAIL_ALREADY_BOUND') {
                    setEmailError(t.email_already_bound);
                } else {
                    setEmailError(text.error || t.error_send_otp);
                }
            }
        } catch (e) {
            setEmailError(t.error_network);
        } finally {
            setEmailLoading(false);
        }
    };

    const handleEmailVerifyOtp = async (code: string) => {
        setEmailLoading(true);
        try {
            const res = await fetch('/api/auth/email/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    otp: code
                })
            });

            if (res.ok) {
                setHasEmail(true);
                setIsEmailDrawerOpen(false);
                webApp?.showAlert(t.email_verified);
                webApp?.HapticFeedback.notificationOccurred('success');
            } else {
                const text = await res.json();
                setEmailError(text.error || t.error_invalid_otp);
                webApp?.HapticFeedback.notificationOccurred('error');
                // Clear OTP after error
                setTimeout(() => setEmailOtp(''), 1000);
            }
        } catch (e) {
            setEmailError(t.error_verification);
        } finally {
            setEmailLoading(false);
        }
    };

    const handleEmailDigit = (digit: string) => {
        setEmailError('');
        if (emailOtp.length < 6) {
            const newVal = emailOtp + digit;
            setEmailOtp(newVal);
            if (newVal.length === 6) {
                handleEmailVerifyOtp(newVal);
            }
        }
    };

    const handleEmailDelete = () => {
        setEmailError('');
        setEmailOtp(prev => prev.slice(0, -1));
    };

    const onEmailClick = () => {
        if (hasEmail) {
            // Option to change email?
            webApp?.showPopup({
                title: t.change_email,
                message: t.email_change_confirm,
                buttons: [
                    { text: t.cancel, id: 'cancel' },
                    { type: 'destructive', text: t.change_email, id: 'change' }
                ]
            }, (btnId: string) => {
                if (btnId === 'change') {
                    setEmailStep('input');
                    setEmailAddress('');
                    setEmailOtp('');
                    setIsEmailDrawerOpen(true);
                }
            });
        } else {
            setEmailStep('input');
            setEmailAddress('');
            setEmailOtp('');
            setIsEmailDrawerOpen(true);
        }
    };

    const onPasscodeClick = () => {
        if (hasPasscode) {
            webApp?.showPopup({
                title: t.remove_passcode,
                message: t.remove_passcode_confirm,
                buttons: [
                    { text: t.cancel, id: 'cancel' },
                    { type: 'destructive', text: t.delete, id: 'remove' }
                ]
            }, async (btnId: string) => {
                if (btnId === 'remove') {
                    try {
                        const res = await fetch('/api/auth/passcode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'remove',
                                initData: webApp?.initData
                            })
                        });
                        if (res.ok) {
                            setHasPasscode(false);
                            webApp?.showAlert(t.passcode_removed);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
        } else {
            setIsPasscodeDrawerOpen(true);
        }
    };

    const handleSetupPasskey = async () => {
        if (!webApp?.initData) return;

        // If already enabled, confirm removal
        if (hasPasskey) {
            webApp.showPopup({
                title: t.remove_passkey,
                message: t.remove_biometric_confirm,
                buttons: [
                    { text: t.cancel, id: 'cancel' },
                    { type: 'destructive', text: t.delete, id: 'remove' }
                ]
            }, async (btnId: string) => {
                if (btnId === 'remove') {
                    setIsPasskeyLoading(true);
                    try {
                        const res = await fetch('/api/auth/biometrics', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'disable',
                                initData: webApp.initData
                            })
                        });
                        if (res.ok) {
                            setHasPasskey(false);
                            webApp.showAlert("Biometric removed");
                        } else {
                            webApp.showAlert("Failed to remove");
                        }
                    } catch (e) {
                        console.error(e);
                    } finally {
                        setIsPasskeyLoading(false);
                    }
                }
            });
            return;
        }

        const bm = webApp.BiometricManager;

        if (!bm) {
            webApp.showAlert("Biometrics not supported in this client version.");
            return;
        }

        const processBiometricSetup = async () => {
            setIsPasskeyLoading(true);
            try {
                if (!bm.isBiometricAvailable) {
                    webApp.showAlert("Biometrics not available on this device.");
                    return;
                }

                if (!bm.isAccessGranted) {
                    const accessGranted = await new Promise(resolve => bm.requestAccess({ reason: "Protect your 2FA codes" }, resolve));
                    if (!accessGranted) {
                        webApp.showAlert("Biometric access denied.");
                        return;
                    }
                }

                // Authenticate first to verify user presence
                const isAuthenticated = await new Promise<boolean>(resolve =>
                    bm.authenticate({ reason: "Setup security" }, (success: boolean) => resolve(success))
                );

                if (isAuthenticated) {
                    // Generate a new secure token
                    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                        .map(b => b.toString(16).padStart(2, '0')).join('');

                    // Update token in Telegram storage
                    const updated = bm.updateBiometricToken(newToken);
                    if (!updated) {
                        webApp.showAlert("Failed to update biometric token on device.");
                        return;
                    }

                    // Save to backend
                    const res = await fetch('/api/auth/biometrics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'enable',
                            initData: webApp.initData,
                            token: newToken,
                            deviceId: bm.deviceId || 'unknown'
                        })
                    });

                    if (res.ok) {
                        setHasPasskey(true);
                        webApp.showAlert(t.passkey_added);
                    } else {
                        webApp.showAlert(t.passkey_failed);
                    }
                } else {
                    webApp.showAlert("Biometric authentication failed.");
                }

            } catch (e: any) {
                console.error(e);
                webApp.showAlert("Error: " + e.message);
            } finally {
                setIsPasskeyLoading(false);
            }
        };

        if (!bm.isInited) {
            bm.init(() => processBiometricSetup());
        } else {
            processBiometricSetup();
        }
    };

    // For display: current language name
    const [langName, setLangName] = useState(lang.toUpperCase());

    // Fetch language name on mount
    useEffect(() => {
        fetch('/api/languages')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const passed = data.find((l: any) => l.code === lang);
                    if (passed) setLangName(passed.name);
                }
            })
            .catch(() => { });
    }, [lang]);

    // Back Button Management
    useEffect(() => {
        if (typeof window === 'undefined' || !webApp) return;
        const bb = (window as any).Telegram?.WebApp?.BackButton;
        if (!bb) return;

        // Hide back button if on initial language selection
        if (view === 'language') {
            bb.hide();
        } else {
            bb.show();
        }

        const handleBack = () => {
            if (isPasscodeDrawerOpen) {
                setIsPasscodeDrawerOpen(false);
            } else if (isThemeDrawerOpen) {
                setIsThemeDrawerOpen(false);
            } else if (isLanguageDrawerOpen) {
                setIsLanguageDrawerOpen(false);
            } else if (isEmailDrawerOpen) {
                if (emailStep === 'otp') {
                    setEmailStep('input');
                } else {
                    setIsEmailDrawerOpen(false);
                }
            } else if (isExportDrawerOpen) {
                if (exportStep === 'qr') setExportStep('select');
                else setIsExportDrawerOpen(false);
            } else if (view === 'language') {
                // Initial setup, no back
            } else {
                router.back();
            }
        };

        bb.onClick(handleBack);

        return () => {
            bb.offClick(handleBack);
        };
    }, [webApp, router, view, isThemeDrawerOpen, isPasscodeDrawerOpen, isEmailDrawerOpen, emailStep, isLanguageDrawerOpen, isExportDrawerOpen, exportStep]);

    const handleLanguageSelect = (code: string) => {
        setLanguage(code);
        // Persist to backend
        if (webApp?.initData) {
            fetch('/api/user/language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${webApp?.initData}`
                },
                body: JSON.stringify({ language_code: code, initData: webApp?.initData })
            }).catch(console.error);
        }
        setView('main');
    };

    if (view === 'language') {
        return <LanguageSelector onSelect={handleLanguageSelect} />;
    }

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            {/* Header */}
            <div className="px-6 py-6 pb-2">
                <h1 className="text-3xl font-bold tracking-tight">{t.settings}</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* General Section */}
                <section>
                    <h2 className="text-[var(--primary)] text-sm font-semibold uppercase tracking-wider mb-2 px-2">
                        {t.general}
                    </h2>
                    <div className="bg-[var(--surface)] hover:bg-[var(--surface)]/80 transition-colors rounded-xl overflow-hidden shadow-sm border border-[var(--border)]">
                        {/* Language */}
                        <button
                            onClick={() => setIsLanguageDrawerOpen(true)}
                            className="w-full flex items-center justify-between p-4 border-b border-[var(--border)] active:bg-[var(--input-bg)] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Globe size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.language}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                                <span className="text-sm">{langName}</span>
                                <ChevronRight size={20} />
                            </div>
                        </button>

                        {/* Theme */}
                        <button
                            onClick={() => setIsThemeDrawerOpen(true)}
                            className="w-full flex items-center justify-between p-4 active:bg-[var(--input-bg)] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Moon size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.theme}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                                <span className="text-sm capitalize">
                                    {mounted ? (theme === 'system' ? t.theme_system : theme === 'dark' ? t.theme_dark : t.theme_light) : ''}
                                </span>
                                <ChevronRight size={20} />
                            </div>
                        </button>
                    </div>
                </section>

                {/* Security Section */}
                <section>
                    <h2 className="text-[var(--primary)] text-sm font-semibold uppercase tracking-wider mb-2 px-2">
                        {t.security}
                    </h2>
                    <div className="bg-[var(--surface)] hover:bg-[var(--surface)]/80 transition-colors rounded-xl overflow-hidden shadow-sm border border-[var(--border)]">
                        <button
                            onClick={handleSetupPasskey}
                            className="w-full flex items-center justify-between p-4 px-4 bg-transparent border-b border-[var(--border)] active:bg-[var(--input-bg)] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <Shield size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.passkey}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                                {isPasskeyLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    hasPasskey ? <span className="text-sm font-medium text-green-500">{t.status_on}</span> : <span className="text-sm font-medium">{t.status_off}</span>
                                )}
                                <ChevronRight size={20} />
                            </div>
                        </button>

                        <button
                            onClick={onPasscodeClick}
                            className="w-full flex items-center justify-between p-4 px-4 bg-transparent border-b border-[var(--border)] active:bg-[var(--input-bg)] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <Lock size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.passcode}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                                {hasPasscode ? <span className="text-sm font-medium text-green-500">{t.status_on}</span> : <span className="text-sm font-medium">{t.status_off}</span>}
                                <ChevronRight size={20} />
                            </div>
                        </button>
                        <button
                            onClick={onEmailClick}
                            className="w-full flex items-center justify-between p-4 px-4 bg-transparent active:bg-[var(--input-bg)] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Mail size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                                {hasEmail ? <span className="text-sm font-medium text-green-500">{t.status_on}</span> : <span className="text-sm font-medium">{t.setup_email}</span>}
                                <ChevronRight size={20} />
                            </div>
                        </button>
                    </div>
                </section>

                {/* Transfer Code Section */}
                <section>
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-[var(--primary)] text-sm font-semibold uppercase tracking-wider">
                            {t.transfer_code}
                        </h2>
                        <button onClick={showTransferHelp} className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                            <CircleHelp size={18} />
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportClick}
                            className="flex-1 bg-[var(--surface)] hover:bg-[var(--surface)]/80 p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <ArrowUp size={24} />
                            </div>
                            <span className="font-semibold">{t.export_code}</span>
                        </button>

                        <button
                            onClick={handleImportClick}
                            disabled={isImportLoading}
                            className="flex-1 bg-[var(--surface)] hover:bg-[var(--surface)]/80 p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                                {isImportLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowDown size={24} />}
                            </div>
                            <span className="font-semibold">{t.import_code}</span>
                        </button>
                    </div>
                </section>

                {/* About Section */}
                <section>
                    <h2 className="text-[var(--primary)] text-sm font-semibold uppercase tracking-wider mb-2 px-2">
                        {t.about_title}
                    </h2>
                    <div className="bg-[var(--surface)] rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm">
                        <button
                            onClick={() => {
                                const url = 'https://t.me/bottercc';
                                if (webApp?.openLink) {
                                    webApp.openLink(url, { try_instant_view: true });
                                } else {
                                    window.open(url, '_blank');
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 px-4 bg-transparent active:bg-[var(--input-bg)] transition-colors border-b border-[var(--border)] last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Send size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.developer_channel}</span>
                            </div>
                            <ChevronRight size={20} className="text-[var(--muted)]" />
                        </button>

                        <button
                            onClick={() => {
                                const url = window.location.origin + '/privacy';
                                if (webApp?.openLink) {
                                    webApp.openLink(url, { try_instant_view: true });
                                } else {
                                    window.open(url, '_blank');
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 px-4 bg-transparent active:bg-[var(--input-bg)] transition-colors border-b border-[var(--border)] last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <FileText size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.privacy_policy}</span>
                            </div>
                            <ChevronRight size={20} className="text-[var(--muted)]" />
                        </button>

                        <div className="w-full flex items-center justify-between p-4 px-4 bg-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500">
                                    <Info size={18} />
                                </div>
                                <span className="font-medium text-lg">{t.version}</span>
                            </div>
                            <span className="text-[var(--muted)]">1.2.0</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Passcode Drawer */}
            <Drawer isOpen={isPasscodeDrawerOpen} onClose={() => setIsPasscodeDrawerOpen(false)}>
                <div className="px-6 py-6 pb-10 flex flex-col items-center">

                    <div className="w-48 h-48 mb-4">
                        <Lottie animationData={lockAnimation} loop={true} />
                    </div>

                    <h2 className="text-xl font-bold mb-2">{isConfirming ? t.confirm_passcode : t.enter_passcode}</h2>
                    <p className="text-sm text-[var(--muted)] mb-8 h-5">
                        {passcodeError || (isConfirming ? t.reenter_passcode_hint : t.create_passcode_hint)}
                    </p>

                    <div className="flex gap-4 mb-10">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${(isConfirming ? confirmInput.length : passcodeInput.length) > i
                                    ? 'bg-[var(--primary)] scale-110'
                                    : 'bg-[var(--border)]'
                                    }`}
                            />
                        ))}
                    </div>

                    <PasscodeKeypad
                        onPress={handlePasscodeDigit}
                        onDelete={handlePasscodeDelete}
                    />
                </div>
            </Drawer>

            {/* Theme Drawer */}
            <Drawer isOpen={isThemeDrawerOpen} onClose={() => setIsThemeDrawerOpen(false)}>
                <div className="px-6 py-6 pb-12">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-32 h-32 mb-4">
                            <Lottie
                                animationData={
                                    theme === 'dark' ? darkAnim :
                                        theme === 'light' ? lightAnim :
                                            systemAnim
                                }
                                loop={true}
                            />
                        </div>
                        <h2 className="text-xl font-bold text-center">{t.select_theme}</h2>
                    </div>

                    <div className="space-y-3">
                        {[
                            { id: 'light', label: t.theme_light, anim: lightAnim },
                            { id: 'dark', label: t.theme_dark, anim: darkAnim },
                            { id: 'system', label: t.theme_system, anim: systemAnim },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setTheme(item.id);
                                    setIsThemeDrawerOpen(false);
                                    if (webApp?.initData) {
                                        fetch('/api/user/theme', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${webApp?.initData}`
                                            },
                                            body: JSON.stringify({ theme: item.id, initData: webApp?.initData })
                                        }).catch(console.error);
                                    }
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${theme === item.id
                                    ? 'bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)] shadow-md'
                                    : 'bg-[var(--input-bg)] text-[var(--foreground)] border-transparent hover:bg-[var(--surface)]'
                                    }`}
                            >
                                <span className="text-lg font-medium flex items-center gap-3">
                                    <div className="w-8 h-8">
                                        <Lottie animationData={item.anim} loop={true} />
                                    </div>
                                    {item.label}
                                </span>
                                {theme === item.id && <Check size={20} />}
                            </button>
                        ))}
                    </div>
                </div>
            </Drawer>

            {/* Email Drawer */}
            <Drawer isOpen={isEmailDrawerOpen} onClose={() => setIsEmailDrawerOpen(false)}>
                <div className="px-6 py-6 pb-10 flex flex-col items-center min-h-[50vh]">
                    <div className="w-32 h-32 mb-4">
                        <Lottie animationData={emailAnim} loop={true} />
                    </div>

                    <h2 className="text-xl font-bold mb-2">
                        {emailStep === 'input' ? t.setup_email : t.enter_otp}
                    </h2>
                    <p className="text-sm text-[var(--muted)] mb-8 text-center max-w-[280px]">
                        {emailError || (emailStep === 'input' ? t.email_hint : t.otp_hint)}
                    </p>

                    {emailStep === 'input' ? (
                        <div className="w-full space-y-4">
                            <input
                                type="email"
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                placeholder={t.email_placeholder}
                                className="w-full p-4 rounded-xl bg-[var(--input-bg)] border border-transparent focus:border-[var(--primary)] outline-none text-center text-lg transition-all"
                                autoFocus
                            />
                            <button
                                onClick={handleEmailRequestOtp}
                                disabled={emailLoading || !emailAddress}
                                className="w-full py-3.5 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] font-semibold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                            >
                                {emailLoading ? <Loader2 className="animate-spin" /> : t.verify}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            <div className="flex gap-4 mb-10">
                                {[...Array(6)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full transition-all duration-200 ${emailOtp.length > i
                                            ? 'bg-[var(--primary)] scale-110'
                                            : 'bg-[var(--border)]'
                                            }`}
                                    />
                                ))}
                            </div>

                            <PasscodeKeypad
                                onPress={handleEmailDigit}
                                onDelete={handleEmailDelete}
                            />

                            <button
                                onClick={() => setEmailStep('input')}
                                className="mt-8 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                                {t.change_email}
                            </button>
                        </div>
                    )}
                </div>
            </Drawer>

            {/* Language Drawer */}
            <Drawer isOpen={isLanguageDrawerOpen} onClose={() => setIsLanguageDrawerOpen(false)}>
                <div className="min-h-[50vh]">
                    <LanguageSelector
                        variant="drawer"
                        onSelect={(code) => {
                            handleLanguageSelect(code);
                            setIsLanguageDrawerOpen(false);
                        }}
                    />
                </div>
            </Drawer>
            {/* Export Drawer */}
            <Drawer isOpen={isExportDrawerOpen} onClose={() => setIsExportDrawerOpen(false)}>
                <div className="px-6 py-6 pb-6 flex flex-col h-full">
                    {exportStep === 'select' && (
                        <h2 className="text-xl font-bold mb-6 text-center">
                            {t.export_select_title}
                        </h2>
                    )}

                    {exportStep === 'select' ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-[var(--muted)]">{selectedExportIds.size} {t.selected_count}</span>
                                <button onClick={toggleAllExport} className="text-sm text-[var(--primary)] font-medium">
                                    {selectedExportIds.size === exportAccounts.length ? t.deselect_all : t.select_all}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                                {exportAccounts.map(acc => {
                                    const brandColor = acc.hex || 'var(--primary)';
                                    let iconPath = null;
                                    if (acc.slug && (simpleIcons as any)[`si${acc.slug}`]) {
                                        iconPath = (simpleIcons as any)[`si${acc.slug}`].path;
                                    }

                                    return (
                                        <button
                                            key={acc.id}
                                            onClick={() => toggleExportSelection(acc.id)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--input-bg)] border border-transparent active:scale-[0.99] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm shrink-0"
                                                    style={{ backgroundColor: brandColor, color: '#ffffff' }}
                                                >
                                                    {iconPath ? (
                                                        <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                                            <path d={iconPath} />
                                                        </svg>
                                                    ) : (
                                                        <span className="font-bold text-sm">{(acc.service_name[0] || '?').toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <div className="font-semibold text-sm truncate">{acc.service_name}</div>
                                                    <div className="text-xs text-[var(--muted)] truncate">{acc.issuer || 'Account'}</div>
                                                </div>
                                            </div>
                                            <div className={`text-[var(--primary)] shrink-0 pl-2 ${selectedExportIds.has(acc.id) ? 'opacity-100' : 'opacity-20'}`}>
                                                {selectedExportIds.has(acc.id) ? <CheckCircle size={24} /> : <Circle size={24} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-4 mt-auto">
                                <button
                                    onClick={handleExportGenerate}
                                    className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] font-bold shadow-lg active:scale-95 transition-all"
                                >
                                    {t.export_btn} ({selectedExportIds.size})
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-8">
                            <div className="bg-white p-4 rounded-3xl shadow-xl">
                                {exportQrImage && <img src={exportQrImage} className="w-64 h-64 object-contain" alt="Export QR" />}
                            </div>

                            <p className="text-center text-[var(--muted)] text-sm max-w-xs whitespace-pre-wrap">
                                {t.export_qr_hint || "Scan with Google Authenticator to import.\n⚠️ Do not save or share this QR code."}
                            </p>
                        </div>
                    )}
                </div>
            </Drawer>
        </main>
    );
}
