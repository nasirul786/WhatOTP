'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import { Check, MessageSquarePlus, Search, XCircle } from 'lucide-react';
import { useTelegram } from '@/components/TelegramProvider';
import { openExternal } from '@/lib/telegram';
import { languageRequestUrl } from '@/lib/links';
import { useTranslation } from '@/lib/useTranslation';
import languageAnim from '@/public/lotties/language-select.json';

interface Language {
    code: string;
    name: string;
    flag: string;
}

interface LanguageSelectorProps {
    onSelect: (code: string) => void;
    /** 'page' = first-launch onboarding, 'drawer' = opened from Settings. */
    variant?: 'page' | 'drawer';
    /** Currently selected language code, shown with a checkmark. */
    current?: string;
}

/** Cached across opens so the list appears instantly the second time. */
let cachedLanguages: Language[] | null = null;

/** Name of `code` in the `displayIn` language, e.g. ('de', 'en') -> "German". */
function displayName(code: string, displayIn: string) {
    try {
        return new Intl.DisplayNames([displayIn], { type: 'language' }).of(code) || '';
    } catch {
        return '';
    }
}

/** iOS-style language list with search and a checkmark on the current language. */
export default function LanguageSelector({ onSelect, variant = 'page', current }: LanguageSelectorProps) {
    const { t, lang } = useTranslation();
    const webApp = useTelegram();
    const [languages, setLanguages] = useState<Language[]>(cachedLanguages ?? []);
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string | undefined>(current);
    const isPage = variant === 'page';

    useEffect(() => {
        if (cachedLanguages) return;
        fetch('/api/languages')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    cachedLanguages = data;
                    setLanguages(data);
                }
            })
            .catch(console.error);
    }, []);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return languages
            .map(l => ({ ...l, translated: displayName(l.code, lang) }))
            .filter(l => !q || l.name.toLowerCase().includes(q) || l.translated.toLowerCase().includes(q) || l.code.includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [languages, query, lang]);

    const choose = (code: string) => {
        setPicked(code);
        // Let the checkmark land before the screen changes.
        setTimeout(() => onSelect(code), isPage ? 180 : 120);
    };

    return (
        <div className={`${isPage ? 'min-h-app' : 'min-h-full'} bg-[var(--grouped-bg)] text-[var(--foreground)] px-4 pb-10`}>
            {isPage ? (
                <motion.div
                    className="flex flex-col items-center text-center pt-8 pb-6"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <div className="w-32 h-32">
                        <Lottie autoplay src={languageAnim} loop={true} />
                    </div>
                    <h1 className="mt-4 text-[28px] leading-tight font-bold tracking-tight">{t.select_language}</h1>
                    <p className="mt-1.5 text-[15px] text-[var(--muted)] max-w-[280px]">{t.language_hint}</p>
                </motion.div>
            ) : (
                <h1 className="px-1 pt-3 pb-3 text-[34px] leading-tight font-bold tracking-tight">{t.language}</h1>
            )}

            {/* Search */}
            <div className="mb-5 flex items-center gap-1.5 h-9 px-2 rounded-[10px] bg-[var(--fill)]">
                <Search size={17} className="text-[var(--muted)] shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t.search}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[17px] placeholder:text-[var(--muted)]"
                />
                {query && (
                    <button onClick={() => setQuery('')} aria-label={t.cancel} className="text-[var(--muted)]">
                        <XCircle size={17} fill="currentColor" stroke="var(--cell)" />
                    </button>
                )}
            </div>

            {languages.length === 0 ? (
                <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="flex items-center pl-4 h-[58px]">
                            <div className="w-8 h-8 rounded-full bg-[var(--fill)] animate-pulse" />
                            <div className="ml-4 h-4 w-32 rounded bg-[var(--fill)] animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="text-center text-[17px] text-[var(--muted)] pt-10">{t.no_results}</p>
            ) : (
                <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden [&>*:last-child_.cell-body]:border-b-0">
                    {rows.map(l => {
                        const selected = picked === l.code;
                        // Skip the subtitle when it would just repeat the native name.
                        const subtitle = l.translated && l.translated.toLowerCase() !== l.name.toLowerCase() ? l.translated : '';
                        return (
                            <button
                                key={l.code}
                                data-haptic="selection"
                                onClick={() => choose(l.code)}
                                className="w-full flex items-center pl-4 text-left active:bg-[var(--cell-pressed)] transition-colors duration-75"
                            >
                                <div className="w-8 h-8 shrink-0">
                                    <FlagIcon code={l.code} emoji={l.flag} />
                                </div>
                                <div className="cell-body flex-1 min-w-0 ml-4 min-h-[58px] py-2 pr-4 flex items-center justify-between gap-3 border-b-[0.5px] border-[var(--separator)]">
                                    <div className="min-w-0">
                                        <div className="text-[17px] leading-tight truncate">{l.name}</div>
                                        {subtitle && <div className="text-[13px] text-[var(--muted)] truncate mt-0.5">{subtitle}</div>}
                                    </div>
                                    {selected && (
                                        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 25 }}>
                                            <Check size={20} strokeWidth={2.75} className="text-[var(--primary)]" />
                                        </motion.span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Request a language: opens the GitHub issue form, prefilled with what was searched */}
            {languages.length > 0 && (
                <section className="mt-8">
                    <div className="bg-[var(--cell)] rounded-[10px] overflow-hidden">
                        <button
                            onClick={() => openExternal(webApp, languageRequestUrl(query))}
                            className="w-full flex items-center gap-3 pl-4 pr-4 min-h-[44px] text-left text-[17px] text-[var(--primary)] active:bg-[var(--cell-pressed)] transition-colors duration-75"
                        >
                            <MessageSquarePlus size={20} className="shrink-0" />
                            {t.request_language}
                        </button>
                    </div>
                    <p className="px-4 pt-1.5 text-[13px] leading-snug text-[var(--muted)]">{t.request_language_hint}</p>
                </section>
            )}
        </div>
    );
}

/** Animated flag (Lottie), falling back to the emoji flag while loading or if missing. */
function FlagIcon({ code, emoji }: { code: string; emoji: string }) {
    const [animationData, setAnimationData] = useState<object | null>(null);

    useEffect(() => {
        let alive = true;
        fetch(`/lotties/flags/${code}.json`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => alive && data && setAnimationData(data))
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [code]);

    if (!animationData) {
        return <span className="w-full h-full flex items-center justify-center text-[26px] leading-none">{emoji}</span>;
    }
    return <Lottie autoplay src={animationData} loop={true} className="w-full h-full" />;
}
