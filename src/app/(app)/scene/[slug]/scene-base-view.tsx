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
  interactionMode = "default",
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onSceneLoopPlayback,
  onChunkEncounter,
  onSentencePracticeComplete,
  chunkDetailSheet,
}: {
  lesson: Lesson;
  practiceError: string | null;
  variantsError: string | null;
  trainingPanel?: ReactNode;
  headerTools: ReactNode;
  interactionMode?: "default" | "training";
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
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
    <div className="space-y-5">
      {practiceError ? <p className="text-sm text-destructive">{practiceError}</p> : null}
      {variantsError ? <p className="text-sm text-destructive">{variantsError}</p> : null}

      {trainingPanel}
      <div className="relative">
        <LessonReader
          lesson={lesson}
          headerTools={headerTools}
          interactionMode={interactionMode}
          savedPhraseTexts={savedPhraseTexts}
          onSavePhrase={onSavePhrase}
          onReviewPhrase={onReviewPhrase}
          onSceneLoopPlayback={onSceneLoopPlayback}
          onChunkEncounter={onChunkEncounter}
          onSentencePracticeComplete={onSentencePracticeComplete}
        />
      </div>
      {chunkDetailSheet}
    </div>
  );
}
