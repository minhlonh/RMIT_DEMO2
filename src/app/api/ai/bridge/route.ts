import { NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';
import type { AIResponse, BridgeRequest, Language, RiskLevel, SlangMatch } from '@/types';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------------ */
/*  Anti-Scam Guard: weighted pattern signals (run on accent-stripped text) */
/* ------------------------------------------------------------------------ */

interface ScamSignalDef {
  code: string;
  weight: number;
  pattern: RegExp;
}

const SIGNALS: ScamSignalDef[] = [
  {
    code: 'otp',
    weight: 3,
    pattern:
      /(\botp\b|ma xac (thuc|minh|nhan)|ma bao mat|mat khau|verification code|security code|password|pin code)/,
  },
  {
    code: 'bank',
    weight: 2,
    pattern:
      /(so tai khoan|\bstk\b|chuyen khoan|chuyen tien|nap tien|bank account|account number|wire (me )?(money|transfer)|transfer (the )?money|send (me )?money)/,
  },
  {
    code: 'lock',
    weight: 2,
    pattern:
      /(khoa tai khoan|tai khoan (cua (bac|ong|ba|ban) )?(se |sap |dang )?(bi )?(khoa|dong bang|tam ngung)|account (will be |has been |is )?(locked|suspended|frozen|blocked))/,
  },
  {
    code: 'prize',
    weight: 2,
    pattern:
      /(trung thuong|nhan thuong|qua tang mien phi|ban da trung|you('ve| have)? won|congratulations.*prize|lottery|jackpot)/,
  },
  {
    code: 'authority',
    weight: 2,
    pattern:
      /(toi la (nhan vien|can bo|cong an)|nhan vien ngan hang|cong an|toa an|vien kiem sat|cuc thue|bank (staff|officer|employee)|police|tax office)/,
  },
  {
    code: 'familyImpersonation',
    weight: 2,
    pattern: /(doi so moi|so moi cua con|so moi cua chau|this is my new number|my new number)/,
  },
  {
    code: 'secrecy',
    weight: 2,
    pattern: /(dung noi (voi )?(ai|con|chau|ba|me)|giu bi mat|don'?t tell|do not tell|keep (it )?secret)/,
  },
  {
    code: 'urgency',
    weight: 1,
    pattern:
      /(khan cap|gap lam|ngay lap tuc|ngay bay gio|trong (vong )?\d+ ?(phut|gio)|urgent|immediately|right now|asap|within \d+ ?(minutes|hours))/,
  },
  {
    code: 'link',
    weight: 1,
    pattern: /(https?:\/\/|www\.|bit\.ly|tinyurl|\.xyz\b|\.top\b)/,
  },
  {
    code: 'amount',
    weight: 1,
    pattern: /(\d[\d.,]{2,}\s?(d\b|dong|vnd|trieu)|\$\s?\d+|\d+\s?usd)/,
  },
];

/* ------------------------------------------------------------------------ */
/*  Slang Bridge: Gen Z / Alpha terms → warm, respectful explanations       */
/* ------------------------------------------------------------------------ */

interface SlangEntry {
  label: string;
  keys: string[]; // lowercase, accent-stripped, punctuation → single spaces
  vi: string;
  en: string;
}

const SLANG: SlangEntry[] = [
  {
    label: 'flex',
    keys: ['flex', 'flexing', 'flexed'],
    vi: 'khoe một điều đáng tự hào, như điểm tốt hay món quà mới. Thường mang ý vui vẻ, không phải kiêu căng.',
    en: 'proudly showing off something good, like a great grade or a new gift. It is usually playful, not boastful.',
  },
  {
    label: 'slay',
    keys: ['slay', 'slayed', 'slaying'],
    vi: 'lời khen khi ai đó làm một việc thật xuất sắc, thật ấn tượng.',
    en: 'praise for doing something impressively well.',
  },
  {
    label: 'flop',
    keys: ['flop', 'flopped'],
    vi: 'thất bại, không thành công như mong đợi.',
    en: 'a failure; something that did not go as hoped.',
  },
  {
    label: 'gắn thẻ',
    keys: ['gan the'],
    vi: 'nhắc tên ai đó trong một bài đăng trên mạng xã hội để họ nhìn thấy ngay.',
    en: 'mentioning someone by name in a social media post so that they see it right away.',
  },
  {
    label: 'cringe',
    keys: ['cringe', 'cringey'],
    vi: 'cảm giác ngượng thay, thấy hơi “sượng” trước một việc gượng gạo.',
    en: 'a feeling of secondhand embarrassment at something awkward.',
  },
  {
    label: 'chill',
    keys: ['chill', 'chilling', 'chillin'],
    vi: 'thư giãn, thoải mái, không căng thẳng; đôi khi dùng để khen một việc dễ chịu.',
    en: 'relaxed and easygoing; also used to praise something pleasant.',
  },
  {
    label: 'vibe',
    keys: ['vibe', 'vibes'],
    vi: 'không khí hay cảm giác chung của một nơi chốn hoặc một khoảnh khắc.',
    en: 'the overall feeling or atmosphere of a place or a moment.',
  },
  {
    label: 'lowkey',
    keys: ['lowkey', 'low key'],
    vi: 'một cách kín đáo, hoặc “hơi hơi”, không quá phô trương.',
    en: 'quietly or "a little bit"; not showy.',
  },
  {
    label: 'no cap',
    keys: ['no cap'],
    vi: 'nói thật lòng, không nói đùa.',
    en: 'telling the truth; no joking.',
  },
  {
    label: 'crush',
    keys: ['crush'],
    vi: 'người mình thầm thích, có cảm tình.',
    en: 'someone you secretly like.',
  },
  {
    label: 'ghosting',
    keys: ['ghosting', 'ghosted'],
    vi: 'đột nhiên không trả lời tin nhắn và lặng lẽ biến mất khỏi cuộc trò chuyện.',
    en: 'suddenly stopping all replies and quietly disappearing from a conversation.',
  },
  {
    label: 'FOMO',
    keys: ['fomo'],
    vi: 'nỗi lo bị bỏ lỡ điều vui mà bạn bè đang cùng nhau làm.',
    en: 'the worry of missing out on something fun that friends are doing together.',
  },
  {
    label: 'trend',
    keys: ['trend', 'trending'],
    vi: 'xu hướng đang được nhiều người làm theo.',
    en: 'something many people are currently following or doing.',
  },
  {
    label: 'check-in',
    keys: ['check in', 'checkin'],
    vi: 'đăng hoặc báo rằng mình đang có mặt ở một địa điểm nào đó.',
    en: 'posting or announcing that you are at a certain place.',
  },
  {
    label: 'sống ảo',
    keys: ['song ao'],
    vi: 'thích chụp ảnh, đăng lên mạng hơn là trải nghiệm thật; thường nói vui.',
    en: 'caring more about photos and posting online than real experiences; usually said jokingly.',
  },
  {
    label: 'xịn sò',
    keys: ['xin so'],
    vi: 'rất tốt, rất sang, chất lượng cao.',
    en: 'excellent and high quality.',
  },
  {
    label: 'ú là trời',
    keys: ['u la troi', 'ui la troi'],
    vi: 'tiếng thốt lên khi ngạc nhiên, giống như “trời ơi”.',
    en: 'an exclamation of surprise, like "oh my goodness".',
  },
  {
    label: 'đỉnh của chóp',
    keys: ['dinh cua chop'],
    vi: 'tuyệt vời nhất, không gì hơn được.',
    en: 'the very best; nothing beats it.',
  },
  {
    label: 'bestie',
    keys: ['bestie', 'besties'],
    vi: 'người bạn thân nhất.',
    en: 'a very best friend.',
  },
  {
    label: 'thả tim',
    keys: ['tha tim'],
    vi: 'bấm biểu tượng trái tim để bày tỏ mình yêu thích một bài đăng.',
    en: 'tapping the heart icon to show you like a post.',
  },
  {
    label: 'livestream',
    keys: ['livestream', 'live stream'],
    vi: 'phát video trực tiếp cho nhiều người cùng xem.',
    en: 'broadcasting live video for many people to watch together.',
  },
  {
    label: 'idol',
    keys: ['idol'],
    vi: 'người mình ngưỡng mộ, thần tượng.',
    en: 'a person you admire and look up to.',
  },
];

/* ------------------------------------------------------------------------ */

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

function detectScam(normalized: string, language: Language) {
  const hits = SIGNALS.filter((signal) => signal.pattern.test(normalized)).sort(
    (a, b) => b.weight - a.weight
  );
  const score = hits.reduce((sum, hit) => sum + hit.weight, 0);

  const riskLevel: RiskLevel =
    score >= 6 ? 'high' : score >= 3 ? 'medium' : score >= 1 ? 'low' : 'none';
  const isScam = score >= 3;
  const reasons = hits.slice(0, 4).map((hit) => translate(language, `ai.reason.${hit.code}`));

  return { isScam, riskLevel, reasons };
}

function detectSlang(normalized: string, language: Language): SlangMatch[] {
  const flat = ` ${normalized.replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return SLANG.filter((entry) => entry.keys.some((key) => flat.includes(` ${key} `))).map(
    (entry) => ({ term: entry.label, meaning: entry[language] })
  );
}

export async function POST(request: Request) {
  let body: Partial<BridgeRequest>;
  try {
    body = (await request.json()) as Partial<BridgeRequest>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) {
    return NextResponse.json(
      { error: 'Field "text" must be a non-empty string up to 2000 characters.' },
      { status: 400 }
    );
  }
  const language: Language = body.language === 'en' ? 'en' : 'vi';

  const normalized = normalize(text);
  const { isScam, riskLevel, reasons } = detectScam(normalized, language);
  const slang = detectSlang(normalized, language);

  const slangTranslation =
    slang.length > 0
      ? [
          translate(language, 'ai.slangIntro'),
          ...slang.map((entry) => `• “${entry.term}”: ${entry.meaning}`),
        ].join('\n')
      : null;

  const payload: AIResponse = {
    isScam,
    riskLevel,
    reasons,
    scamReason: isScam ? reasons.join(' ') : null,
    slang,
    slangTranslation,
  };

  return NextResponse.json(payload);
}