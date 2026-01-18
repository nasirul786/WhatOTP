'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, ScanLine } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface MultiButtonProps {
  onNewEntry: () => void;
  onSettings: () => void;
}

export default function MultiButton({ onNewEntry, onSettings }: MultiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const toggleOpen = () => {
    // Haptic feedback if available via window
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
    }
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    setIsOpen(false);
    action();
  };

  // Animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  const labelVariants = {
    hidden: { opacity: 0, x: 10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Backdrop to close on click outside (optional but good UX, makes the FAB focus modal) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed right-6 bottom-6 z-30 flex flex-col items-end gap-4 pointer-events-none">

        {/* Container for buttons needs pointer-events-auto */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Settings Button */}
                <div className="flex items-center gap-3 pr-1">
                  <motion.div
                    variants={labelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="bg-[var(--surface)] text-[var(--foreground)] px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg border border-[var(--border)]"
                  >
                    {t.settings}
                  </motion.div>
                  <motion.button
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={() => handleAction(onSettings)}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors border border-[var(--border)]"
                  >
                    <Settings size={22} className="text-[var(--primary)]" />
                  </motion.button>
                </div>

                {/* New Entry Button */}
                <div className="flex items-center gap-3 pr-1">
                  <motion.div
                    variants={labelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: 0.05 }}
                    className="bg-[var(--surface)] text-[var(--foreground)] px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg border border-[var(--border)]"
                  >
                    {t.new_entry}
                  </motion.div>
                  <motion.button
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: 0.05 }}
                    onClick={() => handleAction(onNewEntry)}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors border border-[var(--border)]"
                  >
                    <ScanLine size={22} className="text-[var(--primary)]" />
                  </motion.button>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Main Toggle Button */}
          <button
            onClick={toggleOpen}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all z-40 ${isOpen
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[var(--primary)] text-[var(--primary-fg)] hover:scale-105 active:scale-95'
              }`}
          >
            <motion.div
              animate={{ rotate: isOpen ? 135 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Plus size={28} />
            </motion.div>
          </button>
        </div>
      </div>
    </>
  );
}
