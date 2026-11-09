'use client';
import { Lottie } from 'lottie-react';

interface DrawerHeaderProps {
    animation: object;
    title: string;
    hint?: string;
    error?: string;
    size?: string;
}

/** Animation, title and hint/error line shown at the top of a drawer. */
export default function DrawerHeader({ animation, title, hint, error, size = 'w-32 h-32' }: DrawerHeaderProps) {
    return (
        <div className="flex flex-col items-center">
            <div className={`${size} mb-4`}>
                <Lottie autoplay src={animation} loop={true} />
            </div>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-sm text-[var(--muted)] mb-8 text-center max-w-[280px] min-h-5">
                {error ? <span className="text-red-500 animate-shake">{error}</span> : hint}
            </p>
        </div>
    );
}
