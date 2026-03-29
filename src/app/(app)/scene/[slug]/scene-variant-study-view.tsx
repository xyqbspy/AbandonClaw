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

export function SceneVariantStudyView({
  lesson,
  topRightTool,
  headerTools,
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
}: {
  lesson: Lesson;
  topRightTool: ReactNode;
  headerTools: ReactNode;
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
}) {
  return (
    <div className="space-y-[var(--mobile-adapt-space-xl)]">
      <LessonReader
        lesson={lesson}
        minimalHeader
        topRightTool={topRightTool}
        headerTools={headerTools}
        savedPhraseTexts={savedPhraseTexts}
        onSavePhrase={onSavePhrase}
        onReviewPhrase={onReviewPhrase}
      />
    </div>
  );
}
