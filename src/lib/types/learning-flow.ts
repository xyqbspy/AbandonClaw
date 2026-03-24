import { Lesson } from "@/lib/types";
import { PracticeExercise } from "@/lib/types/scene-parser";

export type GeneratedSetStatus = "generated" | "completed";
export type VariantItemStatus = "unviewed" | "viewed" | "completed";
export type PracticeMode = "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
export type PracticeStageKey = "scene_practice";
export type PracticeAssessmentLevel = "incorrect" | "keyword" | "structure" | "complete";

export interface PracticeSetSessionState {
  activeExerciseIndex: number;
  activeMode?: PracticeMode;
  answerMap: Record<string, string>;
  resultMap: Record<string, "correct" | "incorrect" | null>;
  assessmentMap?: Record<string, PracticeAssessmentLevel | null>;
  attemptCountMap: Record<string, number>;
  incorrectCountMap: Record<string, number>;
  updatedAt: string;
}

export interface PracticeModule {
  mode: PracticeMode;
  modeLabel: string;
  title: string;
  description?: string;
  completionRequirement?: string;
  exercises: PracticeExercise[];
}

export interface PracticeSet {
  id: string;
  sourceSceneId: string;
  sourceSceneTitle: string;
  sourceType: "original" | "variant";
  sourceVariantId?: string;
  sourceVariantTitle?: string;
  stageKey?: PracticeStageKey;
  mode?: PracticeMode;
  modeLabel?: string;
  title?: string;
  description?: string;
  completionRequirement?: string;
  modules?: PracticeModule[];
  exercises: PracticeExercise[];
  status: GeneratedSetStatus;
  createdAt: string;
  completedAt?: string;
  sessionState?: PracticeSetSessionState;
}

export interface VariantSetItem {
  id: string;
  lesson: Lesson;
  status: VariantItemStatus;
}

export interface VariantSet {
  id: string;
  sourceSceneId: string;
  sourceSceneTitle: string;
  reusedChunks: string[];
  variants: VariantSetItem[];
  status: GeneratedSetStatus;
  createdAt: string;
  completedAt?: string;
}

export interface SceneGeneratedState {
  latestPracticeSet: PracticeSet | null;
  latestVariantSet: VariantSet | null;
  practiceStatus: GeneratedSetStatus | "idle";
  variantStatus: GeneratedSetStatus | "idle";
}
