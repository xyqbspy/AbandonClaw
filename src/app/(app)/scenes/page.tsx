"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { scenes } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { parseCustomScenario } from "@/lib/utils/custom-scenario-parser";
import {
  getCustomScenariosSnapshot,
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
  const customScenes = useSyncExternalStore<Lesson[]>(
    subscribeNoop,
    () => getCustomScenariosSnapshot(),
    () => EMPTY_CUSTOM_SCENES,
  );
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
    setInput("");
    closeDialog();
    toast.success("自定义场景已导入");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="场景学习"
        title="选择一个真实对话场景"
        description="从高频生活语境开始，逐句理解，再进入短语解析与复习。"
      />

      <Card className="border-border/70 bg-card">
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold leading-5">自定义场景</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                粘贴英语对话，导入到场景列表
              </p>
              <p className="text-xs text-muted-foreground/90">自定义 · 导入对话</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8 cursor-pointer shrink-0 px-2.5 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-3.5" />
              导入场景
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {allScenes.map((scene) => {
          const sentenceCount = scene.sections.reduce(
            (total, section) => total + section.sentences.length,
            0,
          );

          return (
            <Link key={scene.id} href={`/scene/${scene.slug}`} className="group block">
              <Card className="h-full cursor-pointer border-border/70 transition-all duration-150 hover:border-primary/40 hover:shadow-sm">
                <CardHeader className="space-y-1.5 p-3.5 pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="line-clamp-1 text-base leading-6">{scene.title}</CardTitle>
                    {scene.sourceType === "custom" ? (
                      <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                        自定义
                      </Badge>
                    ) : null}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{scene.subtitle}</p>
                </CardHeader>
                <CardContent className="p-3.5 pt-0">
                  <p className="text-xs text-muted-foreground">
                    {difficultyLabel[scene.difficulty] ?? "中级"} · {sentenceCount}句 ·{" "}
                    {scene.estimatedMinutes}分钟
                  </p>
                </CardContent>
              </Card>
            </Link>
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
