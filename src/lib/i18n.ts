import vi from '@locales/vi.json';
import en from '@locales/en.json';
import type { Language } from '@/types';

type Dict = { [key: string]: string | Dict };

const dictionaries: Record<Language, Dict> = {
  vi: vi as unknown as Dict,
  en: en as unknown as Dict,
};

export type TranslateVars = Record<string, string | number>;
export type TFn = (key: string, vars?: TranslateVars) => string;

/** Looks up "a.b.c" in the dictionary and interpolates {vars}. Falls back to the key. */
export function translate(lang: Language, key: string, vars?: TranslateVars): string {
  let node: string | Dict | undefined = dictionaries[lang];
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = node[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

export const SPEECH_LANG: Record<Language, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

/** Reads text aloud with the browser's speech synthesis (no-op on the server). */
export function speak(text: string, lang: Language, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[lang];
  utterance.rate = 0.9;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}