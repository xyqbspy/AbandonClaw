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
  auxiliaryTools,
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onBlockPlayback,
  onSentencePlayback,
}: {
  lesson: Lesson;
  topRightTool: ReactNode;
  headerTools: ReactNode;
  auxiliaryTools?: ReactNode;
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onBlockPlayback?: (payload: { lesson: Lesson; block: import("@/lib/types").LessonBlock }) => void;
  onSentencePlayback?: (payload: { lesson: Lesson; sentence: import("@/lib/types").LessonSentence }) => void;
}) {
  return (
    <div className="min-h-screen space-y-[var(--mobile-adapt-space-xl)] bg-[#f8fafc] px-3 pt-3 pb-28 lg:px-5">
      <LessonReader
        lesson={lesson}
        minimalHeader
        topRightTool={topRightTool}
        headerTools={headerTools}
        savedPhraseTexts={savedPhraseTexts}
        onSavePhrase={onSavePhrase}
        onReviewPhrase={onReviewPhrase}
        onBlockPlayback={onBlockPlayback}
        onSentencePlayback={onSentencePlayback}
      />
      {auxiliaryTools ? (
        <div className="flex justify-end" aria-label="变体辅助操作">
          {auxiliaryTools}
        </div>
      ) : null}
    </div>
  );
}
