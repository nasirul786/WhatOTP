import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
const languageAnim = require('../public/lotties/language-select.json');

interface Language {
    code: string;
    name: string;
    flag: string;
}

interface LanguageSelectorProps {
    onSelect: (code: string) => void;
    variant?: 'page' | 'drawer';
}

export default function LanguageSelector({ onSelect, variant = 'page' }: LanguageSelectorProps) {
    const [languages, setLanguages] = useState<Language[]>([]);

    useEffect(() => {
        fetch('/api/languages')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setLanguages(data);
            })
            .catch(console.error);
    }, []);

    const isPage = variant === 'page';

    return (
        <div className={isPage ? "h-screen bg-[var(--background)] flex flex-col" : "w-full flex flex-col items-center"}>
            {/* Fixed Header Section */}
            <div className={`flex-none pt-6 pb-6 px-6 z-10 flex flex-col items-center justify-center shrink-0 ${isPage ? 'bg-[var(--background)]' : ''}`}>
                <div className="w-48 h-48 mb-4">
                    <Lottie animationData={languageAnim} loop={true} />
                </div>
                <h2 className="text-2xl font-bold text-center text-[var(--foreground)]">Select Language</h2>
            </div>

            {/* Scrollable List Section */}
            <div className={isPage ? "flex-1 overflow-y-auto px-6 pb-12 w-full" : "w-full px-6 pb-12"}>
                <div className="grid gap-3 max-w-md mx-auto">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => onSelect(lang.code)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-fg)] transition-all active:scale-95 shadow-sm w-full"
                        >
                            <div className="w-10 h-10 shrink-0">
                                <FlagIcon code={lang.code} />
                            </div>
                            <span className="font-medium text-lg">{lang.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FlagIcon({ code }: { code: string }) {
    const [animationData, setAnimationData] = useState<any>(null);

    useEffect(() => {
        fetch(`/lotties/flags/${code}.json`)
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(console.error);
    }, [code]);

    if (!animationData) return <div className="w-12 h-12 bg-gray-200/20 rounded-full animate-pulse" />;

    return <Lottie animationData={animationData} loop={true} className="w-full h-full" />;
}
