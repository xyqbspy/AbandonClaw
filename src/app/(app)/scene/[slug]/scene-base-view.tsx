"use client";

import { ReactNode } from "react";
import {
  LessonReader,
  type LessonReaderSceneLoopControls,
} from "@/features/lesson/components/lesson-reader";
import {
  SCENE_PAGE_CONTENT_ANCHOR_CLASSNAME,
  SCENE_PAGE_ERROR_TEXT_CLASSNAME,
  SCENE_PAGE_STACK_CLASSNAME,
} from "@/features/scene/components/scene-page-styles";
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
  trainingNextStep,
  headerTools,
  headerTitle,
  onBackToList,
  interactionMode = "default",
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onSceneLoopPlayback,
  onBlockPlayback,
  onSentencePlayback,
  onChunkEncounter,
  onSentencePracticeComplete,
  chunkDetailSheet,
}: {
  lesson: Lesson;
  practiceError: string | null;
  variantsError: string | null;
  trainingPanel?: ReactNode;
  trainingNextStep?: (controls: LessonReaderSceneLoopControls) => ReactNode;
  headerTools: ReactNode;
  headerTitle?: string;
  onBackToList?: () => void;
  interactionMode?: "default" | "training";
  savedPhraseTexts: string[];
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
  onBlockPlayback?: (payload: { lesson: Lesson; block: import("@/lib/types").LessonBlock }) => void;
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
    <div className={SCENE_PAGE_STACK_CLASSNAME}>
      {practiceError ? <p className={SCENE_PAGE_ERROR_TEXT_CLASSNAME}>{practiceError}</p> : null}
      {variantsError ? <p className={SCENE_PAGE_ERROR_TEXT_CLASSNAME}>{variantsError}</p> : null}

      {trainingPanel}
      <div className={SCENE_PAGE_CONTENT_ANCHOR_CLASSNAME}>
        <LessonReader
          lesson={lesson}
          headerTools={headerTools}
          headerTitle={headerTitle}
          onBackToList={onBackToList}
          trainingTopPanel={trainingNextStep}
          interactionMode={interactionMode}
          savedPhraseTexts={savedPhraseTexts}
          onSavePhrase={onSavePhrase}
          onReviewPhrase={onReviewPhrase}
          onSceneLoopPlayback={onSceneLoopPlayback}
          onBlockPlayback={onBlockPlayback}
          onSentencePlayback={onSentencePlayback}
          onChunkEncounter={onChunkEncounter}
          onSentencePracticeComplete={onSentencePracticeComplete}
        />
      </div>
      {chunkDetailSheet}
    </div>
  );
}
