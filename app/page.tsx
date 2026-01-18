'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTelegram } from '@/components/TelegramProvider';
import AccountCard from '@/components/AccountCard';
import { Plus, Scan, Keyboard, Settings as SettingsIcon, LogOut, Loader2, Shield } from 'lucide-react';
import Lottie from 'lottie-react';
const manualEntryAnim = require('../public/lotties/manual-entry.json');
const noAccountsAnim = require('../public/lotties/no-accounts.json');
const lockAnimation = require('../public/lotties/passcode.json');
const lockedAccountAnim = require('../public/lotties/locked.json');
import MultiButton from '@/components/MultiButton';
import { useRouter } from 'next/navigation';
import Drawer from '@/components/Drawer';
import IconPicker from '@/components/IconPicker';
import { useTranslation } from '@/lib/useTranslation';
import LanguageSelector from '@/components/LanguageSelector';
import { useTheme } from 'next-themes';
import VerificationScreen from '@/components/VerificationScreen';
import PasscodeKeypad from '@/components/PasscodeKeypad';

interface Account {
  id: number;
  service_name: string;
  issuer: string;
  secret: string;
  algorithm?: string;
  digits?: number;
  period?: number;
  slug?: string;
  hex?: string;
}

export default function Home() {
  const router = useRouter();
  const webApp = useTelegram();
  const { t, setLanguage } = useTranslation();
  const { setTheme } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const [hasBiometric, setHasBiometric] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isPasscodeVerifyOpen, setIsPasscodeVerifyOpen] = useState(false);
  const [verifyPasscodeInput, setVerifyPasscodeInput] = useState('');
  const [verifyPasscodeError, setVerifyPasscodeError] = useState('');

  const [hasEmail, setHasEmail] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [isRemoveAuthDrawerOpen, setIsRemoveAuthDrawerOpen] = useState(false);
  const [removeAuthOtp, setRemoveAuthOtp] = useState('');
  const [removeAuthError, setRemoveAuthError] = useState('');
  const [removeAuthLoading, setRemoveAuthLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (lockedUntil) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [lockedUntil]);

  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState<{
    id?: number;
    service_name: string;
    secret: string;
    issuer: string;
    slug: string;
    hex: string;
  }>({ service_name: '', secret: '', issuer: '', slug: '', hex: '' });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isIconSearchOpen, setIsIconSearchOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [view, setView] = useState<'list' | 'scan'>('list');

  const fetchAccounts = useCallback(async () => {
    if (!webApp?.initData) return;
    try {
      const res = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${webApp.initData}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch (e) {
      console.error(e);
    }
  }, [webApp]);
  // Biometric Verify Handler
  const handleVerifyBiometric = async () => {
    if (!webApp?.initData) return;
    const bm = webApp.BiometricManager;

    if (!bm) {
      webApp.showAlert("Biometrics not supported");
      return;
    }

    const performBiometricAuth = async () => {
      try {
        if (!bm.isBiometricAvailable) {
          webApp.showAlert("Biometrics not available");
          return;
        }

        if (!bm.isAccessGranted) {
          const accessGranted = await new Promise(resolve => bm.requestAccess({ reason: "Verify Identity" }, resolve));
          if (!accessGranted) {
            webApp.showAlert("Biometric access denied");
            return;
          }
        }

        const { isAuthenticated, biometricToken } = await new Promise<any>(resolve =>
          bm.authenticate({ reason: "Verify Identity" }, (success: boolean, token: string) => resolve({ isAuthenticated: success, biometricToken: token }))
        );

        if (isAuthenticated && biometricToken) {
          const verifyRes = await fetch('/api/auth/biometrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify_token',
              initData: webApp.initData,
              token: biometricToken
            })
          });

          const result = await verifyRes.json();
          if (result.verified) {
            setIsVerificationRequired(false);
            setIsAuthenticated(true);
            webApp.HapticFeedback.notificationOccurred('success');
            fetchAccounts();
          } else {
            webApp.showAlert("Biometric verification failed.");
            webApp.HapticFeedback.notificationOccurred('error');
          }
        }
      } catch (e: any) {
        console.error(e);
        webApp.showAlert("Error: " + e.message);
      }
    };

    if (!bm.isInited) {
      bm.init(() => performBiometricAuth());
    } else {
      performBiometricAuth();
    }
  };

  // Passcode Verify Handler
  const handlePasscodeVerifyDigit = (digit: string) => {
    setVerifyPasscodeError('');
    if (verifyPasscodeInput.length < 6) {
      const newVal = verifyPasscodeInput + digit;
      setVerifyPasscodeInput(newVal);
      if (newVal.length === 6) {
        handlePasscodeSubmit(newVal);
      }
    }
  };

  const handlePasscodeVerifyDelete = () => {
    setVerifyPasscodeError('');
    setVerifyPasscodeInput(prev => prev.slice(0, -1));
  };

  const handlePasscodeSubmit = async (code: string) => {
    try {
      // Add API for verify passcode (using verify action)
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${webApp?.initData}`
        },
        body: JSON.stringify({
          action: 'verify',
          initData: webApp?.initData,
          passcode: code
        })
      });
      const data = await res.json();
      if (data.verified) { // Changed API response assumption to 'verified' boolean
        setIsPasscodeVerifyOpen(false);
        setIsVerificationRequired(false);
        setIsAuthenticated(true);
        webApp?.HapticFeedback.notificationOccurred('success');
        fetchAccounts();
      } else {
        setVerifyPasscodeError(t.incorrect_passcode || "Incorrect Passcode");
        webApp?.HapticFeedback.notificationOccurred('error');
        setTimeout(() => {
          setVerifyPasscodeInput('');
        }, 500);
        setTimeout(() => {
          setVerifyPasscodeError('');
        }, 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Remove Auth Handlers
  const handleRemoveAuthRequest = async () => {
    webApp?.showPopup({
      title: t.remove_auth,
      message: t.remove_auth_confirm,
      buttons: [
        { id: 'cancel', type: 'default', text: t.cancel },
        { id: 'remove', type: 'destructive', text: t.remove_auth }
      ]
    }, async (btnId: string) => {
      if (btnId !== 'remove') return;

      setRemoveAuthLoading(true);
      try {
        const res = await fetch('/api/auth/remove-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp?.initData })
        });

        if (res.ok) {
          setIsRemoveAuthDrawerOpen(true);
          setRemoveAuthError('');
          setRemoveAuthOtp('');
          // webApp?.showAlert(t.otp_sent); // Alert might block UI update
        } else {
          const data = await res.json();
          webApp?.showAlert(data.error || "Error");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRemoveAuthLoading(false);
      }
    });
  };

  const handleRemoveAuthVerify = async (otp: string) => {
    setRemoveAuthOtp(otp);
    if (otp.length === 6) {
      setRemoveAuthLoading(true);
      try {
        const res = await fetch('/api/auth/remove-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp?.initData, otp })
        });

        if (res.ok) {
          setIsRemoveAuthDrawerOpen(false);
          // Set locked locally 24h from now (approx) or reload?
          setLockedUntil(Date.now() + 24 * 60 * 60 * 1000);
          webApp?.showAlert(t.auth_removed);
        } else {
          const data = await res.json();
          setRemoveAuthError(data.error || "Invalid OTP");
          setTimeout(() => setRemoveAuthOtp(''), 1000);
        }
      } catch (e) {
        console.error(e);
        setRemoveAuthError("Network Error");
      } finally {
        setRemoveAuthLoading(false);
      }
    }
  };

  const handleRestoreSecurity = async () => {
    const isDeleteLock = lockReason === 'delete_account';
    webApp?.showPopup({
      title: isDeleteLock ? t.restore_account : t.restore_security,
      message: isDeleteLock ? t.restore_account_confirm : t.restore_confirm,
      buttons: [
        { id: 'cancel', type: 'default', text: t.cancel },
        { id: 'restore', type: 'default', text: isDeleteLock ? t.restore_account : t.restore_security }
      ]
    }, async (btnId: string) => {
      if (btnId !== 'restore') return;
      try {
        const res = await fetch('/api/auth/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp?.initData })
        });

        if (res.ok) {
          setLockedUntil(null);
          setLockReason(null);
          webApp?.showAlert(isDeleteLock ? t.account_restored : t.security_restored);
          // Reload to get auth state back
          window.location.reload();
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleRemoveAuthDelete = () => {
    setRemoveAuthOtp(prev => prev.slice(0, -1));
    setRemoveAuthError('');
  };

  // BackButton Management
  useEffect(() => {
    if (!webApp?.BackButton) return;

    const handleBack = () => {
      if (isIconSearchOpen) {
        setIsIconSearchOpen(false);
      } else if (isDrawerOpen) {
        setIsDrawerOpen(false);
      } else if (isPasscodeVerifyOpen) {
        setIsPasscodeVerifyOpen(false);
      } else if (isRemoveAuthDrawerOpen) {
        setIsRemoveAuthDrawerOpen(false);
      }
    };

    if (isDrawerOpen || isIconSearchOpen || isPasscodeVerifyOpen || isRemoveAuthDrawerOpen) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    } else {
      webApp.BackButton.hide();
      webApp.BackButton.offClick(handleBack);
    }

    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [webApp, isDrawerOpen, isIconSearchOpen, isPasscodeVerifyOpen, isRemoveAuthDrawerOpen]);

  // Authentication & Initial Setup
  useEffect(() => {
    if (!webApp) return;

    // Ensure BackButton is hidden on main page
    if (webApp.BackButton) {
      webApp.BackButton.hide();
    }

    const login = async () => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp.initData })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user?.language_code) {
            setLanguage(data.user.language_code);
          }
          if (data.user?.theme) {
            setTheme(data.user.theme);
          }

          if (data.isNewUser) {
            setIsNewUser(true);
          } else {
            if (data.hasPasskey) setHasBiometric(true);
            if (data.hasPasscode) setHasPasscode(true);
            if (data.hasEmail) setHasEmail(true);

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
          // ... error handling
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          console.error("Auth failed:", res.status, errorData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (webApp.initData) {
      login();
    } else {
      setLoading(false);
    }
  }, [webApp, setLanguage, setTheme, fetchAccounts]);

  // Telegram Mini App Configuration
  useEffect(() => {
    if (!webApp) return;

    // 1. Enable Closing Confirmation (Bot API 6.2+)
    if (webApp.enableClosingConfirmation) {
      webApp.enableClosingConfirmation();
    }

    // 2. Disable Vertical Swipes (Bot API 7.7+)
    if (webApp.disableVerticalSwipes) {
      webApp.disableVerticalSwipes();
    }

    // 3. Settings Button (Bot API 7.0+)
    if (webApp.SettingsButton) {
      webApp.SettingsButton.show();
      const handleSettingsClick = () => {
        router.push('/settings');
      };
      webApp.SettingsButton.onClick(handleSettingsClick);

      return () => {
        webApp.SettingsButton.offClick(handleSettingsClick);
        webApp.SettingsButton.hide();
      };
    }
  }, [webApp, router]);

  const handleDeleteAccount = async () => {
    webApp?.showPopup({
      title: t.delete_account_btn,
      message: t.delete_account_confirm,
      buttons: [
        { id: 'cancel', type: 'default', text: t.cancel },
        { id: 'delete', type: 'destructive', text: t.delete_account_btn }
      ]
    }, async (btnId: string) => {
      if (btnId !== 'delete') return;

      setDeleteAccountLoading(true);
      try {
        const res = await fetch('/api/auth/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp?.initData })
        });

        if (res.ok) {
          setLockedUntil(Date.now() + 24 * 60 * 60 * 1000);
          setLockReason('delete_account');
        } else {
          webApp?.showAlert(t.request_error || "Error");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setDeleteAccountLoading(false);
      }
    });
  };

  const handleScan = async (data: string) => {
    // Check invalid
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

      // Auto-detect brand from name for defaults
      // We can optionally check simple-icons here, but simpler to let user confirm.

      setNewAccount({
        service_name,
        secret,
        issuer,
        slug: '', // Could try to match slug from service_name
        hex: ''
      });
      setIsDrawerOpen(true); // Open drawer to review
    } catch (e) {
      webApp?.showAlert(t.failed_qr);
    }
  };

  const addAccount = async () => {
    if (!newAccount.secret || !newAccount.service_name) return;
    setIsSaving(true);

    try {
      const method = newAccount.id ? 'PUT' : 'POST';
      const body = { ...newAccount } as any;

      const res = await fetch('/api/accounts', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${webApp?.initData}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setNewAccount({ service_name: '', secret: '', issuer: '', slug: '', hex: '' });
        setIsDrawerOpen(false);
        webApp?.HapticFeedback.notificationOccurred('success');
        fetchAccounts();
      } else {
        webApp?.showAlert(t.save_failed);
        webApp?.HapticFeedback.notificationOccurred('error');
      }
    } catch (e) {
      console.error(e);
      webApp?.showAlert(t.save_error);
    } finally {
      setIsSaving(false);
    }
  };
  const handleFabClick = () => {
    setNewAccount({ service_name: '', secret: '', issuer: '', slug: '', hex: '' });
    setIsDrawerOpen(true);
  };

  const handleEdit = (account: Account) => {
    setNewAccount({
      ...account,
      slug: account.slug || '',
      hex: account.hex || ''
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!webApp) return;

    webApp.showPopup({
      title: t.delete_title,
      message: t.delete_confirm,
      buttons: [
        { text: t.cancel, id: 'cancel' },
        { type: 'destructive', text: t.delete, id: 'delete' }
      ]
    }, async (btnId: string) => {
      if (btnId === 'delete') {
        try {
          const res = await fetch(`/api/accounts?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${webApp.initData}` }
          });
          if (res.ok) {
            webApp.HapticFeedback.notificationOccurred('success');
            fetchAccounts();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const openScanner = () => {
    if (webApp) {
      if (webApp.platform && !['android', 'ios'].includes(webApp.platform)) {
        webApp.showAlert(t.open_in_mobile);
        return;
      }
      webApp.showScanQrPopup({
        text: t.scan_qr
      }, handleScan);
    }
  };

  if (!webApp) return <div className="flex items-center justify-center min-h-screen">{t.loading}</div>;
  if (loading) return <div className="flex items-center justify-center min-h-screen">{t.verifying}</div>;

  // Render Locked Screen
  if (lockedUntil && now < lockedUntil) {
    const remaining = Math.max(0, lockedUntil - now);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isDeleteLock = lockReason === 'delete_account';

    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6 space-y-8">
        <div className="w-48 h-48">
          <Lottie animationData={lockedAccountAnim} loop={true} />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{isDeleteLock ? t.account_deletion_scheduled : t.account_locked}</h1>
          <p className="text-[var(--muted)] max-w-[300px] mx-auto">
            {isDeleteLock ? t.account_deletion_msg : t.account_locked_msg}
          </p>
        </div>

        <div className="text-4xl font-mono font-semibold tracking-widest text-[var(--primary)]">
          {timeString}
        </div>
        <div className="text-sm text-[var(--muted)] uppercase tracking-widest">{t.locked_until}</div>

        <button
          onClick={handleRestoreSecurity}
          className="w-full max-w-xs py-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] font-semibold shadow-sm active:scale-95 transition-all"
        >
          {isDeleteLock ? t.restore_account : t.restore_security}
        </button>
      </main>
    );
  }

  if (isVerificationRequired) {
    return (
      <>
        <VerificationScreen
          onVerifyBiometric={handleVerifyBiometric}
          onVerifyPasscode={() => {
            setIsPasscodeVerifyOpen(true);
            // logic handled by effect
          }}
          onRemoveAuth={handleRemoveAuthRequest}
          onDeleteAccount={handleDeleteAccount}
          hasBiometric={hasBiometric}
          hasPasscode={hasPasscode}
          hasEmail={hasEmail}
          isLoading={removeAuthLoading}
          isDeleteLoading={deleteAccountLoading}
        />

        <Drawer isOpen={isPasscodeVerifyOpen} onClose={() => setIsPasscodeVerifyOpen(false)}>
          <div className="px-6 py-6 pb-10 flex flex-col items-center min-h-[50vh]">
            <div className="w-24 h-24 mb-4">
              <Lottie animationData={lockAnimation} loop={true} />
            </div>
            <h2 className="text-xl font-bold mb-2">{t.enter_passcode}</h2>

            <div className="text-sm text-[var(--muted)] mb-4 text-center h-10 flex flex-col justify-center">
              {verifyPasscodeError ? (
                <span className="text-red-500 animate-shake">{verifyPasscodeError}</span>
              ) : (
                <span>{t.create_passcode_hint.replace('Create', 'Enter')}</span>
              )}
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="flex gap-4 mb-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${verifyPasscodeInput.length > i
                      ? 'bg-[var(--primary)] scale-110'
                      : 'bg-[var(--border)]'
                      }`}
                  />
                ))}
              </div>

              <PasscodeKeypad
                onPress={handlePasscodeVerifyDigit}
                onDelete={handlePasscodeVerifyDelete}
              />
            </div>
          </div>
        </Drawer>

        {/* Remove Auth OTP Drawer for Verification Screen */}
        <Drawer isOpen={isRemoveAuthDrawerOpen} onClose={() => setIsRemoveAuthDrawerOpen(false)}>
          <div className="px-6 py-6 pb-10 flex flex-col items-center min-h-[50vh]">
            <div className="w-24 h-24 mb-4">
              <Lottie animationData={lockAnimation} loop={true} />
            </div>
            <h2 className="text-xl font-bold mb-2">{t.enter_otp}</h2>

            <div className="text-sm text-[var(--muted)] mb-4 text-center h-10 flex flex-col justify-center">
              {removeAuthError ? (
                <span className="text-red-500 animate-shake">{removeAuthError}</span>
              ) : (
                <span>{t.otp_hint}</span>
              )}
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="flex gap-4 mb-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${removeAuthOtp.length > i
                      ? 'bg-[var(--primary)] scale-110'
                      : 'bg-[var(--border)]'
                      }`}
                  />
                ))}
              </div>

              <PasscodeKeypad
                onPress={(d) => {
                  const newVal = removeAuthOtp + d;
                  if (newVal.length <= 6) {
                    const v = newVal;
                    setRemoveAuthOtp(v);
                    if (v.length === 6) handleRemoveAuthVerify(v);
                  }
                }}
                onDelete={handleRemoveAuthDelete}
              />

              {removeAuthLoading && <Loader2 className="animate-spin mt-4 text-[var(--primary)]" />}
            </div>
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
            await fetch('/api/user/language', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${webApp?.initData}`
              },
              body: JSON.stringify({ language_code: code, initData: webApp?.initData })
            });
            webApp?.HapticFeedback.notificationOccurred('success');
            setIsNewUser(false);
          } catch (e) {
            console.error(e);
            setIsNewUser(false);
          }
        }}
      />
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-[var(--background)] text-[var(--foreground)]">
      {/* List Container - No Header */}
      <div className="space-y-4 p-4 pt-6">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-48 h-48 mb-4">
              <Lottie animationData={noAccountsAnim} loop={true} />
            </div>
            <p className="text-[var(--muted)] font-medium text-lg">{t.no_accounts}</p>
            <p className="text-sm text-[var(--muted)]">{t.add_first}</p>
          </div>
        ) : (
          accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} onDelete={handleDelete} onEdit={handleEdit} />
          ))
        )}
      </div>

      {/* FAB */}
      <MultiButton
        onNewEntry={handleFabClick}
        onSettings={() => router.push('/settings')}
      />

      {/* Manual Entry Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <div className="px-6 pt-2 pb-8">
          <div className="w-32 h-32 mx-auto mb-2">
            <Lottie animationData={manualEntryAnim} loop={true} />
          </div>

          <h2 className="text-center text-xl font-bold mb-6 text-[var(--foreground)]">
            {newAccount.id ? t.edit_app : t.new_entry}
          </h2>

          <button
            onClick={openScanner}
            className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2 font-medium bg-[var(--input-bg)] text-[var(--primary)] hover:opacity-80 transition-opacity"
          >
            <Scan size={20} /> {t.scan_qr}
          </button>

          <div className="space-y-4">
            <div className="bg-[var(--input-bg)] rounded-xl px-4 py-2 focus-within:ring-2 ring-[var(--primary)] transition-all">
              <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{t.service_name}</label>
              <input
                className="w-full bg-transparent text-[var(--foreground)] outline-none text-lg py-1 placeholder-opacity-50 placeholder-[var(--muted)]"
                placeholder={t.service_name_placeholder}
                value={newAccount.service_name}
                onChange={e => setNewAccount({ ...newAccount, service_name: e.target.value })}
              />
            </div>

            <div className="bg-[var(--input-bg)] rounded-xl px-4 py-2 focus-within:ring-2 ring-[var(--primary)] transition-all">
              <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{t.secret_key}</label>
              <input
                className="w-full bg-transparent text-[var(--foreground)] outline-none text-lg py-1 font-mono tracking-widest placeholder-opacity-50 placeholder-[var(--muted)]"
                placeholder={t.secret_key_placeholder}
                value={newAccount.secret}
                onChange={e => setNewAccount({ ...newAccount, secret: e.target.value.replace(/\s/g, '').toUpperCase() })}
              />
            </div>

            <div className="bg-[var(--input-bg)] rounded-xl px-4 py-2 focus-within:ring-2 ring-[var(--primary)] transition-all">
              <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{t.issuer}</label>
              <input
                className="w-full bg-transparent text-[var(--foreground)] outline-none text-lg py-1 placeholder-opacity-50 placeholder-[var(--muted)]"
                placeholder={t.issuer_placeholder}
                value={newAccount.issuer}
                onChange={e => setNewAccount({ ...newAccount, issuer: e.target.value })}
              />
            </div>

            <div className="pt-2">
              <IconPicker
                value={{ slug: newAccount.slug || '', hex: newAccount.hex || '' }}
                onChange={({ slug, hex }) => setNewAccount({ ...newAccount, slug, hex })}
                isSearchOpen={isIconSearchOpen}
                onSearchOpenChange={setIsIconSearchOpen}
              />
            </div>
            <div className="pt-4 pb-8">
              <button
                onClick={addAccount}
                disabled={isSaving || !newAccount.secret || !newAccount.service_name}
                className="w-full py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 bg-[var(--primary)] text-[var(--primary-fg)] flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="animate-spin" size={20} />}
                {t.save_account}
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Remove Auth OTP Drawer */}
      <Drawer isOpen={isRemoveAuthDrawerOpen} onClose={() => setIsRemoveAuthDrawerOpen(false)}>
        <div className="px-6 py-6 pb-10 flex flex-col items-center min-h-[50vh]">
          <h2 className="text-xl font-bold mb-2">{t.enter_otp}</h2>
          <p className="text-sm text-[var(--muted)] mb-8 text-center">{t.otp_hint}</p>

          <div className="w-full flex flex-col items-center">
            <div className="flex gap-4 mb-10">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${removeAuthOtp.length > i
                    ? 'bg-[var(--primary)] scale-110'
                    : 'bg-[var(--border)]'
                    }`}
                />
              ))}
            </div>

            <PasscodeKeypad
              onPress={(d) => {
                const newVal = removeAuthOtp + d;
                if (newVal.length <= 6) {
                  const v = newVal;
                  setRemoveAuthOtp(v);
                  if (v.length === 6) handleRemoveAuthVerify(v);
                }
              }}
              onDelete={handleRemoveAuthDelete}
            />

            {removeAuthLoading && <Loader2 className="animate-spin mt-4 text-[var(--primary)]" />}

            {removeAuthError && (
              <p className="mt-4 text-red-500 text-sm animate-shake">{removeAuthError}</p>
            )}
          </div>
        </div>
      </Drawer>
    </main>
  );
}
