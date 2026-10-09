import { NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';
import type {
  Language,
  MemorySparkRequest,
  MemorySparkResponse,
  SparkPrompt,
  UserRole,
} from '@/types';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/** Evergreen conversation starters (neutral, so they work for any grandparent). */
const GENERAL: Record<Language, Array<{ question: string; target: UserRole }>> = {
  vi: [
    { question: 'Ông bà ơi, hồi nhỏ ông bà thích chơi trò gì nhất? Kể cho con nghe với!', target: 'child' },
    { question: 'Món ăn nào làm ông bà nhớ nhà nhất, và ngày xưa ai là người nấu món đó ạ?', target: 'child' },
    { question: 'Bài hát nào ông bà nghe là nhớ lại cả một thời tuổi trẻ ạ?', target: 'child' },
    { question: 'Ngày đầu tiên đi làm hoặc đi học xa nhà, ông bà cảm thấy thế nào ạ?', target: 'child' },
    { question: 'Có lời khuyên nào ông bà được người lớn dặn từ xưa mà vẫn nhớ đến nay không ạ?', target: 'child' },
    { question: 'Hôm nay có điều gì nhỏ xíu làm ông bà mỉm cười không ạ?', target: 'parent' },
    { question: 'Nếu cả nhà đi chơi cuối tuần này, ông bà muốn mình đến nơi nào ạ?', target: 'parent' },
    { question: 'Ông bà có kỷ niệm nào với ngôi nhà này mà con cháu chưa biết không ạ?', target: 'parent' },
  ],
  en: [
    { question: 'What was your favorite game to play when you were little? Tell me everything!', target: 'child' },
    { question: 'Which dish makes you miss home the most, and who used to cook it?', target: 'child' },
    { question: 'Which song instantly takes you back to your youth?', target: 'child' },
    { question: 'How did you feel on your first day of work, or your first time living far from home?', target: 'child' },
    { question: 'Is there a piece of advice from your elders that you still remember today?', target: 'child' },
    { question: 'Did anything small make you smile today?', target: 'parent' },
    { question: 'If we all went out this weekend, where would you like to go?', target: 'parent' },
    { question: 'Do you have a memory of this house that the rest of us have never heard?', target: 'parent' },
  ],
};

function memoryQuestion(language: Language, title: string, year: number | null): string {
  if (language === 'vi') {
    return `Ông bà từng kể về “${title}”${year ? ` (năm ${year})` : ''}. Hôm đó có chi tiết nhỏ nào thú vị mà con cháu chưa được nghe ạ?`;
  }
  return `You once shared “${title}”${year ? ` from ${year}` : ''}. What is one small detail from that day we have never heard?`;
}

function milestoneQuestion(language: Language, label: string, days: number): string {
  if (language === 'vi') {
    return days === 0
      ? `Hôm nay là ${label}! Mọi người cùng gửi một lời chúc nhé.`
      : `Còn ${days} ngày nữa là ${label}. Những năm trước, cả nhà thường làm gì cùng nhau vào dịp này ạ?`;
  }
  return days === 0
    ? `Today is ${label}! Let's all send a warm wish.`
    : `${label} is in ${days} days. What did the family usually do together around this time in past years?`;
}

/** Days until the next annual occurrence of a YYYY-MM-DD date (null if unparseable). */
function daysUntilNext(dateString: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return null;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let next = Date.UTC(now.getUTCFullYear(), month, day);
  if (next < today) next = Date.UTC(now.getUTCFullYear() + 1, month, day);
  return Math.round((next - today) / DAY_MS);
}

export async function POST(request: Request) {
  let body: Partial<MemorySparkRequest>;
  try {
    body = (await request.json()) as Partial<MemorySparkRequest>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const language: Language = body.language === 'en' ? 'en' : 'vi';
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / DAY_MS);
  const prompts: SparkPrompt[] = [];

  // 1) Nearest upcoming milestone (within 30 days)
  const milestones = Array.isArray(body.milestones) ? body.milestones.slice(0, 20) : [];
  const upcoming = milestones
    .map((m) => ({
      label: typeof m.label === 'string' ? m.label.slice(0, 120) : '',
      days: typeof m.date === 'string' ? daysUntilNext(m.date, now) : null,
    }))
    .filter((m): m is { label: string; days: number } => m.label !== '' && m.days !== null && m.days <= 30)
    .sort((a, b) => a.days - b.days)[0];

  if (upcoming) {
    prompts.push({
      id: `milestone-${daySeed}`,
      question: milestoneQuestion(language, upcoming.label, upcoming.days),
      context: translate(language, 'ai.contextMilestone', { label: upcoming.label }),
      target: 'child',
    });
  }

  // 2) One prompt rooted in an existing memory (rotates daily)
  const memories = Array.isArray(body.memories)
    ? body.memories.filter((m) => typeof m.title === 'string' && m.title.trim() !== '')
    : [];
  if (memories.length > 0) {
    const memory = memories[daySeed % memories.length];
    const title = memory.title.slice(0, 120);
    prompts.push({
      id: `memory-${daySeed}`,
      question: memoryQuestion(language, title, typeof memory.year_occurred === 'number' ? memory.year_occurred : null),
      context: translate(language, 'ai.contextMemory', { title }),
      target: 'parent',
    });
  }

  // 3) Fill up to 3 prompts with rotating evergreen starters
  const pool = GENERAL[language];
  let offset = 0;
  while (prompts.length < 3 && offset < pool.length) {
    const entry = pool[(daySeed + offset) % pool.length];
    prompts.push({
      id: `general-${daySeed}-${offset}`,
      question: entry.question,
      context: translate(language, 'ai.contextGeneral'),
      target: entry.target,
    });
    offset += 1;
  }

  const payload: MemorySparkResponse = {
    headline: translate(language, 'ai.sparkHeadline'),
    prompts,
    generatedAt: now.toISOString(),
  };

  return NextResponse.json(payload);
}