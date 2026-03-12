export type SceneDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type SceneSourceLanguage = "en" | "zh" | "mixed";

export interface ParseSceneRequest {
  rawText: string;
  sourceLanguage?: SceneSourceLanguage;
}

export interface ParsedSceneChunkExample {
  en: string;
  zh: string;
}

export interface ParsedSceneChunk {
  key: string;
  text: string;
  translation: string;
  grammarLabel: string;
  meaningInSentence: string;
  usageNote: string;
  examples: ParsedSceneChunkExample[];
  pronunciation?: string;
  synonyms?: string[];
}

export interface ParsedSceneSentence {
  id: string;
  speaker?: string;
  text: string;
  translation: string;
  audioText?: string;
  chunks: ParsedSceneChunk[];
}

export interface ParsedSceneSection {
  id: string;
  title: string;
  summary: string;
  sentences: ParsedSceneSentence[];
}

export interface ParsedSceneGlossaryItem {
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

export interface ParsedScene {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: SceneDifficulty;
  estimatedMinutes: number;
  completionRate?: number;
  tags: string[];
  sections: ParsedSceneSection[];
  glossary?: ParsedSceneGlossaryItem[];
}

export interface SceneParserResponse {
  version: "v1";
  scene: ParsedScene;
}

export interface MutateSceneRequest {
  scene: ParsedScene;
  variantCount?: number;
  retainChunkRatio?: number;
  theme?: string;
}

export interface SceneMutateResponse {
  version: "v1";
  variants: ParsedScene[];
}

export interface PracticeGenerateRequest {
  scene: ParsedScene;
  exerciseCount?: number;
}

export type PracticeExerciseType =
  | "recall"
  | "fill_chunk"
  | "rewrite"
  | "expression_switch"
  | "expression_replace"
  | "expression_choice";

export interface PracticeExercise {
  id: string;
  type: PracticeExerciseType;
  prompt: string;
  answer: string;
  referenceSentence?: string;
  targetChunk?: string;
}

export interface PracticeGenerateResponse {
  version: "v1";
  exercises: PracticeExercise[];
}
