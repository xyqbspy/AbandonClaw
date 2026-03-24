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
  headerTools,
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onChunkEncounter,
  chunkDetailSheet,
}: {
  lesson: Lesson;
  practiceError: string | null;
  variantsError: string | null;
  headerTools: ReactNode;
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onChunkEncounter?: (payload: {
    lesson: Lesson;
    sentence: import("@/lib/types").LessonSentence;
    chunkText: string;
  }) => void;
  chunkDetailSheet: ReactNode;
}) {
  return (
    <div className="space-y-5">
      {practiceError ? <p className="text-sm text-destructive">{practiceError}</p> : null}
      {variantsError ? <p className="text-sm text-destructive">{variantsError}</p> : null}

      <LessonReader
        lesson={lesson}
        headerTools={headerTools}
        savedPhraseTexts={savedPhraseTexts}
        onSavePhrase={onSavePhrase}
        onReviewPhrase={onReviewPhrase}
        onChunkEncounter={onChunkEncounter}
      />
      {chunkDetailSheet}
    </div>
  );
}
