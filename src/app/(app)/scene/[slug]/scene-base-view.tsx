"use client";

import { ReactNode } from "react";
import { LessonReader } from "@/features/lesson/components/lesson-reader";
import { Lesson } from "@/lib/types";

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};

export function SceneBaseView({
  lesson,
  practiceError,
  variantsError,
  trainingPanel,
  headerTools,
  headerTitle,
  onBackToList,
  interactionMode = "default",
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onSceneLoopPlayback,
  onSentencePlayback,
  onChunkEncounter,
  onSentencePracticeComplete,
  chunkDetailSheet,
}: {
  lesson: Lesson;
  practiceError: string | null;
  variantsError: string | null;
  trainingPanel?: ReactNode;
  headerTools: ReactNode;
  headerTitle?: string;
  onBackToList?: () => void;
  interactionMode?: "default" | "training";
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
  onSentencePlayback?: (payload: { lesson: Lesson; sentence: import("@/lib/types").LessonSentence }) => void;
  onChunkEncounter?: (payload: {
    lesson: Lesson;
    sentence: import("@/lib/types").LessonSentence;
    chunkText: string;
    blockId?: string;
    source?: "direct" | "related";
  }) => void;
  onSentencePracticeComplete?: (payload: {
    lesson: Lesson;
    sentence: import("@/lib/types").LessonSentence;
    blockId?: string;
  }) => void;
  chunkDetailSheet: ReactNode;
}) {
  return (
    <div className="space-y-[var(--mobile-adapt-space-2xl)]">
      {practiceError ? <p className="text-[length:var(--mobile-adapt-font-body-sm)] text-destructive">{practiceError}</p> : null}
      {variantsError ? <p className="text-[length:var(--mobile-adapt-font-body-sm)] text-destructive">{variantsError}</p> : null}

      {trainingPanel}
      <div className="relative">
        <LessonReader
          lesson={lesson}
          headerTools={headerTools}
          headerTitle={headerTitle}
          onBackToList={onBackToList}
          interactionMode={interactionMode}
          savedPhraseTexts={savedPhraseTexts}
          onSavePhrase={onSavePhrase}
          onReviewPhrase={onReviewPhrase}
          onSceneLoopPlayback={onSceneLoopPlayback}
          onSentencePlayback={onSentencePlayback}
          onChunkEncounter={onChunkEncounter}
          onSentencePracticeComplete={onSentencePracticeComplete}
        />
      </div>
      {chunkDetailSheet}
    </div>
  );
}
