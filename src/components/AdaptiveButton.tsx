'use client';

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps, type TargetAndTransition } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useUIModeStore } from '@/store/useUIModeStore';
import type { UIMode } from '@/types';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AdaptiveButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** Senior: 56px+ targets, 20px bold text, thick high-contrast borders (WCAG AAA). */
const SHAPE: Record<UIMode, string> = {
  senior: 'min-h-[56px] min-w-[56px] px-7 py-3 text-xl font-bold rounded-2xl border-4',
  junior: 'min-h-[48px] px-5 py-2.5 text-base font-extrabold rounded-full',
  standard: 'min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg',
};

const STYLE: Record<UIMode, Record<Variant, string>> = {
  senior: {
    primary: 'bg-hearth-ember text-white border-hearth-bark hover:bg-[#6F2E0D]',
    secondary: 'bg-hearth-cream text-hearth-bark border-hearth-bark hover:bg-[#F6E9D8]',
    danger: 'bg-[#9B1C1C] text-white border-[#4A0D0D] hover:bg-[#7F1616]',
    ghost: 'bg-transparent text-hearth-bark border-transparent underline underline-offset-4',
  },
  junior: {
    primary:
      'bg-gradient-to-r from-pink-300 via-purple-300 to-sky-300 text-purple-950 shadow-lg shadow-pink-200',
    secondary: 'bg-gradient-to-r from-amber-200 to-lime-200 text-amber-950 shadow-md shadow-amber-100',
    danger: 'bg-gradient-to-r from-rose-300 to-orange-300 text-rose-950 shadow-md shadow-rose-200',
    ghost: 'bg-white/60 text-purple-800 hover:bg-white/90',
  },
  standard: {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  },
};

const HOVER: Record<UIMode, TargetAndTransition> = {
  senior: { scale: 1.02 },
  junior: { scale: 1.07, rotate: -1.5 },
  standard: { scale: 1.01 },
};

const TAP: Record<UIMode, TargetAndTransition> = {
  senior: { scale: 0.97 },
  junior: { scale: 0.92 },
  standard: { scale: 0.98 },
};

export default function AdaptiveButton({
  variant = 'primary',
  icon,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  type = 'button',
  children,
  ...rest
}: AdaptiveButtonProps) {
  const mode = useUIModeStore((s) => s.mode);
  const inactive = Boolean(disabled) || loading;

  return (
    <motion.button
      type={type}
      disabled={inactive}
      whileHover={inactive ? undefined : HOVER[mode]}
      whileTap={inactive ? undefined : TAP[mode]}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        SHAPE[mode],
        STYLE[mode][variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </motion.button>
  );
}