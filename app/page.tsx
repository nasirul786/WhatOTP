'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useTelegram } from '@/components/TelegramProvider';
import { Account } from '@/components/AccountRow';
import AccountFormDrawer, { AccountDraft, EMPTY_ACCOUNT } from '@/components/AccountFormDrawer';
import Drawer from '@/components/Drawer';
import DrawerHeader from '@/components/DrawerHeader';
import HomeView from '@/components/HomeView';
import LanguageSelector from '@/components/LanguageSelector';
import PinPad from '@/components/PinPad';
import SettingsView, { SecurityState } from '@/components/SettingsView';
import VerificationScreen from '@/components/VerificationScreen';
import LockedScreen from '@/components/LockedScreen';
import { useTranslation } from '@/lib/useTranslation';
import { api, postAuth } from '@/lib/api';
import { confirmPopup } from '@/lib/telegram';
import lockAnimation from '@/public/lotties/passcode.json';
import { haptic } from '@/lib/haptics';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Roughly UIKit's navigation push curve. */
const PUSH_TRANSITION = { duration: 0.42, ease: [0.32, 0.72, 0, 1] } as const;

export default function Home() {
  const webApp = useTelegram();
  const { t, setLanguage } = useTranslation();
  const { setTheme } = useTheme();
  const initData = webApp?.initData;

  const [screen, setScreen] = useState<'home' | 'settings'>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Security state (shared with the settings screen)
  const [security, setSecurity] = useState<SecurityState>({ passkey: false, passcode: false, email: false });
  const updateSecurity = useCallback((patch: Partial<SecurityState>) => setSecurity(s => ({ ...s, ...patch })), []);

  // Passcode verification
  const [isPasscodeVerifyOpen, setIsPasscodeVerifyOpen] = useState(false);
  const [verifyPasscodeInput, setVerifyPasscodeInput] = useState('');
  const [verifyPasscodeError, setVerifyPasscodeError] = useState('');

  // Lock / remove-auth
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [isRemoveAuthDrawerOpen, setIsRemoveAuthDrawerOpen] = useState(false);
  const [removeAuthOtp, setRemoveAuthOtp] = useState('');
  const [removeAuthError, setRemoveAuthError] = useState('');
  const [removeAuthLoading, setRemoveAuthLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [draft, setDraft] = useState<AccountDraft>(EMPTY_ACCOUNT);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isIconSearchOpen, setIsIconSearchOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!initData) return;
    try {
      const res = await api('/api/accounts', initData);
      if (res.ok) setAccounts((await res.json()).accounts);
    } catch (e) {
      console.error(e);
    }
  }, [initData]);

  const unlock = () => {
    setIsVerificationRequired(false);
    setIsAuthenticated(true);
    haptic.notify('success');
    fetchAccounts();
  };

  // --- Verification ---
  const handleVerifyBiometric = async () => {
    if (!initData) return;
    const bm = webApp.BiometricManager;

    if (!bm) {
      webApp.showAlert('Biometrics not supported');
      return;
    }

    const authenticate = async () => {
      try {
        if (!bm.isBiometricAvailable) {
          webApp.showAlert('Biometrics not available');
          return;
        }

        if (!bm.isAccessGranted) {
          const granted = await new Promise(resolve => bm.requestAccess({ reason: 'Verify Identity' }, resolve));
          if (!granted) {
            webApp.showAlert('Biometric access denied');
            return;
          }
        }

        const { ok, token } = await new Promise<{ ok: boolean; token: string }>(resolve =>
          bm.authenticate({ reason: 'Verify Identity' }, (success: boolean, tok: string) => resolve({ ok: success, token: tok }))
        );

        if (ok && token) {
          const res = await postAuth('/api/auth/biometrics', initData, { action: 'verify_token', token });
          if ((await res.json()).verified) {
            unlock();
          } else {
            webApp.showAlert('Biometric verification failed.');
            haptic.notify('error');
          }
        }
      } catch (e: any) {
        console.error(e);
        webApp.showAlert('Error: ' + e.message);
      }
    };

    if (!bm.isInited) bm.init(authenticate);
    else authenticate();
  };

  const handlePasscodeSubmit = async (code: string) => {
    try {
      const res = await postAuth('/api/auth/passcode', initData, { action: 'verify', passcode: code });
      const data = await res.json();
      if (data.verified) {
        setIsPasscodeVerifyOpen(false);
        unlock();
      } else {
        setVerifyPasscodeError(t.incorrect_passcode || 'Incorrect Passcode');
        haptic.notify('error');
        setTimeout(() => setVerifyPasscodeInput(''), 500);
        setTimeout(() => setVerifyPasscodeError(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasscodeVerifyDigit = (digit: string) => {
    setVerifyPasscodeError('');
    if (verifyPasscodeInput.length >= 6) return;
    setVerifyPasscodeInput(verifyPasscodeInput + digit);
  };

  // --- Remove auth / delete account / restore ---
  const handleRemoveAuthRequest = () => {
    confirmPopup(webApp, {
      title: t.remove_auth, message: t.remove_auth_confirm, cancelText: t.cancel, confirmText: t.remove_auth,
    }, async () => {
      setRemoveAuthLoading(true);
      try {
        const res = await postAuth('/api/auth/remove-request', initData);
        if (res.ok) {
          setIsRemoveAuthDrawerOpen(true);
          setRemoveAuthError('');
          setRemoveAuthOtp('');
        } else {
          webApp?.showAlert((await res.json()).error || 'Error');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRemoveAuthLoading(false);
      }
    });
  };

  const handleRemoveAuthVerify = async (otp: string) => {
    setRemoveAuthLoading(true);
    try {
      const res = await postAuth('/api/auth/remove-verify', initData, { otp });
      if (res.ok) {
        setIsRemoveAuthDrawerOpen(false);
        setLockedUntil(Date.now() + DAY_MS);
        webApp?.showAlert(t.auth_removed);
      } else {
        setRemoveAuthError((await res.json()).error || 'Invalid OTP');
        setTimeout(() => setRemoveAuthOtp(''), 1000);
      }
    } catch (e) {
      console.error(e);
      setRemoveAuthError('Network Error');
    } finally {
      setRemoveAuthLoading(false);
    }
  };

  const handleRemoveAuthDigit = (digit: string) => {
    if (removeAuthOtp.length >= 6) return;
    setRemoveAuthOtp(removeAuthOtp + digit);
  };

  /** Cancels a pending deletion / auth removal. Non-destructive, so no confirmation step. */
  const handleRestore = async () => {
    const isDeleteLock = lockReason === 'delete_account';
    try {
      const res = await postAuth('/api/auth/restore', initData);
      if (res.ok) {
        haptic.notify('success');
        webApp?.showAlert(isDeleteLock ? t.account_restored : t.security_restored, () => window.location.reload());
      } else {
        webApp?.showAlert(t.request_error || 'Error');
      }
    } catch (e) {
      console.error(e);
      webApp?.showAlert(t.request_error || 'Error');
    }
  };

  /** Schedules deletion. Confirmation already happened in the verification screen's action sheet. */
  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      const res = await postAuth('/api/auth/delete-account', initData);
      if (res.ok) {
        const data = await res.json();
        setLockedUntil(data.lockedUntil ? new Date(data.lockedUntil).getTime() : Date.now() + DAY_MS);
        setLockReason('delete_account');
        haptic.notify('warning');
      } else {
        webApp?.showAlert(t.request_error || 'Error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // --- Telegram Back button (home screen only; settings manages its own) ---
  useEffect(() => {
    if (!webApp?.BackButton || screen !== 'home') return;

    const handleBack = () => {
      if (isIconSearchOpen) setIsIconSearchOpen(false);
      else if (isDrawerOpen) setIsDrawerOpen(false);
      else if (isPasscodeVerifyOpen) setIsPasscodeVerifyOpen(false);
      else if (isRemoveAuthDrawerOpen) setIsRemoveAuthDrawerOpen(false);
    };

    if (isDrawerOpen || isIconSearchOpen || isPasscodeVerifyOpen || isRemoveAuthDrawerOpen) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    } else {
      webApp.BackButton.hide();
    }

    return () => webApp.BackButton.offClick(handleBack);
  }, [webApp, screen, isDrawerOpen, isIconSearchOpen, isPasscodeVerifyOpen, isRemoveAuthDrawerOpen]);

  // --- Login ---
  useEffect(() => {
    if (!webApp) return;
    webApp.BackButton?.hide();

    const login = async () => {
      try {
        const res = await postAuth('/api/auth', webApp.initData);
        if (res.ok) {
          const data = await res.json();
          if (data.user?.language_code) setLanguage(data.user.language_code);
          if (data.user?.theme) setTheme(data.user.theme);

          if (data.isNewUser) {
            setIsNewUser(true);
          } else {
            setSecurity({ passkey: !!data.hasPasskey, passcode: !!data.hasPasscode, email: !!data.hasEmail });

            if (data.lockedUntil) {
              const lockTime = new Date(data.lockedUntil).getTime();
              if (lockTime > Date.now()) {
                setLockedUntil(lockTime);
                if (data.lockReason) setLockReason(data.lockReason);
              }
            }

            if (!data.isSessionVerified && (data.hasPasskey || data.hasPasscode)) {
              setIsVerificationRequired(true);
            } else {
              setIsAuthenticated(true);
              fetchAccounts();
            }
          }
        } else {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          console.error('Auth failed:', res.status, errorData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (webApp.initData) login();
    else setLoading(false);
  }, [webApp, setLanguage, setTheme, fetchAccounts]);

  // --- Telegram Mini App configuration ---
  useEffect(() => {
    if (!webApp) return;
    webApp.enableClosingConfirmation?.();
    webApp.disableVerticalSwipes?.();
  }, [webApp]);

  // Each screen starts at the top, like a pushed iOS view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Settings button in the Telegram menu (only once the user is unlocked)
  useEffect(() => {
    if (!webApp?.SettingsButton || !isAuthenticated) return;
    const open = () => setScreen('settings');
    webApp.SettingsButton.show();
    webApp.SettingsButton.onClick(open);
    return () => {
      webApp.SettingsButton.offClick(open);
      webApp.SettingsButton.hide();
    };
  }, [webApp, isAuthenticated]);

  // --- Accounts ---
  const handleScan = (data: string) => {
    if (!data.startsWith('otpauth://')) {
      webApp?.showAlert(t.invalid_qr);
      return;
    }

    try {
      const url = new URL(data);
      const secret = url.searchParams.get('secret');
      let issuer = url.searchParams.get('issuer') || '';
      let service_name = '';

      const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (pathname.includes(':')) {
        const parts = pathname.split(':');
        issuer = issuer || parts[0];
        service_name = parts[1];
      } else {
        service_name = pathname;
      }

      if (!secret) throw new Error('No secret');

      setDraft({ service_name, secret, issuer, slug: '', hex: '' });
      setIsDrawerOpen(true);
    } catch {
      webApp?.showAlert(t.failed_qr);
    }
  };

  const openScanner = () => {
    if (!webApp) return;
    if (webApp.platform && !['android', 'ios'].includes(webApp.platform)) {
      webApp.showAlert(t.open_in_mobile);
      return;
    }
    webApp.showScanQrPopup({ text: t.scan_qr }, handleScan);
  };

  const saveAccount = async () => {
    if (!draft.secret || !draft.service_name) return;
    setIsSaving(true);
    try {
      const res = await api('/api/accounts', initData, { method: draft.id ? 'PUT' : 'POST', body: draft });
      if (res.ok) {
        setDraft(EMPTY_ACCOUNT);
        setIsDrawerOpen(false);
        haptic.notify('success');
        fetchAccounts();
      } else {
        webApp?.showAlert(t.save_failed);
        haptic.notify('error');
      }
    } catch (e) {
      console.error(e);
      webApp?.showAlert(t.save_error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewEntry = () => {
    setDraft(EMPTY_ACCOUNT);
    setIsDrawerOpen(true);
  };

  const handleEdit = (account: Account) => {
    setDraft({ ...account, slug: account.slug || '', hex: account.hex || '' });
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    confirmPopup(webApp, {
      title: t.delete_title, message: t.delete_confirm, cancelText: t.cancel, confirmText: t.delete,
    }, async () => {
      try {
        const res = await api(`/api/accounts?id=${id}`, initData, { method: 'DELETE' });
        if (res.ok) {
          haptic.notify('success');
          setIsDrawerOpen(false); // in case it was deleted from the edit sheet
          fetchAccounts();
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  // --- Render ---
  if (!webApp) return <div className="flex items-center justify-center min-h-app">{t.loading}</div>;
  if (loading) return <div className="flex items-center justify-center min-h-app">{t.verifying}</div>;

  if (lockedUntil && lockedUntil > Date.now()) {
    return <LockedScreen lockedUntil={lockedUntil} reason={lockReason} onRestore={handleRestore} />;
  }

  if (isVerificationRequired) {
    return (
      <>
        <VerificationScreen
          onVerifyBiometric={handleVerifyBiometric}
          onVerifyPasscode={() => setIsPasscodeVerifyOpen(true)}
          onRemoveAuth={handleRemoveAuthRequest}
          onDeleteAccount={handleDeleteAccount}
          hasBiometric={security.passkey}
          hasPasscode={security.passcode}
          hasEmail={security.email}
          isLoading={removeAuthLoading}
          isDeleteLoading={deleteAccountLoading}
        />

        <Drawer isOpen={isPasscodeVerifyOpen} onClose={() => setIsPasscodeVerifyOpen(false)}>
          <div className="px-6 py-6 pb-6 flex flex-col items-center min-h-full">
            <DrawerHeader
              animation={lockAnimation}
              size="w-24 h-24"
              title={t.enter_passcode}
              hint={t.create_passcode_hint.replace('Create', 'Enter')}
              error={verifyPasscodeError}
            />
            <PinPad
              value={verifyPasscodeInput}
              onPress={handlePasscodeVerifyDigit}
              onComplete={handlePasscodeSubmit}
              onDelete={() => {
                setVerifyPasscodeError('');
                setVerifyPasscodeInput(prev => prev.slice(0, -1));
              }}
            />
          </div>
        </Drawer>

        <Drawer isOpen={isRemoveAuthDrawerOpen} onClose={() => setIsRemoveAuthDrawerOpen(false)}>
          <div className="px-6 py-6 pb-6 flex flex-col items-center min-h-full">
            <DrawerHeader
              animation={lockAnimation}
              size="w-24 h-24"
              title={t.enter_otp}
              hint={t.otp_hint}
              error={removeAuthError}
            />
            <PinPad
              value={removeAuthOtp}
              onComplete={handleRemoveAuthVerify}
              busy={removeAuthLoading}
              onPress={(d) => {
                setRemoveAuthError('');
                handleRemoveAuthDigit(d);
              }}
              onDelete={() => {
                setRemoveAuthOtp(prev => prev.slice(0, -1));
                setRemoveAuthError('');
              }}
            />
            {removeAuthLoading && <Loader2 className="animate-spin mt-4 text-[var(--primary)]" />}
          </div>
        </Drawer>
      </>
    );
  }

  if (isNewUser) {
    return (
      <LanguageSelector
        onSelect={async (code) => {
          setLanguage(code);
          try {
            await api('/api/user/language', initData, { body: { language_code: code, initData } });
            haptic.notify('success');
          } catch (e) {
            console.error(e);
          }
          setIsNewUser(false);
        }}
      />
    );
  }

  return (
    <>
      {/* iOS-style push/pop between the list and Settings. popLayout lifts the leaving screen
          out of the flow so both can overlap while they slide. */}
      <div className="relative overflow-x-clip">
        <AnimatePresence mode="popLayout" initial={false}>
          {screen === 'settings' ? (
            <motion.div
              key="settings"
              className="relative z-[2] w-full shadow-[-8px_0_24px_rgba(0,0,0,0.12)]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={PUSH_TRANSITION}
            >
              <SettingsView
                security={security}
                onSecurityChange={updateSecurity}
                onBack={() => setScreen('home')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="home"
              className="relative z-[1] w-full"
              initial={{ x: '-30%', filter: 'brightness(0.85)' }}
              // Clear the filter at rest: any filter on an ancestor breaks position:fixed children (sheets, toast).
              animate={{ x: 0, filter: 'brightness(1)', transitionEnd: { filter: 'none' } }}
              exit={{ x: '-30%', filter: 'brightness(0.85)' }}
              transition={PUSH_TRANSITION}
            >
              <HomeView
                accounts={accounts}
                onScan={openScanner}
                onAddManual={handleNewEntry}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSettings={() => setScreen('settings')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AccountFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        account={draft}
        onChange={setDraft}
        onSave={saveAccount}
        onScan={openScanner}
        onDelete={handleDelete}
        isSaving={isSaving}
        isIconSearchOpen={isIconSearchOpen}
        onIconSearchOpenChange={setIsIconSearchOpen}
      />
    </>
  );
}
