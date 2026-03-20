"use client";

import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { generatePersonalizedSceneFromApi } from "@/lib/utils/scenes-api";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_MD } from "@/lib/ui/apple-style";

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
        className="max-h-[92vh] rounded-t-2xl border-0 bg-white p-0 sm:mx-auto sm:max-w-2xl sm:rounded-2xl"
        showCloseButton
      >
        <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
          <SheetTitle>生成我的场景</SheetTitle>
          <SheetDescription>
            可以用中文或英文描述你最近想练的情境。
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2 rounded-xl bg-[rgb(246,246,246)] p-3">
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
            <p className="text-xs text-muted-foreground">
              示例：我想练礼貌拒绝加班 / I want to practice ordering coffee simply.
            </p>
          </div>

          <div className="space-y-2 rounded-xl bg-[rgb(246,246,246)] p-3">
            <Label>语气风格</Label>
            <div className="grid grid-cols-4 gap-2">
              {toneOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    appleSegmentBaseClassName,
                    tone === option.value
                      ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                      : "text-foreground/80 hover:bg-[rgb(238,238,238)]",
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
            <div className="space-y-2 rounded-xl bg-[rgb(246,246,246)] p-3">
              <Label>难度</Label>
              <div className="flex gap-2">
                {difficultyOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      `${appleSegmentBaseClassName} flex-1`,
                      difficulty === option.value
                        ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                        : "text-foreground/80 hover:bg-[rgb(238,238,238)]",
                    )}
                    onClick={() => setDifficulty(option.value)}
                    disabled={submitting}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-[rgb(246,246,246)] p-3">
              <Label>句数</Label>
              <div className="flex gap-2">
                {sentenceCountOptions.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      `${appleSegmentBaseClassName} flex-1`,
                      sentenceCount === value
                        ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                        : "text-foreground/80 hover:bg-[rgb(238,238,238)]",
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

          <div className="rounded-xl bg-[rgb(246,246,246)] p-3">
            <button
              type="button"
              role="switch"
              aria-checked={reuseKnownChunks}
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setReuseKnownChunks((value) => !value)}
              disabled={submitting}
            >
              <div>
                <p className="text-sm font-medium">尽量复用我练过的表达</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  这样会更有熟悉感，也更适合迁移练习。
                </p>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  reuseKnownChunks ? "bg-[rgb(32,44,60)]" : "bg-[rgb(220,220,220)]",
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button
            type="button"
            variant="ghost"
            className={cn("h-10 w-full", appleButtonClassName)}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "生成中..." : "生成场景"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

