"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingButton } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLE_BANNER_DANGER,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_MD,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";
import { generatePersonalizedSceneFromApi } from "@/lib/utils/scenes-api";

type Tone = "natural" | "polite" | "casual" | "simple";
type Difficulty = "easy" | "medium";
type SentenceCount = 6 | 10 | 14;
type RelatedChunkVariant = {
  text: string;
  differenceLabel: string;
  knownChunkText?: string | null;
};

interface GenerateSceneSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGeneratingStatusChange?: (payload: {
    status: "running" | "failed";
    message?: string;
  }) => void;
  onGenerated: (scene: {
    slug: string;
    title: string;
    migrationInsight?: {
      relatedChunkVariantsUsed: RelatedChunkVariant[];
      relatedChunkVariantsMatched: RelatedChunkVariant[];
    };
  }) => Promise<void> | void;
}

const toneOptions: Array<{ value: Tone; label: string }> = [
  { value: "natural", label: "自然" },
  { value: "polite", label: "礼貌" },
  { value: "casual", label: "口语" },
  { value: "simple", label: "简洁" },
];

const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
];

const sentenceCountOptions: SentenceCount[] = [6, 10, 14];
const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_MD}`;
const appleSegmentBaseClassName = `${APPLE_BUTTON_BASE} h-9 px-3 text-sm font-medium`;
const appleSegmentActiveClassName = `${APPLE_BUTTON_STRONG} h-9 px-3 text-sm font-medium`;

const defaultForm = {
  promptText: "",
  tone: "natural" as Tone,
  difficulty: "easy" as Difficulty,
  sentenceCount: 10 as SentenceCount,
  reuseKnownChunks: true,
};

export function GenerateSceneSheet({
  open,
  onOpenChange,
  onGeneratingStatusChange,
  onGenerated,
}: GenerateSceneSheetProps) {
  const [promptText, setPromptText] = useState(defaultForm.promptText);
  const [tone, setTone] = useState<Tone>(defaultForm.tone);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultForm.difficulty);
  const [sentenceCount, setSentenceCount] = useState<SentenceCount>(
    defaultForm.sentenceCount,
  );
  const [reuseKnownChunks, setReuseKnownChunks] = useState(defaultForm.reuseKnownChunks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPromptText(defaultForm.promptText);
    setTone(defaultForm.tone);
    setDifficulty(defaultForm.difficulty);
    setSentenceCount(defaultForm.sentenceCount);
    setReuseKnownChunks(defaultForm.reuseKnownChunks);
    setError(null);
    setSubmitting(false);
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleSubmit = async () => {
    const nextPrompt = promptText.trim();
    if (!nextPrompt) {
      setError("请先输入你想练的场景方向。");
      return;
    }
    if (nextPrompt.length < 3) {
      setError("再多写一点，至少 3 个字符。");
      return;
    }

    setSubmitting(true);
    setError(null);
    onGeneratingStatusChange?.({ status: "running", message: "正在生成场景..." });

    try {
      const result = await generatePersonalizedSceneFromApi({
        promptText: nextPrompt,
        tone,
        difficulty,
        sentenceCount,
        reuseKnownChunks,
      });
      onOpenChange(false);
      await onGenerated({
        slug: result.scene.slug,
        title: result.scene.title,
        migrationInsight: {
          relatedChunkVariantsUsed: result.personalization?.relatedChunkVariantsUsed ?? [],
          relatedChunkVariantsMatched:
            result.personalization?.relatedChunkVariantsMatched ?? [],
        },
      });
    } catch (submitError) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[generate-scene-sheet] submit failed", submitError);
      }
      const message = "生成失败了，请稍后重试。";
      setError(message);
      onGeneratingStatusChange?.({ status: "failed", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] border-0 bg-transparent p-0 shadow-none sm:mx-auto sm:max-w-2xl"
        showCloseButton
      >
        <div className={`mx-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[var(--app-radius-card)] sm:rounded-[var(--app-radius-card)] ${APPLE_PANEL_RAISED}`}>
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>生成我的场景</SheetTitle>
            <SheetDescription>
              可以用中文或英文描述你最近想练的情境。
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <div className={`space-y-2 p-3 ${APPLE_PANEL}`}>
              <Label htmlFor="scene-generate-prompt">场景方向</Label>
              <Textarea
                id="scene-generate-prompt"
                ref={textareaRef}
                value={promptText}
                onChange={(event) => {
                  setPromptText(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={`明天要和同事开会，但我还没准备好
I want a short scene about canceling plans politely
我想练下班后很累但还得继续工作的表达`}
                className="min-h-32 text-sm leading-6"
                disabled={submitting}
              />
              <p className={APPLE_META_TEXT}>
                示例：我想练礼貌拒绝加班 / I want to practice ordering coffee simply.
              </p>
            </div>

            <div className={`space-y-2 p-3 ${APPLE_PANEL}`}>
              <Label>语气风格</Label>
              <div className="grid grid-cols-4 gap-2">
                {toneOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      tone === option.value
                        ? appleSegmentActiveClassName
                        : appleSegmentBaseClassName,
                    )}
                    onClick={() => setTone(option.value)}
                    disabled={submitting}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`space-y-2 p-3 ${APPLE_PANEL}`}>
                <Label>难度</Label>
                <div className="flex gap-2">
                  {difficultyOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "flex-1",
                        difficulty === option.value
                          ? appleSegmentActiveClassName
                          : appleSegmentBaseClassName,
                      )}
                      onClick={() => setDifficulty(option.value)}
                      disabled={submitting}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className={`space-y-2 p-3 ${APPLE_PANEL}`}>
                <Label>句数</Label>
                <div className="flex gap-2">
                  {sentenceCountOptions.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "flex-1",
                        sentenceCount === value
                          ? appleSegmentActiveClassName
                          : appleSegmentBaseClassName,
                      )}
                      onClick={() => setSentenceCount(value)}
                      disabled={submitting}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-3 ${APPLE_PANEL}`}>
              <button
                type="button"
                role="switch"
                aria-checked={reuseKnownChunks}
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setReuseKnownChunks((value) => !value)}
                disabled={submitting}
              >
                <div className="space-y-1">
                  <p className={APPLE_TITLE_SM}>尽量复用我练过的表达</p>
                  <p className={APPLE_META_TEXT}>
                    这样会更有熟悉感，也更适合做表达迁移练习。
                  </p>
                </div>
                <span
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    reuseKnownChunks ? "bg-[var(--app-surface-strong)]" : "bg-[var(--app-surface-hover)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                      reuseKnownChunks ? "translate-x-5" : "translate-x-1",
                    )}
                  />
                </span>
              </button>
            </div>

            {error ? <p className={`text-sm ${APPLE_BANNER_DANGER}`}>{error}</p> : null}
          </div>

          <SheetFooter className="px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <LoadingButton
              type="button"
              className={cn("h-10 w-full", appleButtonClassName)}
              onClick={handleSubmit}
              loading={submitting}
              loadingText="生成中..."
            >
              生成场景
            </LoadingButton>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
