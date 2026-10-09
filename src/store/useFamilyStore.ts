'use client';

import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { DEMO_PROFILES } from '@/store/useUIModeStore';
import type {
  AIResponse,
  Language,
  Memory,
  Message,
  NewMemoryInput,
  Profile,
} from '@/types';

const DAY_MS = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isRealUser = (profile: Profile) =>
  isSupabaseConfigured && Boolean(profile.family_id) && !profile.id.startsWith('demo-');

/** Calls the Anti-Scam + Slang Bridge API route. */
export async function requestBridge(text: string, language: Language): Promise<AIResponse> {
  const res = await fetch('/api/ai/bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error(`Bridge request failed (${res.status})`);
  return (await res.json()) as AIResponse;
}

/* ------------------------------- Demo seed ------------------------------- */

const blankMessage = {
  family_id: null,
  audio_url: null,
  is_scam_flagged: false,
  scam_reason: null,
  slang_translation: null,
} as const;

const SEED_MESSAGES: Message[] = [
  {
    ...blankMessage,
    id: 'seed-m1',
    sender_id: 'demo-grandpa',
    content: 'Chào các con, hôm nay Sài Gòn nắng đẹp quá. Ông vừa đi dạo công viên về, thấy khỏe lắm.',
    created_at: '2026-10-07T01:15:00.000Z',
  },
  {
    ...blankMessage,
    id: 'seed-m2',
    sender_id: 'demo-minh',
    content: 'Ông ơi, hôm nay con được điểm 10 môn Toán, con flex với ông tí nha! Con slay luôn 😎',
    created_at: '2026-10-08T03:40:00.000Z',
  },
  {
    ...blankMessage,
    id: 'seed-m3',
    sender_id: 'external-unknown',
    content:
      'Chào bác, tôi là nhân viên ngân hàng. Tài khoản của bác sắp bị khóa, cần gửi mã OTP ngay lập tức để xác minh và chuyển khoản phí 500.000đ.',
    created_at: '2026-10-08T10:05:00.000Z',
  },
  {
    ...blankMessage,
    id: 'seed-m4',
    sender_id: 'demo-mom',
    content: 'Cuối tuần này cả nhà mình đi ăn phở nha! Mẹ đã đặt bàn rồi.',
    created_at: '2026-10-08T12:20:00.000Z',
  },
  {
    ...blankMessage,
    id: 'seed-m5',
    sender_id: 'demo-minh',
    content: 'Bài hát hôm qua ông hát nghe chill ghê, bạn con còn bảo ông hay như idol luôn!',
    created_at: '2026-10-08T13:00:00.000Z',
  },
];

const SEED_MEMORIES: Memory[] = [
  {
    id: 'seed-mem1',
    family_id: null,
    creator_id: 'demo-grandpa',
    title: 'Chiếc xe đạp Phượng Hoàng đầu tiên',
    story_text:
      'Năm đó ông dành dụm suốt hai năm trời mới mua được chiếc xe đạp Phượng Hoàng.\nSáng nào ông cũng lau xe sạch bóng trước khi chở bà đi chợ.',
    audio_narration_url: null,
    image_urls: null,
    year_occurred: 1978,
    tags: ['tuổi trẻ', 'xe đạp'],
    created_at: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'seed-mem2',
    family_id: null,
    creator_id: 'demo-grandpa',
    title: 'Mâm cơm Tết ở quê nội',
    story_text:
      'Ba mươi Tết, cả nhà quây quần gói bánh chưng bên bếp lửa hồng.\nMùi lá dong và tiếng cười của các cô các bác vẫn còn nguyên trong ký ức ông.',
    audio_narration_url: null,
    image_urls: null,
    year_occurred: 1985,
    tags: ['Tết', 'quê nội'],
    created_at: '2026-09-10T08:00:00.000Z',
  },
  {
    id: 'seed-mem3',
    family_id: null,
    creator_id: 'demo-mom',
    title: 'Ngày đón Minh chào đời',
    story_text:
      'Cả nhà đứng chờ ngoài hành lang bệnh viện, ông cầm sẵn chiếc khăn len bà đan.\nKhi nghe tiếng khóc đầu tiên của Minh, ai cũng mừng rơi nước mắt.',
    audio_narration_url: null,
    image_urls: null,
    year_occurred: 2013,
    tags: ['gia đình', 'chào đời'],
    created_at: '2026-09-20T08:00:00.000Z',
  },
];

/* --------------------------------- Store --------------------------------- */

interface SendInput {
  content: string;
  audioUrl?: string | null;
}

interface FamilyState {
  messages: Message[];
  memories: Memory[];
  members: Profile[];
  streak: number;
  lastChatDate: string | null;
  dismissedScamIds: string[];
  isAnalyzing: boolean;

  sendMessage: (input: SendInput, sender: Profile, language: Language) => Promise<void>;
  analyzePending: (language: Language) => Promise<void>;
  dismissScam: (messageId: string) => void;
  addMemory: (input: NewMemoryInput, creator: Profile) => Promise<void>;
  registerChatDay: () => void;
  loadFromSupabase: (familyId: string) => Promise<void>;
  subscribeRealtime: (familyId: string) => () => void;
}

export const useFamilyStore = create<FamilyState>()((set, get) => ({
  messages: SEED_MESSAGES,
  memories: SEED_MEMORIES,
  members: Object.values(DEMO_PROFILES),
  streak: 3,
  // Seeded as "yesterday" so the first message today extends the demo streak to 4.
  lastChatDate: isoDay(new Date(Date.now() - DAY_MS)),
  dismissedScamIds: [],
  isAnalyzing: false,

  registerChatDay: () => {
    const today = isoDay(new Date());
    const yesterday = isoDay(new Date(Date.now() - DAY_MS));
    const { lastChatDate, streak } = get();
    if (lastChatDate === today) return;
    set({
      streak: lastChatDate === yesterday ? streak + 1 : 1,
      lastChatDate: today,
    });
  },

  sendMessage: async ({ content, audioUrl }, sender, language) => {
    // Scan BEFORE posting so flags are stored with the message.
    const analysis = await requestBridge(content, language).catch(() => null);

    const message: Message = {
      id: newId(),
      family_id: sender.family_id,
      sender_id: sender.id,
      content,
      audio_url: audioUrl ?? null,
      is_scam_flagged: analysis?.isScam ?? false,
      scam_reason: analysis?.scamReason ?? null,
      slang_translation: analysis?.slangTranslation ?? null,
      created_at: new Date().toISOString(),
      risk_level: analysis?.riskLevel ?? 'none',
      analyzedLang: language,
    };

    set((state) => ({ messages: [...state.messages, message] }));
    get().registerChatDay();

    if (isRealUser(sender)) {
      // blob: URLs are session-local; upload audio to Supabase Storage and store its public URL in production.
      const { analyzedLang: _lang, risk_level: _risk, ...row } = message;
      void supabase.from('messages').insert({ ...row, audio_url: null });
    }
  },

  analyzePending: async (language) => {
    if (get().isAnalyzing) return;
    const pending = get().messages.filter((m) => m.analyzedLang !== language);
    if (pending.length === 0) return;

    set({ isAnalyzing: true });

    const results = await Promise.all(
      pending.map(async (m) => {
        try {
          return { id: m.id, result: await requestBridge(m.content, language) };
        } catch {
          return { id: m.id, result: null };
        }
      })
    );

    set((state) => ({
      isAnalyzing: false,
      messages: state.messages.map((m) => {
        const hit = results.find((r) => r.id === m.id);
        if (!hit) return m;
        // On failure, still mark as analyzed to avoid an endless retry loop.
        if (!hit.result) return { ...m, analyzedLang: language };
        return {
          ...m,
          is_scam_flagged: hit.result.isScam,
          scam_reason: hit.result.scamReason,
          slang_translation: hit.result.slangTranslation,
          risk_level: hit.result.riskLevel,
          analyzedLang: language,
        };
      }),
    }));

    // Pick up anything that arrived while we were analyzing.
    if (get().messages.some((m) => m.analyzedLang !== language)) {
      void get().analyzePending(language);
    }
  },

  dismissScam: (messageId) =>
    set((state) => ({
      dismissedScamIds: state.dismissedScamIds.includes(messageId)
        ? state.dismissedScamIds
        : [...state.dismissedScamIds, messageId],
    })),

  addMemory: async (input, creator) => {
    const memory: Memory = {
      id: newId(),
      family_id: creator.family_id,
      creator_id: creator.id,
      title: input.title,
      story_text: input.story_text,
      audio_narration_url: null,
      image_urls: null,
      year_occurred: input.year_occurred,
      tags: input.tags,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ memories: [memory, ...state.memories] }));

    if (isRealUser(creator)) {
      void supabase.from('memories').insert(memory);
    }
  },

  loadFromSupabase: async (familyId) => {
    if (!isSupabaseConfigured) return;
    const [msgs, mems, people] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('memories')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('profiles').select('*').eq('family_id', familyId),
    ]);
    if (msgs.data) set({ messages: msgs.data as Message[] });
    if (mems.data) set({ memories: mems.data as Memory[] });
    if (people.data && people.data.length > 0) set({ members: people.data as Profile[] });
  },

  subscribeRealtime: (familyId) => {
    if (!isSupabaseConfigured) return () => undefined;
    const channel = supabase
      .channel(`family-${familyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const row = payload.new as Message;
          set((state) =>
            state.messages.some((m) => m.id === row.id)
              ? state
              : { messages: [...state.messages, row] }
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
}));