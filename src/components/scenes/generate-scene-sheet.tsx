"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingButton } from "@/components/shared/action-loading";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "easy", label: "初级" },
  { value: "medium", label: "进阶" },
];

const sentenceCountOptions: Array<{ value: SentenceCount; label: string }> = [
  { value: 6, label: "6句" },
  { value: 10, label: "10句" },
  { value: 14, label: "14句" },
];

const defaultForm = {
  promptText: "",
  tone: "natural" as Tone,
  difficulty: "easy" as Difficulty,
  sentenceCount: 10 as SentenceCount,
  reuseKnownChunks: true,
};

const panelClassName = "rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]";
const labelClassName = "mb-3 block pl-0.5 text-[13px] font-semibold text-[#1d1d1f]";

export function GenerateSceneSheet({
  open,
  onOpenChange,
  onGeneratingStatusChange,
  onGenerated,
}: GenerateSceneSheetProps) {
  const [promptText, setPromptText] = useState(defaultForm.promptText);
  const [tone, setTone] = useState<Tone>(defaultForm.tone);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultForm.difficulty);
  const [sentenceCount, setSentenceCount] = useState<SentenceCount>(defaultForm.sentenceCount);
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
      setError("再多写一点，至少 3 个字。");
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
          relatedChunkVariantsMatched: result.personalization?.relatedChunkVariantsMatched ?? [],
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
        className="max-h-[92vh] border-0 bg-[#F2F2F7] p-0 shadow-none sm:mx-auto sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[#F2F2F7] sm:rounded-[24px]">
          <div className="mx-auto my-[10px] h-[5px] w-9 rounded-[3px] bg-[#C7C7CC]" />

          <div className="px-5 pb-4">
            <h2 className="mb-1 text-[20px] font-bold text-[#1d1d1f]">生成我的场景</h2>
            <p className="text-[14px] text-[#86868B]">
              可以用中文或英文描述你最近想练的情境。
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-5">
            <div className={panelClassName}>
              <label htmlFor="scene-generate-prompt" className={labelClassName}>
                场景方向
              </label>
              <Textarea
                id="scene-generate-prompt"
                ref={textareaRef}
                value={promptText}
                onChange={(event) => {
                  setPromptText(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={`明天要和同事开会，但我还没准备好...
I want a short scene about canceling plans politely
我想练下班后很累但还得继续工作的表达`}
                className="min-h-32 border-0 bg-transparent px-0 py-0 text-[15px] leading-[1.5] text-[#1d1d1f] shadow-none focus-visible:ring-0"
                disabled={submitting}
              />
              <p className="mt-2.5 text-[12px] leading-[1.4] text-[#86868B]">
                示例：我想练礼貌拒绝加班 / I want to practice ordering coffee simply.
              </p>
            </div>

            <div className={panelClassName}>
              <p className={labelClassName}>语气风格</p>
              <SegmentedControl
                ariaLabel="语气风格"
                value={tone}
                onChange={setTone}
                options={toneOptions}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={panelClassName}>
                <p className={labelClassName}>难度</p>
                <SegmentedControl
                  ariaLabel="难度"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={difficultyOptions}
                  disabled={submitting}
                />
              </div>

              <div className={panelClassName}>
                <p className={labelClassName}>句数</p>
                <SegmentedControl
                  ariaLabel="句数"
                  value={sentenceCount}
                  onChange={setSentenceCount}
                  options={sentenceCountOptions}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={panelClassName}>
              <button
                type="button"
                role="switch"
                aria-checked={reuseKnownChunks}
                className="flex w-full items-center justify-between gap-4 text-left"
                onClick={() => setReuseKnownChunks((value) => !value)}
                disabled={submitting}
              >
                <div className="flex-1">
                  <p className="mb-0.5 text-[15px] font-semibold text-[#1d1d1f]">
                    尽量复用我练过的表达
                  </p>
                  <p className="text-[12px] leading-[1.4] text-[#86868B]">
                    更有熟悉感，适合做表达迁移练习。
                  </p>
                </div>
                <span
                  className={cn(
                    "relative inline-flex h-[31px] w-[51px] shrink-0 rounded-[16px] transition-colors duration-300",
                    reuseKnownChunks ? "bg-[#34C759]" : "bg-[#E9E9EA]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300",
                      reuseKnownChunks && "translate-x-5",
                    )}
                  />
                </span>
              </button>
            </div>

            {error ? (
              <div className="rounded-[14px] bg-[#fff1f0] px-4 py-3 text-sm text-[#d93025]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="bg-[#F2F2F7] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                radius="lg"
                className="h-[50px] text-[16px]"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <LoadingButton
                type="button"
                variant="default"
                radius="lg"
                className="h-[50px] w-full text-[16px]"
                onClick={handleSubmit}
                loading={submitting}
                loadingText="生成中..."
              >
                生成场景
              </LoadingButton>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
