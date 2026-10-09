'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookHeart,
  Flame,
  Gamepad2,
  Heart,
  Home,
  Languages,
  LayoutDashboard,
  Lightbulb,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import AdaptiveButton from '@/components/AdaptiveButton';
import AdaptiveCard from '@/components/AdaptiveCard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MemoryBookPdfExporter from '@/components/MemoryBookPdfExporter';
import ScamWarningBanner from '@/components/ScamWarningBanner';
import VoiceRecordModal, { type VoiceResult } from '@/components/VoiceRecordModal';
import { speak, stopSpeaking } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useT, useUIModeStore } from '@/store/useUIModeStore';
import type { Language, MemorySparkResponse, Message, UIMode } from '@/types';

/* ------------------------------ helpers ---------------------------------- */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function useSenderName() {
  const t = useT();
  const members = useFamilyStore((s) => s.members);
  return useCallback(
    (id: string) => members.find((m) => m.id === id)?.full_name ?? t('wall.unknownSender'),
    [members, t]
  );
}

const formatStamp = (iso: string, language: Language) =>
  new Date(iso).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const inputClass = (mode: UIMode) =>
  cx(
    'w-full bg-white text-inherit',
    mode === 'senior'
      ? 'rounded-2xl border-4 border-hearth-bark px-4 py-3 text-xl text-hearth-ink'
      : mode === 'junior'
        ? 'rounded-2xl border-2 border-purple-200 px-4 py-3 text-base focus:border-pink-300'
        : 'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900'
  );

const DEMO_MILESTONES = [
  { key: 'ai.milestoneBirthday', date: '1952-11-04' },
  { key: 'ai.milestoneWedding', date: '1976-12-20' },
] as const;

const BADGE_IDS = ['firstHello', 'streak3', 'streak7', 'storyteller', 'scamSpotter'] as const;

/* ------------------------------- header ---------------------------------- */

const MODE_META: Array<{ mode: UIMode; icon: LucideIcon }> = [
  { mode: 'senior', icon: Sun },
  { mode: 'standard', icon: LayoutDashboard },
  { mode: 'junior', icon: Gamepad2 },
];

function ModeSwitcher() {
  const mode = useUIModeStore((s) => s.mode);
  const setMode = useUIModeStore((s) => s.setMode);
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t('common.mode')}
      className={cx('inline-flex flex-wrap items-center', mode === 'senior' ? 'gap-3' : 'gap-1')}
    >
      {MODE_META.map(({ mode: value, icon: Icon }) => {
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(value)}
            className={cx(
              'inline-flex items-center gap-2 font-bold transition-colors',
              mode === 'senior'
                ? 'min-h-[56px] rounded-2xl border-4 px-5 text-lg'
                : mode === 'junior'
                  ? 'min-h-[44px] rounded-full px-4 text-sm'
                  : 'min-h-[40px] rounded-lg px-3 text-sm',
              active
                ? mode === 'senior'
                  ? 'border-hearth-bark bg-hearth-ember text-white'
                  : mode === 'junior'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-indigo-600 text-white'
                : mode === 'senior'
                  ? 'border-hearth-bark bg-hearth-cream text-hearth-bark'
                  : mode === 'junior'
                    ? 'bg-white/70 text-purple-800'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {t(`modes.${value}`)}
          </button>
        );
      })}
    </div>
  );
}

function Header() {
  const mode = useUIModeStore((s) => s.mode);
  const t = useT();

  return (
    <header
      className={cx(
        'flex flex-wrap items-center justify-between gap-4',
        mode === 'senior' && 'flex-col items-stretch'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cx(
            'grid shrink-0 place-items-center text-white',
            mode === 'senior'
              ? 'h-14 w-14 rounded-2xl bg-hearth-ember'
              : mode === 'junior'
                ? 'h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-sky-400'
                : 'h-10 w-10 rounded-lg bg-indigo-600'
          )}
        >
          <Home className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className={cx('font-extrabold leading-tight', mode === 'senior' ? 'text-3xl' : 'text-xl')}>
            {t('common.appName')}
          </h1>
          <p className={cx('opacity-80', mode === 'senior' ? 'text-lg' : 'text-sm')}>
            {t('common.tagline')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ModeSwitcher />
        <LanguageSwitcher />
      </div>
    </header>
  );
}

/* -------------------------------- heroes --------------------------------- */

function SeniorHero({ onOpenVoice }: { onOpenVoice: () => void }) {
  const t = useT();
  const language = useUIModeStore((s) => s.language);
  const profile = useUIModeStore((s) => s.profile);
  const messages = useFamilyStore((s) => s.messages);
  const senderName = useSenderName();
  const [reading, setReading] = useState(false);

  const toggleReading = () => {
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    const latest = messages.slice(-3).map((m) => {
      const extra = m.slang_translation ? ` ${m.slang_translation.replace(/\n/g, ' ')}` : '';
      return `${senderName(m.sender_id)}: ${m.content}.${extra}`;
    });
    setReading(true);
    speak([t('senior.readIntro'), ...latest].join(' '), language, () => setReading(false));
  };

  return (
    <AdaptiveCard tone="warm" className="text-center">
      <h2 className="text-3xl font-extrabold">{t('senior.heroTitle', { name: profile.full_name })}</h2>
      <p className="mt-2 text-xl">{t('senior.helperHint')}</p>

      <p className="mx-auto mt-6 inline-block rounded-3xl border-4 border-hearth-bark bg-white px-6 py-3 text-2xl font-bold">
        “{t('senior.greeting')}”
      </p>

      <div className="mt-8 flex flex-col items-center gap-6">
        <motion.button
          type="button"
          onClick={onOpenVoice}
          whileTap={{ scale: 0.94 }}
          aria-label={t('senior.speakButton')}
          className="grid h-36 w-36 place-items-center rounded-full border-4 border-hearth-bark bg-hearth-ember text-white shadow-lg"
        >
          <Mic className="h-16 w-16" aria-hidden="true" />
        </motion.button>
        <p className="text-2xl font-bold">{t('senior.speakButton')}</p>

        <AdaptiveButton
          variant="secondary"
          fullWidth
          onClick={toggleReading}
          icon={reading ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
        >
          {reading ? t('common.stopReading') : t('senior.readMessages')}
        </AdaptiveButton>
      </div>
    </AdaptiveCard>
  );
}

function JuniorHero() {
  const t = useT();
  const profile = useUIModeStore((s) => s.profile);
  const streak = useFamilyStore((s) => s.streak);
  const messages = useFamilyStore((s) => s.messages);
  const memories = useFamilyStore((s) => s.memories);

  const unlocked: Record<(typeof BADGE_IDS)[number], boolean> = {
    firstHello: messages.some((m) => m.sender_id === profile.id),
    streak3: streak >= 3,
    streak7: streak >= 7,
    storyteller: memories.length >= 3,
    scamSpotter: messages.some((m) => m.is_scam_flagged),
  };

  return (
    <AdaptiveCard tone="default">
      <h2 className="text-2xl font-extrabold text-purple-900">
        {t('junior.heroTitle', { name: profile.full_name })}
      </h2>

      <div className="mt-5 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-orange-100 to-pink-100 p-4">
        <motion.span
          animate={{ scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-400 text-white shadow-lg"
        >
          <Flame className="h-9 w-9" aria-hidden="true" />
        </motion.span>
        <div>
          <p className="text-xl font-extrabold text-orange-900">{t('junior.streak', { days: streak })}</p>
          <p className="text-sm text-orange-800">{t('junior.streakHint')}</p>
        </div>
      </div>

      <h3 className="mt-6 text-lg font-extrabold text-purple-900">{t('junior.badgesTitle')}</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BADGE_IDS.map((id, index) => {
          const isOn = unlocked[id];
          return (
            <motion.li
              key={id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06 }}
              className={cx(
                'rounded-2xl p-3 text-center',
                isOn ? 'bg-gradient-to-b from-yellow-100 to-amber-200 shadow-md' : 'bg-white/60 opacity-60'
              )}
            >
              <Award
                className={cx('mx-auto h-8 w-8', isOn ? 'text-amber-600' : 'text-slate-400')}
                aria-hidden="true"
              />
              <p className="mt-1 text-sm font-bold">{t(`junior.badges.${id}.name`)}</p>
              <p className="mt-0.5 text-xs">{t(`junior.badges.${id}.desc`)}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide">
                {isOn ? t('junior.unlocked') : t('junior.locked')}
              </p>
            </motion.li>
          );
        })}
      </ul>
    </AdaptiveCard>
  );
}

function StandardHero() {
  const t = useT();
  const language = useUIModeStore((s) => s.language);
  const messages = useFamilyStore((s) => s.messages);
  const memories = useFamilyStore((s) => s.memories);
  const senderName = useSenderName();
  const mounted = useMounted();

  const flagged = messages
    .filter((m) => m.is_scam_flagged)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const stats = [
    { label: t('standard.statMessages'), value: messages.length },
    { label: t('standard.statMemories'), value: memories.length },
    { label: t('standard.statBlocked'), value: flagged.length },
  ];
  const safeguards = [
    t('standard.safeguardScam'),
    t('standard.safeguardSlang'),
    t('standard.safeguardFeed'),
  ];

  return (
    <AdaptiveCard title={t('standard.heroTitle')} subtitle={t('standard.heroSubtitle')}>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 p-3 text-center ring-1 ring-slate-200">
            <dd className="text-2xl font-bold text-indigo-700">{stat.value}</dd>
            <dt className="text-xs text-slate-500">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{t('standard.safeguardsTitle')}</h3>
          <ul className="mt-2 space-y-2">
            {safeguards.map((label) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
                <span className="text-xs font-semibold">{t('standard.active')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">{t('standard.safetyLogTitle')}</h3>
          {flagged.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('standard.safetyLogEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {flagged.map((m) => (
                <li key={m.id} className="rounded-lg bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">
                  <p className="text-xs font-semibold">
                    {senderName(m.sender_id)}
                    {mounted ? ` · ${formatStamp(m.created_at, language)}` : ''}
                  </p>
                  {m.scam_reason && <p className="mt-1">{m.scam_reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdaptiveCard>
  );
}

/* ------------------------------ family wall ------------------------------ */

function MessageItem({ message, mounted }: { message: Message; mounted: boolean }) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const profile = useUIModeStore((s) => s.profile);
  const sendMessage = useFamilyStore((s) => s.sendMessage);
  const dismissScam = useFamilyStore((s) => s.dismissScam);
  const dismissed = useFamilyStore((s) => s.dismissedScamIds.includes(message.id));
  const members = useFamilyStore((s) => s.members);
  const senderName = useSenderName();
  const t = useT();
  const [reading, setReading] = useState(false);

  const senior = mode === 'senior';
  const isMine = message.sender_id === profile.id;
  const sender = members.find((m) => m.id === message.sender_id);

  const toggleRead = () => {
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    setReading(true);
    const extra = message.slang_translation ? ` ${message.slang_translation.replace(/\n/g, ' ')}` : '';
    speak(`${senderName(message.sender_id)}: ${message.content}.${extra}`, language, () => setReading(false));
  };

  const bubble = senior
    ? cx('rounded-2xl border-4 border-hearth-bark p-4 text-xl', isMine ? 'bg-[#FDEBD3]' : 'bg-white')
    : mode === 'junior'
      ? cx('rounded-3xl p-4 text-base', isMine ? 'bg-gradient-to-br from-pink-100 to-purple-100' : 'bg-white')
      : cx('rounded-lg p-3 text-sm', isMine ? 'bg-indigo-50' : 'bg-slate-50 ring-1 ring-slate-200');

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      <div className={cx('flex flex-wrap items-center gap-2', senior ? 'text-lg' : 'text-xs')}>
        <span className="font-bold">{senderName(message.sender_id)}</span>
        {sender && (
          <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">{t(`roles.${sender.role}`)}</span>
        )}
        {mounted && <span className="opacity-60">{formatStamp(message.created_at, language)}</span>}
      </div>

      <div className={bubble}>
        <p className="whitespace-pre-line break-words">{message.content}</p>
        {message.audio_url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={message.audio_url} className="mt-3 w-full" />
        )}
      </div>

      {message.is_scam_flagged && !dismissed && (
        <ScamWarningBanner
          riskLevel={message.risk_level ?? 'medium'}
          reason={message.scam_reason}
          onDismiss={() => dismissScam(message.id)}
          onAskFamily={() => void sendMessage({ content: t('safety.askFamilyMessage') }, profile, language)}
        />
      )}

      {message.slang_translation && (
        <div
          className={cx(
            'flex items-start gap-3 rounded-2xl p-3',
            senior ? 'bg-sky-50 text-lg ring-2 ring-sky-700' : 'bg-sky-50 text-sm text-sky-950 ring-1 ring-sky-200'
          )}
        >
          <Languages className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{t('wall.slangTitle')}</p>
            <p className="mt-1 whitespace-pre-line">{message.slang_translation}</p>
          </div>
        </div>
      )}

      <AdaptiveButton
        variant="ghost"
        onClick={toggleRead}
        icon={reading ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      >
        {reading ? t('common.stopReading') : t('common.readAloud')}
      </AdaptiveButton>
    </motion.li>
  );
}

function FamilyWall({
  draft,
  setDraft,
  onOpenVoice,
}: {
  draft: string;
  setDraft: (value: string) => void;
  onOpenVoice: () => void;
}) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const profile = useUIModeStore((s) => s.profile);
  const messages = useFamilyStore((s) => s.messages);
  const sendMessage = useFamilyStore((s) => s.sendMessage);
  const t = useT();
  const mounted = useMounted();
  const [sending, setSending] = useState(false);

  const ordered = [...messages].reverse(); // newest first: no scroll-to-bottom trap

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await sendMessage({ content }, profile, language);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdaptiveCard
      id="wall"
      title={t('wall.title')}
      subtitle={t('wall.subtitle')}
      icon={<Heart className={mode === 'senior' ? 'h-8 w-8 text-red-700' : 'h-6 w-6 text-pink-500'} aria-hidden="true" />}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="wall-draft" className="sr-only">
          {t('wall.placeholder')}
        </label>
        <textarea
          id="wall-draft"
          rows={mode === 'senior' ? 3 : 2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('wall.placeholder')}
          className={inputClass(mode)}
        />
        <div className="flex flex-wrap gap-3">
          <AdaptiveButton type="submit" loading={sending} disabled={!draft.trim()} icon={<Send className="h-5 w-5" />}>
            {sending ? t('wall.sending') : t('common.send')}
          </AdaptiveButton>
          <AdaptiveButton variant="secondary" onClick={onOpenVoice} icon={<Mic className="h-5 w-5" />}>
            {t('wall.voice')}
          </AdaptiveButton>
        </div>
      </form>

      <ul className="mt-6 space-y-6" aria-live="polite">
        {ordered.length === 0 && <li className={mode === 'senior' ? 'text-xl' : 'text-sm'}>{t('wall.empty')}</li>}
        <AnimatePresence initial={false}>
          {ordered.map((message) => (
            <MessageItem key={message.id} message={message} mounted={mounted} />
          ))}
        </AnimatePresence>
      </ul>
    </AdaptiveCard>
  );
}

/* ------------------------------ memory spark ----------------------------- */

function SparkCard({ onUse }: { onUse: (question: string) => void }) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const memories = useFamilyStore((s) => s.memories);
  const t = useT();
  const [spark, setSpark] = useState<MemorySparkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const senior = mode === 'senior';

  const generate = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/ai/memory-spark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          audience: mode,
          memories: memories.slice(0, 6).map((m) => ({
            title: m.title,
            year_occurred: m.year_occurred,
            tags: m.tags ?? [],
          })),
          milestones: DEMO_MILESTONES.map((m) => ({ label: t(m.key), date: m.date })),
        }),
      });
      if (!res.ok) throw new Error('spark failed');
      const data = (await res.json()) as MemorySparkResponse;
      setSpark(data);
      if (senior && data.prompts[0]) speak(`${data.headline}. ${data.prompts[0].question}`, language);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdaptiveCard
      id="spark"
      title={t('ai.sparkTitle')}
      subtitle={t('ai.sparkSubtitle')}
      tone="warm"
      icon={<Sparkles className={senior ? 'h-8 w-8 text-amber-700' : 'h-6 w-6 text-amber-500'} aria-hidden="true" />}
    >
      <AdaptiveButton
        fullWidth
        loading={loading}
        onClick={generate}
        icon={<Lightbulb className="h-5 w-5" />}
      >
        {loading ? t('ai.generating') : t('ai.generate')}
      </AdaptiveButton>

      {failed && (
        <p role="alert" className={cx('mt-3 text-red-700', senior ? 'text-lg font-semibold' : 'text-sm')}>
          {t('ai.error')}
        </p>
      )}

      {spark && (
        <div className="mt-5 space-y-4">
          <p className={cx('font-bold', senior ? 'text-xl' : 'text-sm')}>{spark.headline}</p>
          <ul className="space-y-3">
            {spark.prompts.map((prompt) => (
              <motion.li
                key={prompt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cx(
                  'space-y-2 bg-white p-4',
                  senior ? 'rounded-2xl border-4 border-hearth-bark' : 'rounded-xl ring-1 ring-amber-200'
                )}
              >
                <p className={cx('font-semibold uppercase tracking-wide text-amber-800', senior ? 'text-base' : 'text-xs')}>
                  {prompt.context}
                </p>
                <p className={senior ? 'text-xl' : 'text-sm'}>{prompt.question}</p>
                <div className="flex flex-wrap gap-2">
                  <AdaptiveButton variant="secondary" onClick={() => onUse(prompt.question)}>
                    {t('ai.useStarter')}
                  </AdaptiveButton>
                  <AdaptiveButton
                    variant="ghost"
                    onClick={() => speak(prompt.question, language)}
                    icon={<Volume2 className="h-5 w-5" />}
                  >
                    {t('common.readAloud')}
                  </AdaptiveButton>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <p className={cx('mt-4 opacity-75', senior ? 'text-base' : 'text-xs')}>{t('ai.humanitarianNote')}</p>
    </AdaptiveCard>
  );
}

/* ------------------------------ memory vault ----------------------------- */

function VaultSection() {
  const mode = useUIModeStore((s) => s.mode);
  const profile = useUIModeStore((s) => s.profile);
  const memories = useFamilyStore((s) => s.memories);
  const addMemory = useFamilyStore((s) => s.addMemory);
  const senderName = useSenderName();
  const t = useT();
  const senior = mode === 'senior';

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() !== '' && story.trim() !== '';

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const parsedYear = Number.parseInt(year, 10);
      await addMemory(
        {
          title: title.trim(),
          story_text: story.trim(),
          year_occurred: Number.isFinite(parsedYear) ? parsedYear : null,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        profile
      );
      setTitle('');
      setStory('');
      setYear('');
      setTags('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const labelClass = senior ? 'mb-1 block text-lg font-bold' : 'mb-1 block text-sm font-medium';

  return (
    <div className="space-y-6">
      <AdaptiveCard
        id="vault"
        title={t('vault.title')}
        subtitle={t('vault.subtitle')}
        icon={<BookHeart className={senior ? 'h-8 w-8 text-hearth-ember' : 'h-6 w-6 text-rose-500'} aria-hidden="true" />}
      >
        <AdaptiveButton
          variant={open ? 'secondary' : 'primary'}
          onClick={() => setOpen((value) => !value)}
          icon={<Plus className="h-5 w-5" />}
          aria-expanded={open}
        >
          {t('vault.addStory')}
        </AdaptiveButton>

        <AnimatePresence initial={false}>
          {open && (
            <motion.form
              key="vault-form"
              onSubmit={handleSave}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3 overflow-hidden"
            >
              <div>
                <label htmlFor="mem-title" className={labelClass}>
                  {t('vault.storyTitle')}
                </label>
                <input
                  id="mem-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClass(mode)}
                />
              </div>
              <div>
                <label htmlFor="mem-story" className={labelClass}>
                  {t('vault.storyText')}
                </label>
                <textarea
                  id="mem-story"
                  rows={4}
                  value={story}
                  onChange={(event) => setStory(event.target.value)}
                  className={inputClass(mode)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="mem-year" className={labelClass}>
                    {t('vault.year')}
                  </label>
                  <input
                    id="mem-year"
                    inputMode="numeric"
                    value={year}
                    onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={inputClass(mode)}
                  />
                </div>
                <div>
                  <label htmlFor="mem-tags" className={labelClass}>
                    {t('vault.tags')}
                  </label>
                  <input
                    id="mem-tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    className={inputClass(mode)}
                  />
                </div>
              </div>
              <AdaptiveButton type="submit" loading={saving} disabled={!canSave}>
                {t('vault.saveStory')}
              </AdaptiveButton>
            </motion.form>
          )}
        </AnimatePresence>

        {memories.length === 0 ? (
          <p className={cx('mt-4', senior ? 'text-xl' : 'text-sm')}>{t('vault.empty')}</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {memories.map((memory) => (
              <motion.li
                key={memory.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cx(
                  'flex flex-col gap-2 bg-white p-4',
                  senior
                    ? 'rounded-2xl border-4 border-hearth-bark'
                    : mode === 'junior'
                      ? 'rounded-3xl shadow-md'
                      : 'rounded-xl ring-1 ring-slate-200'
                )}
              >
                {memory.year_occurred && (
                  <p className={cx('font-semibold text-amber-800', senior ? 'text-lg' : 'text-xs')}>
                    {t('vault.yearLabel', { year: memory.year_occurred })}
                  </p>
                )}
                <h3 className={cx('font-bold', senior ? 'text-2xl' : 'text-base')}>{memory.title}</h3>
                <p className={cx('whitespace-pre-line', senior ? 'text-xl' : 'text-sm')}>{memory.story_text}</p>
                {memory.tags && memory.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {memory.tags.map((tag) => (
                      <li
                        key={tag}
                        className={cx(
                          'rounded-full bg-amber-100 px-3 py-0.5 font-semibold text-amber-900',
                          senior ? 'text-base' : 'text-xs'
                        )}
                      >
                        #{tag}
                      </li>
                    ))}
                  </ul>
                )}
                <p className={cx('mt-auto opacity-60', senior ? 'text-base' : 'text-xs')}>
                  {t('vault.by', { name: senderName(memory.creator_id) })}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </AdaptiveCard>

      <MemoryBookPdfExporter memories={memories} familyName={t('common.demoFamilyName')} />
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function HomePage() {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const profile = useUIModeStore((s) => s.profile);
  const t = useT();

  const messageCount = useFamilyStore((s) => s.messages.length);
  const analyzePending = useFamilyStore((s) => s.analyzePending);
  const sendMessage = useFamilyStore((s) => s.sendMessage);
  const loadFromSupabase = useFamilyStore((s) => s.loadFromSupabase);
  const subscribeRealtime = useFamilyStore((s) => s.subscribeRealtime);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [draft, setDraft] = useState('');

  // Anti-Scam Guard + Slang Bridge: scan every message not yet analysed in this language.
  useEffect(() => {
    void analyzePending(language);
  }, [language, messageCount, analyzePending]);

  // Real family data + live wall when Supabase is configured and the user belongs to a family.
  useEffect(() => {
    if (!isSupabaseConfigured || !profile.family_id) return;
    void loadFromSupabase(profile.family_id);
    return subscribeRealtime(profile.family_id);
  }, [profile.family_id, loadFromSupabase, subscribeRealtime]);

  const handleVoiceSubmit = async (result: VoiceResult) => {
    await sendMessage(
      { content: result.transcript || t('voice.voiceNoteLabel'), audioUrl: result.audioUrl },
      profile,
      language
    );
  };

  const useStarter = (question: string) => {
    setDraft(question);
    document.getElementById('wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const shell = {
    senior: 'bg-hearth-cream text-hearth-ink',
    standard: 'bg-slate-50 text-slate-900',
    junior: 'bg-gradient-to-br from-pink-100 via-purple-100 to-sky-100 text-purple-950',
  }[mode];

  const hero =
    mode === 'senior' ? (
      <SeniorHero onOpenVoice={() => setVoiceOpen(true)} />
    ) : mode === 'junior' ? (
      <JuniorHero />
    ) : (
      <StandardHero />
    );

  return (
    <div className={cx('min-h-screen transition-colors duration-300', shell)}>
      <div className={cx('mx-auto px-4 py-6 sm:px-6', mode === 'senior' ? 'max-w-3xl' : 'max-w-6xl')}>
        <Header />

        <main className="mt-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {hero}
            </motion.div>
          </AnimatePresence>

          <div className={cx('grid gap-6', mode !== 'senior' && 'lg:grid-cols-[3fr_2fr]')}>
            <FamilyWall draft={draft} setDraft={setDraft} onOpenVoice={() => setVoiceOpen(true)} />
            <SparkCard onUse={useStarter} />
          </div>

          <VaultSection />
        </main>

        <footer className={cx('mt-10 pb-6 text-center opacity-70', mode === 'senior' ? 'text-lg' : 'text-xs')}>
          {t('common.footerNote')}
        </footer>
      </div>

      <VoiceRecordModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onSubmit={handleVoiceSubmit} />
    </div>
  );
}