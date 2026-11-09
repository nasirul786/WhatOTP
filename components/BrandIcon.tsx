'use client';
import * as simpleIcons from 'simple-icons';

interface BrandIconProps {
    slug?: string;
    hex?: string;
    name: string;
    textSize?: string;
    /** Size + corner classes; defaults to a 40px circle. */
    shape?: string;
}

/** Round badge showing a brand's simple-icons glyph, or the name's initial as a fallback. */
export default function BrandIcon({ slug, hex, name, textSize = 'text-base', shape = 'w-10 h-10 rounded-full' }: BrandIconProps) {
    const icon = slug ? (simpleIcons as any)[`si${slug}`] : null;

    return (
        <div
            className={`${shape} flex items-center justify-center shadow-sm shrink-0`}
            style={{ backgroundColor: hex || 'var(--primary)', color: '#ffffff' }}
        >
            {icon ? (
                <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d={icon.path} />
                </svg>
            ) : (
                <span className={`font-bold ${textSize}`}>{(name[0] || '?').toUpperCase()}</span>
            )}
        </div>
    );
}
