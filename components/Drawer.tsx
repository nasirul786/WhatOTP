'use client';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useRef, useEffect } from 'react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, children }: DrawerProps) {
    // BackButton logic moved to parent (page.tsx) to coordinate with nested modals

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="overflow-y-auto overscroll-contain h-full">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
