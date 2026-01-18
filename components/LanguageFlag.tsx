import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface LanguageFlagProps {
    code: string;
    emoji: string;
}

export default function LanguageFlag({ code, emoji }: LanguageFlagProps) {
    const [animationData, setAnimationData] = useState<any>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        fetch(`/lotties/flags/${code}.json`)
            .then(res => {
                if (!res.ok) throw new Error("No lottie");
                return res.json();
            })
            .then(data => {
                if (isMounted) setAnimationData(data);
            })
            .catch(() => {
                if (isMounted) setError(true);
            });

        return () => { isMounted = false; };
    }, [code]);

    if (error || !animationData) {
        return <span className="text-3xl">{emoji}</span>;
    }

    return (
        <div className="w-10 h-10 flex-shrink-0">
            <Lottie animationData={animationData} loop={true} />
        </div>
    );
}
