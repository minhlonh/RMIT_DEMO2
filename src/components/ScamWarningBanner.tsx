'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldAlert, Users, Volume2, VolumeX } from 'lucide-react';
import AdaptiveButton from '@/components/AdaptiveButton';
import { speak, stopSpeaking } from '@/lib/i18n';
import { useT, useUIModeStore } from '@/store/useUIModeStore';
import type { RiskLevel } from '@/types';

interface ScamWarningBannerProps {
  riskLevel: RiskLevel;
  reason: string | null;
  onDismiss?: () => void;
  onAskFamily?: () => void;
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function ScamWarningBanner({
  riskLevel,
  reason,
  onDismiss,
  onAskFamily,
}: ScamWarningBannerProps) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const t = useT();
  const [speaking, setSpeaking] = useState(false);

  const level: 'medium' | 'high' = riskLevel === 'high' ? 'high' : 'medium';
  const senior = mode === 'senior';
  const gentle = t(`safety.gentle.${level}`);
  const tips = [t('safety.tip1'), t('safety.tip2'), t('safety.tip3')];

  const palette =
    level === 'high'
      ? senior
        ? 'border-red-900 bg-red-50 text-red-950'
        : 'border-red-300 bg-red-50 text-red-950'
      : senior
        ? 'border-amber-900 bg-amber-50 text-amber-950'
        : 'border-amber-300 bg-amber-50 text-amber-950';

  const shape = senior
    ? 'rounded-2xl border-4 p-6 text-xl'
    : mode === 'junior'
      ? 'rounded-3xl border-2 p-4 text-base'
      : 'rounded-lg border p-4 text-sm';

  const toggleSpeech = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const text = [t('safety.scamTitle'), gentle, reason, ...tips].filter(Boolean).join('. ');
    speak(text, language, () => setSpeaking(false));
  };

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cx(shape, palette)}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className={cx('shrink-0', senior ? 'h-10 w-10' : 'h-6 w-6')}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className={cx('font-extrabold', senior ? 'text-2xl' : 'text-base')}>
              {t('safety.scamTitle')}
            </p>
            <p className="mt-1 font-semibold opacity-80">{t(`safety.risk.${level}`)}</p>
          </div>

          <p className={senior ? 'font-semibold' : undefined}>{gentle}</p>

          {reason && (
            <div className="rounded-xl bg-white/70 p-3">
              <p className="font-bold">{t('safety.reasonLabel')}</p>
              <p className="mt-1">{reason}</p>
            </div>
          )}

          <div>
            <p className="font-bold">{t('safety.tipsTitle')}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <AdaptiveButton
              variant="secondary"
              icon={speaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              onClick={toggleSpeech}
            >
              {speaking ? t('common.stopReading') : t('common.readAloud')}
            </AdaptiveButton>
            {onAskFamily && (
              <AdaptiveButton
                variant="danger"
                icon={<Users className="h-5 w-5" />}
                onClick={onAskFamily}
              >
                {t('safety.askFamily')}
              </AdaptiveButton>
            )}
            {onDismiss && (
              <AdaptiveButton
                variant="ghost"
                icon={<Check className="h-5 w-5" />}
                onClick={() => {
                  stopSpeaking();
                  onDismiss();
                }}
              >
                {t('safety.understood')}
              </AdaptiveButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}