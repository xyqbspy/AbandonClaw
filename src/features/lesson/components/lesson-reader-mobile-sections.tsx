"use client";

import { RefObject, useState } from "react";
import { Languages } from "lucide-react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getSectionSentences } from "@/lib/shared/lesson-content";
import { APPLE_META_TEXT, APPLE_PANEL } from "@/lib/ui/apple-style";
import { groupSentencesForMobile, MobileSentenceGroup } from "./lesson-reader-logic";

const mobileDialogueActionButtonClassName =
  "size-[var(--mobile-icon-button)] rounded-full border-transparent bg-transparent text-[var(--app-foreground-muted)] shadow-none transition-colors hover:bg-transparent hover:text-[var(--app-foreground)]";

type LessonReaderMobileSectionsProps = {
  lesson: Lesson;
  currentSectionId: string | null;
  activeSentenceId: string | null;
  effectiveSpeakingText: string | null;
  isChunkLoading: (text: string) => boolean;
  handleLoopSentence: (text: string) => void;
  handleMobileGroupTap: (group: MobileSentenceGroup) => void;
  handleMobileSentenceTap: (sentenceId: string, group: MobileSentenceGroup) => void;
  sentenceNodeMapRef: RefObject<Record<string, HTMLDivElement | null>>;
};

export function LessonReaderMobileSections({
  lesson,
  currentSectionId,
  activeSentenceId,
  effectiveSpeakingText,
  isChunkLoading,
  handleLoopSentence,
  handleMobileGroupTap,
  handleMobileSentenceTap,
  sentenceNodeMapRef,
}: LessonReaderMobileSectionsProps) {
  const [openTranslations, setOpenTranslations] = useState<Record<string, boolean>>({});

  return (
    <div className="overflow-hidden bg-transparent">
      {lesson.sections.map((section) => {
        const active = currentSectionId === section.id;
        const groupedSentences = groupSentencesForMobile(
          getSectionSentences(section, lesson.sceneType ?? "monologue"),
        );

        return (
          <div key={section.id} className="space-y-[var(--mobile-space-sm)]">
            {groupedSentences.map((group, groupIndex) => {
              const groupKey = `${section.id}-group-${groupIndex}`;
              const groupText = group.map((sentence) => sentence.text).join(" ");
              const groupTranslation = group.map((sentence) => sentence.translation).join(" ");
              const groupPlaying = effectiveSpeakingText === groupText;
              const groupSelected = group.some((sentence) => sentence.id === activeSentenceId);
              const groupRelatedChunks = Array.from(new Set(group.flatMap((sentence) => sentence.chunks)));
              const groupContext: MobileSentenceGroup = {
                key: groupKey,
                sentenceIds: group.map((sentence) => sentence.id),
                text: groupText,
                translation: groupTranslation,
                relatedChunks: groupRelatedChunks,
                speaker: group.length === 1 ? group[0]?.speaker : undefined,
              };
              const translationOpen = Boolean(openTranslations[groupKey]);

              return (
                <div
                  key={groupKey}
                  className={cn(
                    "rounded-[var(--app-radius-panel)] px-[var(--mobile-space-md)] py-[var(--mobile-space-xs)] transition-colors duration-150",
                    groupSelected
                      ? "bg-accent/12"
                      : active
                        ? "bg-[var(--app-surface-subtle)]"
                        : "hover:bg-[var(--app-surface-hover)]",
                  )}
                >
                  <div className="px-[var(--mobile-space-xs)] py-[clamp(2px,0.6vw,4px)]">
                    <div
                      className={cn(
                        "cursor-pointer transition-colors",
                        groupPlaying ? "text-primary" : "",
                      )}
                      onClick={() => handleMobileGroupTap(groupContext)}
                    >
                      <div className="mb-[var(--mobile-space-sm)] flex items-center justify-end gap-[var(--mobile-space-sm)]">
                        <button
                          type="button"
                          aria-label={translationOpen ? "隐藏翻译" : "显示翻译"}
                          className={cn(
                            "inline-flex items-center justify-center",
                            mobileDialogueActionButtonClassName,
                            translationOpen && "text-primary hover:text-primary",
                            groupSelected &&
                              !translationOpen &&
                              "text-primary/80 hover:text-primary/95",
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenTranslations((prev) => ({
                              ...prev,
                              [groupKey]: !prev[groupKey],
                            }));
                          }}
                        >
                          <Languages className="size-4" />
                        </button>
                        <TtsActionButton
                          active={groupPlaying}
                          loading={isChunkLoading(groupText)}
                          variant="ghost"
                          size="icon"
                          surface="soft"
                          ariaLabel={groupPlaying ? "停止朗读" : "朗读"}
                          className={cn(
                            "leading-none",
                            mobileDialogueActionButtonClassName,
                            groupSelected
                              ? "text-primary/80 hover:text-primary/95"
                              : APPLE_META_TEXT,
                            (groupPlaying || isChunkLoading(groupText)) && "text-primary hover:text-primary",
                          )}
                          iconClassName="size-4"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleLoopSentence(groupText);
                          }}
                        />
                      </div>

                      <div
                        className={cn(
                          "mb-[var(--mobile-space-md)] grid overflow-hidden transition-all duration-200",
                          translationOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <p
                          className={`min-h-0 rounded-[var(--app-radius-panel)] px-[var(--mobile-space-md)] py-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body-sm)] leading-[1.55] ${APPLE_META_TEXT} ${APPLE_PANEL}`}
                        >
                          {groupTranslation || "该段翻译暂未提供。"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-[var(--mobile-space-sm)]">
                      {group.map((sentence) => {
                        const sentenceSelected = sentence.id === activeSentenceId;
                        return (
                          <div
                            key={sentence.id}
                            ref={(node) => {
                              sentenceNodeMapRef.current[sentence.id] = node;
                            }}
                            className="transition-colors"
                          >
                            <p
                              data-sentence-id={sentence.id}
                              data-sentence-text={sentence.text}
                              data-sentence-translation={sentence.translation}
                              className={cn(
                                "cursor-pointer break-words text-[length:var(--mobile-font-body)] leading-[1.62] font-normal tracking-[0.005em] text-foreground/95",
                                sentenceSelected && "text-primary",
                              )}
                              onClick={() => handleMobileSentenceTap(sentence.id, groupContext)}
                            >
                              {sentence.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
