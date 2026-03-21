"use client";

import { PracticeSet } from "@/lib/types/learning-flow";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
import { ScenePracticeViewLabels } from "./scene-view-labels";

type ScenePracticeViewProps = {
  practiceSet: PracticeSet | null;
  showAnswerMap: Record<string, boolean>;
  appleButtonSmClassName: string;
  appleDangerButtonSmClassName: string;
  labels: ScenePracticeViewLabels;
  onBack: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onToggleAnswer: (exerciseId: string) => void;
};

export function ScenePracticeView({
  practiceSet,
  showAnswerMap,
  appleButtonSmClassName,
  appleDangerButtonSmClassName,
  labels,
  onBack,
  onDelete,
  onComplete,
  onToggleAnswer,
}: ScenePracticeViewProps) {
  return (
    <div className="space-y-4">
      <section className={`space-y-3 rounded-lg p-4 ${APPLE_SURFACE}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
            onClick={onBack}
          >
            {labels.back}
          </button>
          <button
            type="button"
            className={`${appleDangerButtonSmClassName} px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={onDelete}
            disabled={!practiceSet}
          >
            {labels.delete}
          </button>
          <button
            type="button"
            className={`${appleButtonSmClassName} px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={onComplete}
            disabled={!practiceSet || practiceSet.status === "completed"}
          >
            {labels.complete}
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          {practiceSet?.sourceType === "variant" ? (
            <p>
              {labels.basedOnVariantPrefix}
              {`${practiceSet.sourceVariantTitle ?? "Variant"}；${labels.basedOnScenePrefix}${practiceSet.sourceSceneTitle}`}
            </p>
          ) : (
            <p>{labels.basedOnVariantPrefix}{practiceSet?.sourceSceneTitle ?? "-"}</p>
          )}
          <p className="mt-1">{labels.practiceHint}</p>
        </div>
      </section>

      {!practiceSet ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <section className={`space-y-3 rounded-lg p-4 ${APPLE_SURFACE}`}>
          <ul className="space-y-2">
            {practiceSet.exercises.map((exercise, index) => {
              const visible = Boolean(showAnswerMap[exercise.id]);
              return (
                <li
                  key={`${exercise.id}-${index}`}
                  className="rounded-md bg-[rgb(240,240,240)] p-3 text-sm"
                >
                  <p className="text-xs text-muted-foreground">{exercise.type}</p>
                  <p className="mt-1">{exercise.prompt}</p>
                  {exercise.chunkId ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labels.chunkPrefix} {exercise.chunkId}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className={`${appleButtonSmClassName} mt-2 px-2 py-1 text-xs`}
                    onClick={() => onToggleAnswer(exercise.id)}
                  >
                    {visible ? labels.hideAnswer : labels.showAnswer}
                  </button>
                  {visible ? (
                    <p className="mt-2 rounded bg-[rgb(240,240,240)] p-2 text-sm">
                      {exercise.answer.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
