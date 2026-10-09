'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useUIModeStore } from '@/store/useUIModeStore';
import type { UIMode } from '@/types';

type Tone = 'default' | 'warm' | 'success' | 'warning';

interface AdaptiveCardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

const SHAPE: Record<UIMode, string> = {
  senior: 'rounded-3xl border-4 border-hearth-bark p-6 text-hearth-ink shadow-md sm:p-8',
  junior: 'rounded-[2rem] border-2 p-6 shadow-xl shadow-pink-100 backdrop-blur',
  standard: 'rounded-xl border p-5 shadow-sm',
};

const TONE: Record<UIMode, Record<Tone, string>> = {
  senior: {
    default: 'bg-hearth-cream',
    warm: 'bg-[#FFF4E0]',
    success: 'bg-[#E8F5E9]',
    warning: 'bg-[#FFF1D6]',
  },
  junior: {
    default: 'bg-white/85 border-pink-200',
    warm: 'bg-amber-50/90 border-amber-200',
    success: 'bg-emerald-50/90 border-emerald-200',
    warning: 'bg-rose-50/90 border-rose-200',
  },
  standard: {
    default: 'bg-white border-slate-200',
    warm: 'bg-amber-50 border-amber-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-red-50 border-red-200',
  },
};

const TITLE: Record<UIMode, string> = {
  senior: 'text-2xl font-extrabold',
  junior: 'text-xl font-extrabold text-purple-900',
  standard: 'text-base font-semibold text-slate-900',
};

const SUBTITLE: Record<UIMode, string> = {
  senior: 'mt-1 text-lg',
  junior: 'mt-1 text-sm text-purple-700',
  standard: 'mt-0.5 text-sm text-slate-500',
};

export default function AdaptiveCard({
  id,
  title,
  subtitle,
  icon,
  tone = 'default',
  className,
  children,
}: AdaptiveCardProps) {
  const mode = useUIModeStore((s) => s.mode);

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: mode === 'junior' ? 0.45 : 0.25 }}
      className={cx(SHAPE[mode], TONE[mode][tone], className)}
    >
      {(title || icon) && (
        <header className="mb-4 flex items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div>
            {title && <h2 className={TITLE[mode]}>{title}</h2>}
            {subtitle && <p className={SUBTITLE[mode]}>{subtitle}</p>}
          </div>
        </header>
      )}
      {children}
    </motion.section>
  );
}