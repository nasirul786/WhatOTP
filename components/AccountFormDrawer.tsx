'use client';
import { motion } from 'framer-motion';
import { Loader2, ScanLine } from 'lucide-react';
import Drawer from '@/components/Drawer';
import BrandIcon from '@/components/BrandIcon';
import IconPicker from '@/components/IconPicker';
import { IOS, SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useTranslation } from '@/lib/useTranslation';
import { formatCode, useTotp } from '@/lib/useTotp';

export interface AccountDraft {
    id?: number;
    service_name: string;
    secret: string;
    issuer: string;
    slug: string;
    hex: string;
}

export const EMPTY_ACCOUNT: AccountDraft = { service_name: '', secret: '', issuer: '', slug: '', hex: '' };

/** Base32 alphabet (RFC 4648), optional "=" padding. */
const BASE32 = /^[A-Z2-7]+=*$/;

/** One form cell: label on the left, input filling the rest, iOS style. */
function Field({ label, value, placeholder, onChange, mono, invalid }: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
    mono?: boolean;
    invalid?: boolean;
}) {
    return (
        <label className="flex items-center pl-4 min-h-[44px]">
            <span className="cell-body flex-1 min-w-0 self-stretch flex items-center gap-3 pr-4 border-b-[0.5px] border-[var(--separator)]">
                <span className="w-[108px] shrink-0 text-[17px]">{label}</span>
                <input
                    className={`flex-1 min-w-0 bg-transparent outline-none text-[17px] py-2.5 placeholder:text-[var(--muted)] ${mono ? 'font-mono tracking-wider' : ''} ${invalid ? 'text-[#ff3b30]' : ''}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    autoCapitalize={mono ? 'characters' : 'words'}
                    autoCorrect="off"
                    spellCheck={false}
                />
            </span>
        </label>
    );
}

/** Live preview of the entry: icon, name and the real current code (proves the key works). */
function Preview({ account, secretValid }: { account: AccountDraft; secretValid: boolean }) {
    const { code, remaining, period } = useTotp(account);
    const name = account.service_name || 'WhatOTP';
    const show = secretValid && code;

    return (
        <div className="flex flex-col items-center text-center pt-2 pb-1">
            <motion.div key={`${account.slug}-${account.hex}`} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                <BrandIcon slug={account.slug} hex={account.hex} name={name} shape="w-16 h-16 rounded-[16px]" textSize="text-2xl" />
            </motion.div>
            <div className="mt-3 text-[20px] font-semibold leading-tight truncate max-w-full">{name}</div>
            {account.issuer && <div className="text-[15px] text-[var(--muted)] truncate max-w-full">{account.issuer}</div>}
            <div
                className="mt-2 text-[34px] font-semibold tracking-wider tabular-nums leading-none"
                style={{ color: show ? 'var(--primary)' : 'var(--muted)', opacity: show ? 1 : 0.5 }}
            >
                {show ? formatCode(code) : '••• •••'}
            </div>
            <div className="mt-3 w-32 h-1 rounded-full bg-[var(--fill)] overflow-hidden">
                <div
                    className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-1000 ease-linear"
                    style={{ width: show ? `${(remaining / period) * 100}%` : '0%' }}
                />
            </div>
        </div>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    account: AccountDraft;
    onChange: (account: AccountDraft) => void;
    onSave: () => void;
    onScan: () => void;
    /** Shown only when editing an existing entry. */
    onDelete?: (id: number) => void;
    isSaving: boolean;
    isIconSearchOpen: boolean;
    onIconSearchOpenChange: (open: boolean) => void;
}

/** Add / edit an entry, as an iOS form sheet with a live code preview. */
export default function AccountFormDrawer({
    isOpen, onClose, account, onChange, onSave, onScan, onDelete, isSaving, isIconSearchOpen, onIconSearchOpenChange,
}: Props) {
    const { t } = useTranslation();
    const set = (patch: Partial<AccountDraft>) => onChange({ ...account, ...patch });
    // Lenient minimum: a few services issue short (but still valid) keys.
    const secretValid = account.secret.length >= 8 && BASE32.test(account.secret);
    const secretInvalid = account.secret.length > 0 && !BASE32.test(account.secret);
    const canSave = !!account.service_name.trim() && secretValid && !isSaving;
    const isEdit = !!account.id;

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="min-h-full bg-[var(--grouped-bg)] text-[var(--foreground)]">
                {/* Navigation bar (scrolls with the content) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center h-12 px-4">
                    <button onClick={onClose} className="justify-self-start text-[17px] text-[var(--primary)] active:opacity-50 transition-opacity">
                        {t.cancel}
                    </button>
                    <h2 className="text-[17px] font-semibold truncate">{isEdit ? t.edit_app : t.new_entry}</h2>
                    <button
                        onClick={onSave}
                        disabled={!canSave}
                        data-haptic="medium"
                        className="justify-self-end text-[17px] font-semibold text-[var(--primary)] disabled:text-[var(--muted)] disabled:opacity-60 active:opacity-50 transition-opacity flex items-center gap-1.5"
                    >
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        {t.save}
                    </button>
                </div>

                <div className="px-4 pt-2 pb-10 space-y-8">
                    <Preview account={account} secretValid={secretValid} />

                    {!isEdit && (
                        <SettingsGroup footer={t.scan_hint}>
                            <SettingsRow
                                icon={<ScanLine size={18} strokeWidth={2.25} />} color={IOS.blue}
                                label={t.scan_qr} onClick={onScan}
                            />
                        </SettingsGroup>
                    )}

                    <section>
                        <h3 className="px-4 pb-1.5 text-[13px] uppercase text-[var(--muted)]">{t.details}</h3>
                        <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden [&>*:last-child_.cell-body]:border-b-0">
                            <Field
                                label={t.service_name} placeholder={t.service_name_placeholder}
                                value={account.service_name} onChange={v => set({ service_name: v })}
                            />
                            <Field
                                label={t.issuer_short} placeholder={t.issuer_placeholder}
                                value={account.issuer} onChange={v => set({ issuer: v })}
                            />
                            <Field
                                label={t.secret_key} placeholder={t.secret_key_placeholder} mono invalid={secretInvalid}
                                value={account.secret} onChange={v => set({ secret: v.replace(/\s/g, '').toUpperCase() })}
                            />
                        </div>
                        <p className={`px-4 pt-1.5 text-[13px] leading-snug ${secretInvalid ? 'text-[#ff3b30]' : 'text-[var(--muted)]'}`}>
                            {secretInvalid ? t.invalid_secret : t.secret_hint}
                        </p>
                    </section>

                    <IconPicker
                        value={{ slug: account.slug || '', hex: account.hex || '' }}
                        onChange={({ slug, hex }) => set({ slug, hex })}
                        isSearchOpen={isIconSearchOpen}
                        onSearchOpenChange={onIconSearchOpenChange}
                    />

                    {isEdit && onDelete && (
                        <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden">
                            <button
                                data-haptic="medium"
                                onClick={() => onDelete(account.id!)}
                                className="w-full h-11 text-[17px] text-[#ff3b30] active:bg-[var(--cell-pressed)] transition-colors duration-75"
                            >
                                {t.delete_entry}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
