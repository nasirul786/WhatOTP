'use client';
import { AnimatePresence, motion } from 'framer-motion';

const HIDDEN = { opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' };
const SHOWN = { opacity: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' };

interface BlurBackdropProps {
    show: boolean;
    onClick?: () => void;
    /** Stacking order; defaults below sheets (z-50). */
    zIndex?: number;
}

/** Dims and softly blurs whatever is behind a sheet or popup, fading the blur in and out. */
export default function BlurBackdrop({ show, onClick, zIndex = 49 }: BlurBackdropProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className={`fixed inset-0 bg-black/25 ${onClick ? '' : 'pointer-events-none'}`}
                    style={{ zIndex }}
                    initial={HIDDEN}
                    animate={SHOWN}
                    exit={HIDDEN}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    onClick={onClick}
                />
            )}
        </AnimatePresence>
    );
}
