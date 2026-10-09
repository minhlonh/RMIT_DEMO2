export type UIMode = 'senior' | 'standard' | 'junior';
export type UserRole = 'grandparent' | 'parent' | 'child';
export type Language = 'vi' | 'en';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  ui_mode: UIMode;
  preferred_language: Language;
  avatar_url: string | null;
  birth_year: number | null;
  family_id: string | null;
  created_at: string;
}

export interface Family {
  id: string;
  family_name: string;
  invite_code: string;
  created_at: string;
}

export interface Message {
  id: string;
  family_id: string | null;
  sender_id: string;
  content: string;
  audio_url: string | null;
  is_scam_flagged: boolean;
  scam_reason: string | null;
  slang_translation: string | null;
  created_at: string;
  /** UI-only: risk level returned by the bridge API (not stored in DB). */
  risk_level?: RiskLevel;
  /** UI-only: language the AI analysis was produced in. */
  analyzedLang?: Language;
}

export interface Memory {
  id: string;
  family_id: string | null;
  creator_id: string;
  title: string;
  story_text: string;
  audio_narration_url: string | null;
  image_urls: string[] | null;
  year_occurred: number | null;
  tags: string[] | null;
  created_at: string;
}

export interface NewMemoryInput {
  title: string;
  story_text: string;
  year_occurred: number | null;
  tags: string[];
}

/* ------------------------------ AI contracts ----------------------------- */

export interface SlangMatch {
  term: string;
  meaning: string;
}

export interface BridgeRequest {
  text: string;
  language: Language;
  audience?: UIMode;
}

export interface AIResponse {
  isScam: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  scamReason: string | null;
  slang: SlangMatch[];
  slangTranslation: string | null;
}

export interface Milestone {
  label: string;
  /** ISO date (YYYY-MM-DD). Treated as an annual occurrence. */
  date: string;
}

export interface MemorySparkRequest {
  language: Language;
  audience?: UIMode;
  memories?: Array<Pick<Memory, 'title' | 'year_occurred'> & { tags?: string[] }>;
  milestones?: Milestone[];
}

export interface SparkPrompt {
  id: string;
  question: string;
  context: string;
  /** Which generation is best placed to start this conversation. */
  target: UserRole;
}

export interface MemorySparkResponse {
  headline: string;
  prompts: SparkPrompt[];
  generatedAt: string;
}