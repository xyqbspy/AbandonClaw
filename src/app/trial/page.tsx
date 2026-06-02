import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpenText, Lock, Volume2 } from "lucide-react";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { listPublicTrialScenes } from "@/lib/server/scene/service";
import type { Lesson, LessonSentence } from "@/lib/types";

const flattenSentences = (lesson: Lesson): LessonSentence[] =>
  lesson.sections.flatMap((section) =>
    section.blocks.flatMap((block) => block.sentences),
  );

const getChunkCount = (lesson: Lesson) => {
  const chunks = new Set<string>();
  for (const sentence of flattenSentences(lesson)) {
    for (const chunk of sentence.chunks ?? []) {
      if (chunk.trim()) chunks.add(chunk.trim());
    }
    for (const detail of sentence.chunkDetails ?? []) {
      if (detail.text.trim()) chunks.add(detail.text.trim());
    }
  }
  return chunks.size;
};

export default async function TrialPage() {
  if (!isAnonymousTrialEnabled()) {
    redirect("/login?redirect=/trial");
  }

  const scenes = await listPublicTrialScenes();
  if (scenes.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium text-foreground/55">
            体验模式 · 可查看和听读,学习记录不会保存
          </p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            选择一个场景开始试用
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/65">
            这些场景已经准备好句子、表达详情和预生成音频。导入、生成、提交和加入复习会在注册后解锁。
          </p>
        </div>

        <div className="grid gap-3">
          {scenes.map((scene) => {
            const sentenceCount = flattenSentences(scene).length;
            const chunkCount = getChunkCount(scene);
            return (
              <Link
                key={scene.slug}
                href={`/trial/scene/${scene.slug}`}
                className="group rounded-lg border border-border/60 bg-card/80 p-4 transition hover:border-foreground/30 hover:bg-card"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {scene.title}
                      </h2>
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/60">
                        {scene.difficulty}
                      </span>
                    </div>
                    {scene.subtitle ? (
                      <p className="mt-1 text-sm leading-6 text-foreground/65">
                        {scene.subtitle}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/55">
                      <span className="inline-flex items-center gap-1">
                        <BookOpenText className="size-3.5" />
                        {sentenceCount} 句
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Volume2 className="size-3.5" />
                        已生成音频
                      </span>
                      <span>{chunkCount} 个表达</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                    进入听读
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm leading-6 text-foreground/65">
          <p className="inline-flex items-center gap-2 font-medium text-foreground">
            <Lock className="size-4" />
            注册后解锁写入能力
          </p>
          <p className="mt-1">
            自己导入或生成场景、生成更多练习题、提交练习结果、加入复习和保存表达都会写入个人学习库,体验模式不会执行这些动作。
          </p>
        </div>
      </section>
    </div>
  );
}
