'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTelegram } from './TelegramProvider';
import defaultEn from '@/lib/locales/en.json';

type TranslationContextType = {
    t: any;
    lang: string;
    setLanguage: (lang: string) => void;
};

const TranslationContext = createContext<TranslationContextType>({
    t: defaultEn.translations,
    lang: 'en',
    setLanguage: () => { }
});

export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const webApp = useTelegram();
    const [t, setT] = useState(defaultEn.translations);
    const [lang, setLang] = useState('en');

    const loadLanguage = async (targetLang: string) => {
        if (targetLang === 'en') {
            setT(defaultEn.translations);
            setLang('en');
            return;
        }

        try {
            const loaded = await import(`@/lib/locales/${targetLang}.json`);
            if (loaded && (loaded.translations || loaded.default?.translations)) {
                setT(loaded.translations || loaded.default.translations);
                setLang(targetLang);
            }
        } catch (e) {
            console.warn(`Translation for ${targetLang} not found, falling back to English.`);
            setT(defaultEn.translations);
            setLang('en');
        }
    };

    // Initial detection from WebApp (fallback if auth doesn't override)
    useEffect(() => {
        if (webApp?.initDataUnsafe?.user?.language_code) {
            const userLang = webApp.initDataUnsafe.user.language_code;
            const normalized = userLang.startsWith('hi') ? 'hi' : 'en';
            // Only auto-set if still 'en' (to avoid overwriting DB preference if set instantly)
            // Actually, we should probably allow this to set initial, and then Auth can overwrite it.
            if (lang === 'en' && normalized !== 'en') {
                loadLanguage(normalized);
            }
        }
    }, [webApp]);

    return (
        <TranslationContext.Provider value={{ t, lang, setLanguage: loadLanguage }}>
            {children}
        </TranslationContext.Provider>
    );
}

export const useTranslation = () => useContext(TranslationContext);
