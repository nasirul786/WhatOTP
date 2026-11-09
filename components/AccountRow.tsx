'use client';
import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import { haptic } from '@/lib/haptics';
import { useTranslation } from '@/lib/useTranslation';
import { useTotp, formatCode } from '@/lib/useTotp';

export interface Account {
    id: number;
    service_name: string;
    issuer: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    slug?: string;
    hex?: string;
}

const ACTIONS_WIDTH = 148;
/** Max finger movement (px) that still counts as a tap. */
const TAP_SLOP = 8;
/** Release speed (px/s) that counts as a flick, opening/closing regardless of distance. */
const FLICK_VELOCITY = 700;
const SPRING = { type: 'spring', stiffness: 500, damping: 42 } as const;
const RED = '#ff3b30';

function CountdownRing({ remaining, period, color }: { remaining: number; period: number; color: string }) {
    const size = 30;
    const stroke = 2.5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - remaining / period)}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
            </svg>
            <span
                className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums"
                style={{ color }}
            >
                {remaining}
            </span>
        </div>
    );
}

interface AccountRowProps {
    account: Account;
    /** Whether the swipe actions are revealed. Only one row is open at a time (owned by the list). */
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCopy: (code: string) => void;
    onEdit: (account: Account) => void;
    onDelete: (id: number) => void;
}

/** A code cell. Tap to copy; swipe left for Edit / Delete, like iOS Mail. */
export default function AccountRow({ account, isOpen, onOpenChange, onCopy, onEdit, onDelete }: AccountRowProps) {
    const { t } = useTranslation();
    const { code, remaining, period } = useTotp(account);
    const gesture = useRef({ x: 0, y: 0, dragged: false });
    const pastHalf = useRef(false);

    // Row offset is driven explicitly so a release always springs to fully open or fully closed.
    const x = useMotionValue(0);
    const settle = (open: boolean) => animate(x, open ? -ACTIONS_WIDTH : 0, SPRING);
    useEffect(() => {
        const controls = settle(isOpen);
        return () => controls.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    const urgent = remaining <= 5;
    const accent = urgent ? RED : 'var(--primary)';
    const subtitle = account.issuer && account.issuer !== account.service_name ? account.issuer : null;

    const action = (fn: () => void) => () => {
        onOpenChange(false);
        fn();
    };

    return (
        <div className="relative overflow-hidden">
            {/* Actions revealed behind the cell */}
            <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
                <button
                    onClick={action(() => onEdit(account))}
                    className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#8e8e93] text-white text-[13px] font-medium"
                >
                    <Pencil size={20} />
                    {t.edit}
                </button>
                <button
                    data-haptic="medium"
                    onClick={action(() => onDelete(account.id))}
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-white text-[13px] font-medium"
                    style={{ backgroundColor: RED }}
                >
                    <Trash2 size={20} />
                    {t.delete}
                </button>
            </div>

            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -ACTIONS_WIDTH, right: 0 }}
                dragElastic={{ left: 0.15, right: 0.05 }}
                dragMomentum={false}
                style={{ x }}
                onPointerDown={(e) => {
                    // Page coordinates, to match framer's info.point in onTap.
                    gesture.current = { x: e.pageX, y: e.pageY, dragged: false };
                }}
                onDragStart={() => {
                    gesture.current.dragged = true;
                    pastHalf.current = isOpen;
                }}
                onDrag={() => {
                    // Tick when crossing the point where releasing would open / close.
                    const past = x.get() < -ACTIONS_WIDTH / 2;
                    if (past !== pastHalf.current) {
                        pastHalf.current = past;
                        haptic.selection();
                    }
                }}
                onDragEnd={(_, info) => {
                    // Decide by where the row is when released (more than half revealed = open),
                    // unless it was a quick flick. A short swipe therefore snaps back.
                    let next = x.get() < -ACTIONS_WIDTH / 2;
                    if (info.velocity.x < -FLICK_VELOCITY) next = true;
                    else if (info.velocity.x > FLICK_VELOCITY) next = false;

                    if (next !== isOpen) {
                        haptic.impact(next ? 'medium' : 'light');
                        onOpenChange(next); // the effect below animates to the new position
                    } else {
                        settle(next); // same state: still animate back to the resting position
                    }
                }}
                onTap={(_, info) => {
                    // A swipe is not a tap: ignore if the row was dragged or the finger moved noticeably.
                    const g = gesture.current;
                    if (g.dragged || Math.hypot(info.point.x - g.x, info.point.y - g.y) > TAP_SLOP) return;
                    if (isOpen) {
                        haptic.impact('light');
                        onOpenChange(false);
                    } else if (code) {
                        onCopy(code);
                    }
                }}
                className="relative bg-[var(--cell)] active:bg-[var(--cell-pressed)] flex items-center pl-4 cursor-pointer select-none transition-colors duration-75"
            >
                <BrandIcon
                    slug={account.slug} hex={account.hex} name={account.service_name}
                    shape="w-10 h-10 rounded-[10px]" textSize="text-lg"
                />
                <div className="cell-body flex-1 min-w-0 ml-3 flex items-center gap-3 py-2.5 pr-4 border-b-[0.5px] border-[var(--separator)]">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-[15px] font-semibold truncate">{account.service_name}</span>
                            {subtitle && <span className="text-[13px] text-[var(--muted)] truncate">{subtitle}</span>}
                        </div>
                        <div
                            className="text-[30px] leading-tight font-semibold tracking-wide tabular-nums transition-colors duration-300"
                            style={{ color: accent }}
                        >
                            {code ? formatCode(code) : '— — —'}
                        </div>
                    </div>
                    <CountdownRing remaining={remaining} period={period} color={urgent ? RED : 'var(--muted)'} />
                </div>
            </motion.div>
        </div>
    );
}
