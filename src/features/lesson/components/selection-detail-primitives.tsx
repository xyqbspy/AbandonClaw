"use client";

import { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailInfoBlock, DetailLoadingBlock } from "@/components/shared/detail-info-blocks";
import { ExampleSentenceCards } from "@/components/shared/example-sentence-cards";
import { SelectionChunkLayer } from "@/lib/types";
import {
  APPLE_BADGE_SUCCESS,
  APPLE_BODY_TEXT,
  APPLE_BUTTON_BASE,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export const selectionSectionTitleClassName = cn(
  APPLE_META_TEXT,
  "px-1 text-[length:var(--mobile-font-body-sm)] font-semibold uppercase tracking-[0.08em] text-[var(--app-foreground-muted)]",
);

export const selectionCardClassName = cn(
  APPLE_PANEL_RAISED,
  "overflow-hidden rounded-[20px] shadow-[var(--app-shadow-raised)]",
);

export const selectionActionButtonClassName =
  "inline-flex h-[var(--mobile-control-height)] items-center justify-center gap-[var(--mobile-space-sm)] rounded-full px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-semibold transition-all duration-150 active:scale-[0.96] active:opacity-80";

export const selectionSecondaryActionButtonClassName = cn(
  APPLE_BUTTON_BASE,
  selectionActionButtonClassName,
  "border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]",
);

export const selectionIconButtonClassName = cn(
  APPLE_BUTTON_BASE,
  "inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] px-0 text-[var(--app-foreground)] transition-all duration-150 active:scale-[0.96] active:opacity-80 hover:bg-[var(--app-surface-hover)]",
);

export const selectionFooterButtonClassName = cn(
  APPLE_BUTTON_BASE,
  "h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] text-[length:var(--mobile-font-sheet-body)] font-semibold transition-all duration-150 active:scale-[0.96] [@media(max-height:760px)]:h-[var(--mobile-control-height)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]",
);

export const selectionFooterSecondaryButtonClassName = cn(
  selectionFooterButtonClassName,
  "border border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-[var(--app-foreground)] shadow-none hover:bg-[var(--app-surface-hover)]",
);

export const selectionFooterPrimaryButtonClassName = cn(
  selectionFooterButtonClassName,
  "border-0 bg-[var(--app-chunks-sheet-primary-bg)] text-[var(--app-chunks-sheet-primary-text)] shadow-[var(--app-chunks-sheet-primary-shadow)] hover:bg-[var(--app-chunks-sheet-primary-hover)] disabled:bg-[#D0D7E2] disabled:text-white/80",
);

const detailBodyClassName = cn(
  APPLE_BODY_TEXT,
  "text-[length:var(--mobile-font-sheet-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-chunks-sheet-body)]",
);

const emptyDetailClassName = cn(
  APPLE_BODY_TEXT,
  "rounded-[20px] border border-dashed border-[var(--app-border-soft)] bg-[var(--app-surface)] px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-foreground-muted)]",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSentenceWithChunkHighlight(sentence: string, expression: string): ReactNode {
  if (!sentence || !expression) return sentence;

  const matcher = new RegExp(`(${escapeRegExp(expression)})`, "ig");
  const parts = sentence.split(matcher);

  if (parts.length === 1) return sentence;

  return parts.map((part, index) => {
    if (part.toLowerCase() !== expression.toLowerCase()) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark
        key={`${part}-${index}`}
        className={`inline-block rounded-full px-[var(--mobile-adapt-space-sm)] py-[2px] font-bold not-italic ${APPLE_BADGE_SUCCESS}`}
      >
        {part}
      </mark>
    );
  });
}

export function hasChinese(value?: string) {
  return /[\u4e00-\u9fff]/.test((value ?? "").trim());
}

export function SelectionSentenceCard({
  sentenceText,
  translationText,
  speakingText,
  loadingText,
  blockSpeakText,
  onPronounceBlock,
  emptyText,
}: {
  sentenceText: string | null;
  translationText: string | null;
  speakingText: string | null;
  loadingText?: string | null;
  blockSpeakText: string;
  onPronounceBlock: () => void;
  emptyText: string;
}) {
  return (
    <div className={cn(selectionCardClassName, "p-[var(--mobile-space-sheet)]")}>
      {sentenceText ? (
        <>
          <div className="flex items-start gap-[var(--mobile-space-sm)]">
            <p className="min-w-0 flex-1 text-[length:clamp(1rem,4.4vw,1.125rem)] font-medium leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-foreground)]">
              {sentenceText}
            </p>
            <TtsActionButton
              active={speakingText === blockSpeakText}
              loading={loadingText === blockSpeakText}
              onClick={onPronounceBlock}
              ariaLabel={speakingText === blockSpeakText ? "停止朗读" : "朗读"}
              variant="ghost"
              size="icon"
              surface="soft"
              className={selectionIconButtonClassName}
              iconClassName="size-4"
            />
          </div>
          <p className="mt-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-chunks-sheet-body)]">
            {translationText || "该句翻译待补充。"}
          </p>
        </>
      ) : (
        <p className="text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-foreground-muted)]">
          {emptyText}
        </p>
      )}
    </div>
  );
}

export function SelectionChunkDetailBlocks({
  chunkDetail,
  loading,
  speakingText,
  loadingText,
  onPronounce,
  emptyText,
}: {
  chunkDetail: SelectionChunkLayer | null;
  loading: boolean;
  speakingText: string | null;
  loadingText?: string | null;
  onPronounce: (text: string) => void;
  emptyText: string;
}) {
  const visibleExamples = chunkDetail?.examples.slice(0, 2) ?? [];

  if (loading) {
    return (
      <div className="space-y-3">
        {[
          { title: "中文释义", icon: "📘" },
          { title: "当前句中含义", icon: "🎯" },
          { title: "常见用法", icon: "💡" },
        ].map(({ title, icon }) => (
          <DetailLoadingBlock key={title} title={title} icon={<span>{icon}</span>} />
        ))}
        <div className={cn(selectionCardClassName, "space-y-3 p-[var(--mobile-space-sheet)]")}>
          <p className={cn(selectionSectionTitleClassName, "text-[var(--app-foreground)]")}>
            📖 例句
          </p>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!chunkDetail) {
    return <div className={emptyDetailClassName}>{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      <DetailInfoBlock title="中文释义" icon={<span>📘</span>}>
        <p className={detailBodyClassName}>{chunkDetail.translation}</p>
      </DetailInfoBlock>

      <DetailInfoBlock title="当前句中含义" icon={<span>🎯</span>}>
        <p className={detailBodyClassName}>
          {hasChinese(chunkDetail.meaningInSentence)
            ? chunkDetail.meaningInSentence
            : `这里表示：${chunkDetail.translation || "该表达在本句中的含义。"}`}
        </p>
      </DetailInfoBlock>

      <DetailInfoBlock title="常见用法" icon={<span>💡</span>}>
        <p className={detailBodyClassName}>
          {hasChinese(chunkDetail.grammarLabel) ? `${chunkDetail.grammarLabel} · ` : ""}
          {hasChinese(chunkDetail.usageNote)
            ? chunkDetail.usageNote
            : "先理解它在这句话里的作用，再放回整句复述。"}
        </p>
      </DetailInfoBlock>

      <div className={cn(selectionCardClassName, "px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]")}>
        <p className={cn(selectionSectionTitleClassName, "mb-3 text-[var(--app-foreground)]")}>
          📖 例句
        </p>
        {visibleExamples.length > 0 ? (
          <ExampleSentenceCards
            examples={visibleExamples.map((example) => ({
              en: example.en,
              zh: hasChinese(example.zh) ? example.zh : "",
            }))}
            expression={chunkDetail.text}
            renderSentenceWithExpressionHighlight={renderSentenceWithChunkHighlight}
            speakLabel="朗读"
            onSpeak={onPronounce}
            isSpeakingText={(text) => speakingText === text}
            isLoadingText={(text) => loadingText === text}
          />
        ) : (
          <p className={detailBodyClassName}>暂无例句。</p>
        )}
      </div>
    </div>
  );
}

export function SelectionDetailActions({
  saved,
  disabled,
  onSave,
  onReview,
}: {
  saved?: boolean;
  disabled?: boolean;
  onSave: () => void;
  onReview: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="ghost"
        className={cn(selectionFooterSecondaryButtonClassName, "cursor-pointer")}
        onClick={onSave}
        disabled={disabled}
      >
        {saved ? "已收藏" : "收藏短语"}
      </Button>
      <Button
        variant="ghost"
        className={cn(selectionFooterPrimaryButtonClassName, "cursor-pointer")}
        onClick={onReview}
        disabled={disabled}
      >
        <RotateCcw className="size-4" />
        加入复习
      </Button>
    </div>
  );
}
