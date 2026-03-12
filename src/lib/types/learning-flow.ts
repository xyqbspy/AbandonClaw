import { Lesson } from "@/lib/types";
import { PracticeExercise } from "@/lib/types/scene-parser";

export type GeneratedSetStatus = "generated" | "completed";
export type VariantItemStatus = "unviewed" | "viewed" | "completed";

export interface PracticeSet {
  id: string;
  sourceSceneId: string;
  sourceSceneTitle: string;
  sourceType: "original" | "variant";
  sourceVariantId?: string;
  sourceVariantTitle?: string;
  exercises: PracticeExercise[];
  status: GeneratedSetStatus;
  createdAt: string;
  completedAt?: string;
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
