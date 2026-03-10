"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { MotionCardLink } from "@/components/shared/motion-card-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { scenes } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { parseCustomScenario } from "@/lib/utils/custom-scenario-parser";
import {
  getCustomScenariosSnapshot,
  removeCustomScenarioFromStorage,
  saveCustomScenarioToStorage,
} from "@/lib/utils/custom-scenario-storage";

const difficultyLabel: Record<string, string> = {
  Beginner: "入门",
  Intermediate: "中级",
  Advanced: "进阶",
};

const EMPTY_CUSTOM_SCENES: Lesson[] = [];
const subscribeNoop = () => () => {};

const placeholderExample = `A: Are we still on for dinner?
B: I was just about to text you. Something came up at work.
A: Again?
B: Yeah, I'm stuck at the office.`;

export default function ScenesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const customScenes = useSyncExternalStore<Lesson[]>(
    subscribeNoop,
    () => getCustomScenariosSnapshot(),
    () => EMPTY_CUSTOM_SCENES,
  );
  void refreshTick;
  const allScenes = useMemo(() => [...customScenes, ...scenes], [customScenes]);

  useEffect(() => {
    if (!dialogOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [dialogOpen]);

  const closeDialog = () => {
    setDialogOpen(false);
    setError("");
  };

  const handleImport = () => {
    const result = parseCustomScenario(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    saveCustomScenarioToStorage(result.value);
    setRefreshTick((prev) => prev + 1);
    setInput("");
    closeDialog();
    toast.success("自定义场景已导入");
  };

  const handleDeleteCustomScene = (scene: Lesson) => {
    const confirmed = window.confirm(`确认删除「${scene.title}」吗？`);
    if (!confirmed) return;
    removeCustomScenarioFromStorage(scene.id);
    setRefreshTick((prev) => prev + 1);
    toast.success("已删除自定义场景");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="场景学习"
        title="选择一个真实对话场景"
        description="从高频生活语境开始，逐句理解，再进入短语解析与复习。"
      />

      <Card className="border-border/70 bg-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-0">
              <p className="text-sm font-semibold leading-5">自定义场景</p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                粘贴英语对话，导入到场景列表
              </p>
              <p className="text-[11px] text-muted-foreground/90">自定义 · 导入对话</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 cursor-pointer shrink-0 px-2 text-[11px]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-3" />
              导入场景
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {allScenes.map((scene) => {
          const sentenceCount = scene.sections.reduce(
            (total, section) => total + section.sentences.length,
            0,
          );
          const isCustom = scene.sourceType === "custom";

          return (
            <MotionCardLink
              key={scene.id}
              href={`/scene/${scene.slug}`}
              motionId={scene.id}
              ignoreSelector="[data-scene-delete='true']"
              className="group block"
            >
              {(motionStateAttrs) => (
                <Card
                  data-pressed={motionStateAttrs["data-pressed"]}
                  data-activated={motionStateAttrs["data-activated"]}
                  className="scene-card-motion h-full cursor-pointer border-border/70 transition-all duration-150 hover:border-primary/40 hover:shadow-sm"
                >
                  <CardHeader className="space-y-0.5 p-2.5 pb-1.5 sm:p-3 sm:pb-2">
                    <div className="flex items-start gap-2">
                      <CardTitle className="min-w-0 flex-1 line-clamp-1 text-[15px] leading-5 sm:text-base">
                        {scene.title}
                      </CardTitle>
                      {isCustom ? (
                        <button
                          type="button"
                          data-scene-delete="true"
                          aria-label="删除自定义场景"
                          className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteCustomScene(scene);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{scene.subtitle}</p>
                  </CardHeader>
                  <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0">
                    <p className="text-[11px] text-muted-foreground">
                      {difficultyLabel[scene.difficulty] ?? "中级"} · {sentenceCount}句 ·{" "}
                      {scene.estimatedMinutes}分钟
                    </p>
                  </CardContent>
                </Card>
              )}
            </MotionCardLink>
          );
        })}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/25 p-3 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label="关闭导入弹框"
            className="absolute inset-0"
            onClick={closeDialog}
          />
          <Card className="relative z-10 w-full max-w-2xl border-border/80">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">导入自定义英语场景</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    支持粘贴一段英语对话，系统会自动拆分成适合学习的句子
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label="关闭"
                  onClick={closeDialog}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError("");
                }}
                placeholder={placeholderExample}
                className="min-h-44 text-sm leading-6"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} className="cursor-pointer">
                  取消
                </Button>
                <Button type="button" onClick={handleImport} className="cursor-pointer">
                  导入
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
