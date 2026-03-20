"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSceneSentencesAction } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_INPUT_BASE } from "@/lib/ui/apple-style";

type EditableSentence = {
  sentenceId: string;
  speaker?: string;
  text: string;
  translation: string;
  tts: string;
  chunks: string[];
};

type EditableBlock = {
  blockId: string;
  type: "dialogue" | "monologue";
  speaker?: string;
  sentences: EditableSentence[];
};

type EditableSection = {
  sectionId: string;
  title?: string;
  blocks: EditableBlock[];
};

export function SceneSentenceEditorSheet({
  sceneId,
  slug,
  title,
  origin,
  sections,
}: {
  sceneId: string;
  slug: string;
  title: string;
  origin: "seed" | "imported";
  sections: EditableSection[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialSections = useMemo(() => sections, [sections]);
  const [draftSections, setDraftSections] = useState(initialSections);

  const resetDraft = () => setDraftSections(initialSections);

  const updateSentence = (
    targetSentenceId: string,
    field: "text" | "translation" | "tts" | "chunks",
    value: string,
  ) => {
    setDraftSections((current) =>
      current.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => ({
          ...block,
          sentences: block.sentences.map((sentence) => {
            if (sentence.sentenceId !== targetSentenceId) return sentence;
            if (field === "chunks") {
              return {
                ...sentence,
                chunks: value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              };
            }
            return {
              ...sentence,
              [field]: value,
            };
          }),
        })),
      })),
    );
  };

  const allSentences = draftSections.flatMap((section) =>
    section.blocks.flatMap((block) => block.sentences),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      resetDraft();
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateSceneSentencesAction({
          sceneId,
          sentences: allSentences.map((sentence) => ({
            sentenceId: sentence.sentenceId,
            text: sentence.text,
            translation: sentence.translation,
            tts: sentence.tts,
            chunks: sentence.chunks,
          })),
        });
        toast.success(`已更新 ${result.updatedCount} 条句子，并清理场景音频缓存。`);
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "保存失败，请稍后重试。");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`}
        onClick={() => handleOpenChange(true)}
      >
        编辑句子
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader className="space-y-1">
            <SheetTitle>编辑场景句子</SheetTitle>
            <SheetDescription>
              {title} · {slug}
              {origin === "seed" ? " · seed 场景后续同步可能覆盖手工修改" : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 py-4">
            {draftSections.map((section, sectionIndex) => (
              <section key={section.sectionId} className="space-y-3 rounded-2xl border border-border/60 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Section {sectionIndex + 1}
                    {section.title ? ` · ${section.title}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    这里改的是句子内容、翻译、TTS 文本和 chunks。保存后会清掉该场景线上音频缓存。
                  </p>
                </div>

                {section.blocks.map((block, blockIndex) => (
                  <div key={block.blockId} className="space-y-3 rounded-xl bg-muted/30 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Block {blockIndex + 1}</span>
                      <span>{block.type}</span>
                      <span>speaker: {block.speaker ?? "-"}</span>
                    </div>

                    {block.sentences.map((sentence, sentenceIndex) => (
                      <div key={sentence.sentenceId} className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Sentence {sentenceIndex + 1}</span>
                          <span>ID: {sentence.sentenceId}</span>
                          <span>speaker: {sentence.speaker ?? block.speaker ?? "-"}</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">英文句子</label>
                          <Textarea
                            value={sentence.text}
                            onChange={(event) =>
                              updateSentence(sentence.sentenceId, "text", event.target.value)
                            }
                            className={`min-h-20 ${APPLE_INPUT_BASE}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">中文翻译</label>
                          <Textarea
                            value={sentence.translation}
                            onChange={(event) =>
                              updateSentence(sentence.sentenceId, "translation", event.target.value)
                            }
                            className={`min-h-20 ${APPLE_INPUT_BASE}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">TTS 文本</label>
                          <Input
                            value={sentence.tts}
                            onChange={(event) =>
                              updateSentence(sentence.sentenceId, "tts", event.target.value)
                            }
                            className={APPLE_INPUT_BASE}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Chunks（每行一个）</label>
                          <Textarea
                            value={sentence.chunks.join("\n")}
                            onChange={(event) =>
                              updateSentence(sentence.sentenceId, "chunks", event.target.value)
                            }
                            className={`min-h-24 font-mono text-xs ${APPLE_INPUT_BASE}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>

          <SheetFooter className="gap-2 px-4 pb-4">
            <Button
              type="button"
              variant="ghost"
              className={`${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`}
              onClick={() => {
                resetDraft();
                setOpen(false);
              }}
              disabled={isPending}
            >
              取消
            </Button>
            <Button
              type="button"
              className={`${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`}
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "保存中..." : "保存并清理音频"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
