'use client';
import { AnimatePresence, motion } from 'framer-motion';
import BlurBackdrop from '@/components/BlurBackdrop';

export interface SheetAction {
    label: string;
    onClick: () => void;
    destructive?: boolean;
}

interface ActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    actions: SheetAction[];
    cancelText: string;
}

/** iOS-style action sheet: grouped actions plus a separate Cancel button, sliding up from the bottom. */
export default function ActionSheet({ isOpen, onClose, title, message, actions, cancelText }: ActionSheetProps) {
    return (
        <>
        <BlurBackdrop show={isOpen} onClick={onClose} />
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[calc(0.5rem+var(--safe-bottom))] max-w-md mx-auto"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                    >
                        <div className="rounded-[14px] overflow-hidden bg-[var(--surface)]/95 backdrop-blur-xl divide-y divide-[var(--border)]">
                            {(title || message) && (
                                <div className="px-4 py-3.5 text-center">
                                    {title && <p className="text-[13px] font-semibold text-[var(--muted)]">{title}</p>}
                                    {message && <p className="text-[13px] text-[var(--muted)] mt-0.5">{message}</p>}
                                </div>
                            )}
                            {actions.map(action => (
                                <button
                                    key={action.label}
                                    data-haptic={action.destructive ? 'medium' : 'light'}
                                    onClick={() => {
                                        onClose();
                                        action.onClick();
                                    }}
                                    className={`w-full h-14 text-[17px] active:bg-[var(--input-bg)] transition-colors ${action.destructive ? 'text-red-500' : 'text-[var(--primary)]'
                                        }`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-2 w-full h-14 rounded-[14px] bg-[var(--surface)] text-[17px] font-semibold text-[var(--primary)] active:bg-[var(--input-bg)] transition-colors"
                        >
                            {cancelText}
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
        </>
    );
}
