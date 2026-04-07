export type SceneDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type SceneSourceLanguage = "en" | "zh" | "mixed";
export type SceneType = "dialogue" | "monologue";
export type SceneSpeaker = string;

export interface ParseSceneRequest {
  rawText: string;
  sourceLanguage?: SceneSourceLanguage;
}

export interface ParsedSceneChunkExample {
  en: string;
  zh: string;
}

export interface ParsedSceneChunk {
  id: string;
  key: string;
  text: string;

  translation?: string;
  grammarLabel?: string;
  meaningInSentence?: string;
  usageNote?: string;
  pronunciation?: string;

  examples?: ParsedSceneChunkExample[];
  notes?: string[];

  start: number;
  end: number;
}

export interface ParsedSceneSentence {
  id: string;
  text: string;
  translation?: string;
  tts?: string;
  chunks: ParsedSceneChunk[];
}

export interface ParsedSceneBlock {
  id: string;
  type: SceneType;
  speaker?: SceneSpeaker;
  translation?: string;
  tts?: string;
  sentences: ParsedSceneSentence[];
}

export interface ParsedSceneSection {
  id: string;
  title?: string;
  summary?: string;
  blocks: ParsedSceneBlock[];
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
  subtitle?: string;
  description?: string;
  difficulty?: SceneDifficulty;
  estimatedMinutes?: number;
  completionRate?: number;
  tags?: string[];

  type: SceneType;
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

export type ExerciseType =
  | "chunk_cloze"
  | "keyword_cloze"
  | "multiple_choice"
  | "typing"
  | "sentence_rebuild"
  | "translation_prompt";

export type ExerciseInputMode = "choice" | "typing";

export interface ClozeSpec {
  displayText: string;
  blankStart?: number;
  blankEnd?: number;
}

export interface ExerciseAnswerSpec {
  text: string;
  acceptedAnswers?: string[];
}

export interface ExerciseSpec {
  id: string;

  type: ExerciseType;
  inputMode: ExerciseInputMode;

  sceneId: string;
  sectionId?: string;
  blockId?: string;
  sentenceId: string;
  chunkId?: string;

  prompt?: string;
  hint?: string;

  answer: ExerciseAnswerSpec;

  cloze?: ClozeSpec;
  options?: string[];

  metadata?: Record<string, unknown>;
}

export type PracticeExerciseType = ExerciseType;
export type PracticeExercise = ExerciseSpec;

export interface PracticeGenerateRequest {
  scene: ParsedScene;
  exerciseCount?: number;
}

export type PracticeGenerationSource = "ai" | "system";

export interface PracticeGenerateResponse {
  version: "v1";
  generationSource: PracticeGenerationSource;
  exercises: ExerciseSpec[];
}
