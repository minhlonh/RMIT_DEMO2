'use client';

import { motion } from 'framer-motion';
import { speak, translate } from '@/lib/i18n';
import { useT, useUIModeStore } from '@/store/useUIModeStore';
import type { Language } from '@/types';

const OPTIONS: Array<{ code: Language; flag: string; name: string }> = [
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
];

interface LanguageSwitcherProps {
  /** Speak a confirmation in the chosen language. Defaults to on in Senior mode. */
  voiceGuidance?: boolean;
  /** "auto" = large toggles in Senior mode, compact otherwise. */
  variant?: 'auto' | 'large' | 'compact';
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function LanguageSwitcher({
  voiceGuidance,
  variant = 'auto',
}: LanguageSwitcherProps) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const setLanguage = useUIModeStore((s) => s.setLanguage);
  const t = useT();

  const large = variant === 'large' || (variant === 'auto' && mode === 'senior');
  const speakOnChange = voiceGuidance ?? mode === 'senior';

  const choose = (code: Language) => {
    if (code !== language) setLanguage(code);
    if (speakOnChange) speak(translate(code, 'common.languageChanged'), code);
  };

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={cx(
        'inline-flex items-center',
        large ? 'gap-3' : 'gap-1 rounded-full bg-white/70 p-1 ring-1 ring-black/10'
      )}
    >
      {OPTIONS.map(({ code, flag, name }) => {
        const active = code === language;
        return (
          <motion.button
            key={code}
            type="button"
            aria-pressed={active}
            lang={code}
            onClick={() => choose(code)}
            whileTap={{ scale: 0.95 }}
            className={cx(
              'inline-flex items-center justify-center gap-2 font-bold transition-colors',
              large
                ? 'min-h-[56px] min-w-[56px] rounded-2xl border-4 px-5 text-lg'
                : 'min-h-[40px] rounded-full px-3 text-sm',
              active
                ? large
                  ? 'border-hearth-bark bg-hearth-ember text-white'
                  : 'bg-slate-900 text-white'
                : large
                  ? 'border-hearth-bark bg-hearth-cream text-hearth-bark'
                  : 'text-slate-700 hover:bg-white'
            )}
          >
            <span className={large ? 'text-3xl' : 'text-lg'} aria-hidden="true">
              {flag}
            </span>
            <span>{large ? name : code.toUpperCase()}</span>
          </motion.button>
        );
      })}
    </div>
  );
}