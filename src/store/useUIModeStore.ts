'use client';

import { useCallback } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { translate, type TFn, type TranslateVars } from '@/lib/i18n';
import type { Language, Profile, UIMode } from '@/types';

const DEMO_CREATED_AT = '2024-01-01T00:00:00.000Z';

/** Demo family used until real Supabase Auth profiles are plugged in. */
export const DEMO_PROFILES: Record<UIMode, Profile> = {
  senior: {
    id: 'demo-grandpa',
    full_name: 'Ông Hùng',
    role: 'grandparent',
    ui_mode: 'senior',
    preferred_language: 'vi',
    avatar_url: null,
    birth_year: 1952,
    family_id: null,
    created_at: DEMO_CREATED_AT,
  },
  standard: {
    id: 'demo-mom',
    full_name: 'Chị Lan',
    role: 'parent',
    ui_mode: 'standard',
    preferred_language: 'vi',
    avatar_url: null,
    birth_year: 1984,
    family_id: null,
    created_at: DEMO_CREATED_AT,
  },
  junior: {
    id: 'demo-minh',
    full_name: 'Bé Minh',
    role: 'child',
    ui_mode: 'junior',
    preferred_language: 'vi',
    avatar_url: null,
    birth_year: 2013,
    family_id: null,
    created_at: DEMO_CREATED_AT,
  },
};

interface UIState {
  mode: UIMode;
  language: Language;
  profile: Profile;
  setMode: (mode: UIMode) => void;
  setLanguage: (language: Language) => void;
  setProfile: (profile: Profile) => void;
}

export const useUIModeStore = create<UIState>()(
  persist(
    (set, get) => ({
      mode: 'standard',
      language: 'vi',
      profile: DEMO_PROFILES.standard,

      setMode: (mode) => {
        const current = get().profile;
        // While in demo mode, switching UI mode also switches the acting family member.
        const profile = current.id.startsWith('demo-') ? DEMO_PROFILES[mode] : current;
        set({ mode, profile });
      },

      setLanguage: (language) => set({ language }),

      setProfile: (profile) =>
        set({
          profile,
          mode: profile.ui_mode,
          language: profile.preferred_language,
        }),
    }),
    {
      name: 'gia-dinh-so-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        language: state.language,
        profile: state.profile,
      }),
      // Rehydrated manually in <AppProviders/> to avoid SSR hydration mismatches.
      skipHydration: true,
    }
  )
);

/** Returns a translation function bound to the active language. */
export function useT(): TFn {
  const language = useUIModeStore((s) => s.language);
  return useCallback(
    (key: string, vars?: TranslateVars) => translate(language, key, vars),
    [language]
  );
}