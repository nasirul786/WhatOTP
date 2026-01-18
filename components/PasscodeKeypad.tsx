import React from 'react';
import { Delete } from 'lucide-react';
import { useTelegram } from '@/components/TelegramProvider';

interface PasscodeKeypadProps {
    onPress: (digit: string) => void;
    onDelete: () => void;
    biometricAuth?: () => void;
}

export default function PasscodeKeypad({ onPress, onDelete, biometricAuth }: PasscodeKeypadProps) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const webApp = useTelegram();

    const handlePress = (k: string) => {
        webApp?.HapticFeedback.impactOccurred('light');
        onPress(k);
    };

    const handleDelete = () => {
        webApp?.HapticFeedback.impactOccurred('medium');
        onDelete();
    };

    return (
        <div className="w-full max-w-xs mx-auto">
            <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                {keys.map((k) => (
                    <button
                        key={k}
                        className="h-16 w-16 rounded-2xl text-2xl font-medium bg-[var(--surface)] hover:bg-[var(--surface)]/80 active:bg-[var(--surface)]/60 transition-colors flex items-center justify-center select-none shadow-sm"
                        onClick={() => handlePress(k)}
                    >
                        {k}
                    </button>
                ))}

                {/* Empty bottom left or Biometric */}
                <div className="flex items-center justify-center">
                    {/* Placeholder or biometric button could go here */}
                </div>

                <button
                    className="h-16 w-16 rounded-2xl text-2xl font-medium bg-[var(--surface)] hover:bg-[var(--surface)]/80 active:bg-[var(--surface)]/60 transition-colors flex items-center justify-center select-none shadow-sm"
                    onClick={() => handlePress('0')}
                >
                    0
                </button>

                <button
                    className="h-16 w-16 rounded-2xl text-xl bg-transparent hover:bg-[var(--surface)] active:bg-[var(--surface)]/80 transition-colors flex items-center justify-center text-[var(--muted)]"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        handleDelete();
                    }}
                    onClick={(e) => e.preventDefault()}
                >
                    <Delete size={28} />
                </button>
            </div>
        </div>
    );
}
