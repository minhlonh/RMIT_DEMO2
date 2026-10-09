'use client';

import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useUIModeStore } from '@/store/useUIModeStore';

/**
 * Multi-lingual / multi-mode context wrapper:
 *  - rehydrates the persisted Zustand store after mount (no SSR mismatch)
 *  - mirrors the active language and UI mode onto <html lang data-mode>
 *  - honours the OS "reduce motion" setting for every Framer Motion animation
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);

  useEffect(() => {
    void useUIModeStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.mode = mode;
  }, [language, mode]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}