import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpenText, Clock3, Lock, Volume2 } from "lucide-react";
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

const getDifficultyLabel = (difficulty: Lesson["difficulty"]) => {
  if (difficulty === "Beginner") return "入门";
  if (difficulty === "Advanced") return "进阶";
  return "中级";
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
    <div className="relative min-h-screen bg-[#f8fafc] px-3 pb-[8rem] font-sans lg:px-5">
      <section className="mx-auto w-full max-w-5xl space-y-5 py-5 sm:py-8">
        <div className="space-y-2 px-1">
          <p className="text-[10px] font-black uppercase tracking-tight text-slate-400">
            体验模式 · 可查看和听读,学习记录不会保存
          </p>
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
            选择一个场景开始试用
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            这些场景已经准备好句子、表达详情和预生成音频。导入、生成、提交和加入复习会在注册后解锁。
          </p>
        </div>

        <div className="space-y-4">
          {scenes.map((scene) => {
            const sentenceCount = flattenSentences(scene).length;
            const chunkCount = getChunkCount(scene);
            return (
              <Link
                key={scene.slug}
                href={`/trial/scene/${scene.slug}`}
                className="group block rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 active:scale-[0.99] active:opacity-90"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                      {scene.title}
                    </h2>
                    {scene.subtitle ? (
                      <p className="line-clamp-2 text-xs font-bold leading-5 text-slate-400">
                        {scene.subtitle}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
                      <span className="rounded bg-blue-50 px-2 py-1 text-blue-600">
                        {getDifficultyLabel(scene.difficulty)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-slate-500">
                        <BookOpenText className="size-3.5" />
                        {sentenceCount} 句
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-slate-500">
                        <Volume2 className="size-3.5" />
                        已生成音频
                      </span>
                      <span className="rounded bg-slate-50 px-2 py-1 text-slate-500">
                        {chunkCount} 个表达
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" />
                        {scene.estimatedMinutes} Min
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-blue-600">
                    进入听读
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/70 p-5 text-sm leading-6 text-slate-500">
          <p className="inline-flex items-center gap-2 font-black text-slate-900">
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
