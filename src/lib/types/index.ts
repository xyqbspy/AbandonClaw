export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: "A2" | "B1" | "B2" | "C1";
  timezone: string;
}

export interface LessonSentence {
  id: string;
  text: string;
  translation: string;
  chunks: string[];
  speaker?: string;
  audioText?: string;
  tts?: string;
  chunkDetails?: SentenceChunkDetail[];
}

export interface ChunkExample {
  en: string;
  zh: string;
}

export interface SentenceChunkDetail {
  id?: string;
  text: string;
  translation: string;
  grammarLabel: string;
  meaningInSentence: string;
  usageNote: string;
  examples: ChunkExample[];
  pronunciation?: string;
  notes?: string[];
  synonyms?: string[];
  start: number;
  end: number;
}

export interface LessonBlock {
  id: string;
  speaker?: string;
  kind?: "dialogue" | "monologue";
  translation?: string;
  tts?: string;
  sentences: LessonSentence[];
}

export interface LessonSection {
  id: string;
  title?: string;
  summary?: string;
  blocks: LessonBlock[];
}

export interface AIExplanation {
  key: string;
  text: string;
  translation: string;
  explanation: string;
  examples: string[];
  exampleTranslations: string[];
  breakdown: string[];
  pronunciation: string;
  grammarLabel: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  completionRate: number;
  tags: string[];
  sceneType?: "dialogue" | "monologue";
  sections: LessonSection[];
  explanations: AIExplanation[];
  sourceType?: "system" | "custom" | "builtin" | "imported" | "variant";
}

export interface Chunk {
  id: string;
  text: string;
  translation: string;
  note: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
}

export interface UserChunk {
  id: string;
  userId: string;
  chunkId: string;
  lessonId: string;
  savedAt: string;
  status: "saved" | "reviewing" | "mastered";
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  done: boolean;
  actionHref: string;
  status?: "up_next" | "available" | "locked" | "done";
  actionLabel?: string;
}

export interface ReviewItem {
  id: string;
  chunk: string;
  meaning: string;
  contextSentence: string;
  due: "today" | "saved" | "mastered";
  mastery: number;
}

export interface ProgressSummary {
  streakDays: number;
  lessonsCompleted: number;
  chunksSaved: number;
  reviewAccuracy: number;
  weeklyMinutes: number[];
  skillBreakdown: Array<{
    name: string;
    value: number;
  }>;
}

export interface ExplainSelectionRequest {
  selectedText: string;
  sourceSentence: string;
  sourceTranslation?: string;
  sourceChunks?: string[];
  lessonId: string;
  lessonTitle: string;
  lessonDifficulty: string;
}

export interface SelectionSentenceLayer {
  text: string;
  translation: string;
  ttsText: string;
}

export interface SelectionChunkLayer {
  text: string;
  translation: string;
  grammarLabel?: string;
  pronunciation?: string;
  meaningInSentence: string;
  usageNote: string;
  examples: ChunkExample[];
  notes?: string[];
}

export interface SelectionExplainResponse {
  sentence: SelectionSentenceLayer;
  chunk: SelectionChunkLayer;
  relatedChunks: string[];
}
