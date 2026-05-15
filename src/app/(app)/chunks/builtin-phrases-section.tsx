"use client";

import Link from "next/link";
import { BookmarkCheck, BookmarkPlus, Link2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import type { BuiltinPhraseItemResponse } from "@/lib/utils/phrases-api";
import {
  BuiltinPhraseFilterKey,
  getPhraseCategoryLabel,
  getPhraseLevelLabel,
} from "@/features/chunks/builtin-phrases";

const FILTERS: Array<{ key: BuiltinPhraseFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "L0", label: "L0 入门" },
  { key: "L1", label: "L1 基础" },
  { key: "daily_life", label: "日常" },
  { key: "help", label: "请求帮助" },
  { key: "social", label: "社交" },
  { key: "scheduling", label: "时间安排" },
];

export function BuiltinPhrasesSection(props: {
  loading: boolean;
  phrases: BuiltinPhraseItemResponse[];
  activeFilter: BuiltinPhraseFilterKey;
  onFilterChange: (nextFilter: BuiltinPhraseFilterKey) => void;
  onSave: (phrase: BuiltinPhraseItemResponse) => void;
  savingPhraseId: string | null;
  error?: string | null;
}) {
  if (props.loading) {
    return (
      <div className="rounded-[2rem] bg-white px-6 py-10 shadow-sm">
        <LoadingState text="必备表达加载中..." className="justify-center py-6 text-slate-400" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((filter) => {
          const active = props.activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              className={`h-9 shrink-0 rounded-full px-4 text-[11px] font-black transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "border border-slate-100 bg-white text-slate-500"
              }`}
              onClick={() => props.onFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-sans text-base font-black text-slate-900">值得长期掌握的高频表达</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              这些表达来自默认 starter 和 builtin scenes。只有你主动保存后，它们才会进入“我的表达”和复习闭环。
            </p>
          </div>
        </div>
      </div>

      {props.error ? (
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <EmptyState title="必备表达暂时不可用" description={props.error} />
        </div>
      ) : null}

      {!props.error && props.phrases.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <EmptyState
            title="暂时没有可推荐的必备表达"
            description="先去 Start Here 场景学习，或稍后再回来看看。"
          />
        </div>
      ) : null}

      {!props.error && props.phrases.length > 0 ? (
        <div className="space-y-4">
          {props.phrases.map((phrase) => {
            const saving = props.savingPhraseId === phrase.id;
            const saved = phrase.isSaved;
            return (
              <article
                key={phrase.id}
                className={`rounded-[2rem] border bg-white p-6 shadow-sm transition ${
                  saved
                    ? "border-emerald-100 border-l-4 border-l-emerald-500"
                    : "border-slate-50 border-l-4 border-l-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <h3 className="font-sans text-xl font-black leading-8 text-slate-900">
                      {phrase.text}
                    </h3>
                    <p className="text-sm font-bold leading-6 text-slate-500">
                      {phrase.translation ?? phrase.usageNote ?? "先从这个表达开始建立长期资产。"}
                    </p>
                  </div>
                  {saved ? (
                    <div className="rounded-xl bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">
                      已加入复习
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
                    {getPhraseLevelLabel(phrase.level)}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-600">
                    {getPhraseCategoryLabel(phrase.category)}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-600">
                    高频表达
                  </span>
                  {phrase.sourceScene ? (
                    <Link
                      href={`/scene/${phrase.sourceScene.slug}`}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 hover:text-blue-600"
                    >
                      <Link2 className="size-3" aria-hidden="true" />
                      来自 {phrase.sourceScene.title}
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium leading-6 text-slate-500">
                    {phrase.usageNote ?? "保存后会进入“我的表达”、Review 和 Today 复习闭环。"}
                  </p>
                  <Button
                    type="button"
                    disabled={saved || saving}
                    className={`h-11 min-w-[152px] rounded-2xl px-5 text-sm font-black ${
                      saved
                        ? "bg-slate-100 text-slate-400 hover:bg-slate-100"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                    }`}
                    onClick={() => props.onSave(phrase)}
                  >
                    {saved ? (
                      <>
                        <BookmarkCheck className="mr-2 size-4" aria-hidden="true" />
                        已保存
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="mr-2 size-4" aria-hidden="true" />
                        {saving ? "保存中..." : "保存到我的表达"}
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
