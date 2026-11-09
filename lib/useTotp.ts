'use client';
import { useEffect, useMemo, useState } from 'react';
import * as OTPAuth from 'otpauth';

export interface TotpAccount {
    service_name: string;
    issuer?: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
}

/** "123456" → "123 456", "12345678" → "1234 5678". */
export function formatCode(code: string) {
    if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
    if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
    return code.replace(/(.{3})/g, '$1 ').trim();
}

/** Current TOTP code for an account, refreshed every second, plus seconds left in the period. */
export function useTotp(account: TotpAccount) {
    const period = account.period || 30;

    const totp = useMemo(() => {
        try {
            return new OTPAuth.TOTP({
                issuer: account.issuer || 'App',
                label: account.service_name || 'Account',
                algorithm: (account.algorithm || 'SHA1').toUpperCase(),
                digits: account.digits || 6,
                period,
                secret: OTPAuth.Secret.fromBase32(account.secret),
            });
        } catch (e) {
            console.error('TOTP Error:', e);
            return null;
        }
    }, [account.issuer, account.service_name, account.algorithm, account.digits, period, account.secret]);

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const code = totp ? totp.generate({ timestamp: now }) : null;
    const remaining = period - (Math.floor(now / 1000) % period);
    return { code, remaining, period };
}
