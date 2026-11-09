'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

/** Small iOS-style confirmation pill shown near the top of the screen. Pass null to hide. */
export default function Toast({ message }: { message: string | null }) {
    return (
        <div className="fixed inset-x-0 top-[calc(var(--safe-top)+12px)] z-[70] flex justify-center pointer-events-none">
            <AnimatePresence>
                {message && (
                    <motion.div
                        key={message}
                        initial={{ opacity: 0, y: -16, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        className="flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full bg-[var(--cell)]/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-[15px] font-medium"
                    >
                        <span className="w-5 h-5 rounded-full bg-[#34c759] text-white flex items-center justify-center">
                            <Check size={13} strokeWidth={3} />
                        </span>
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
