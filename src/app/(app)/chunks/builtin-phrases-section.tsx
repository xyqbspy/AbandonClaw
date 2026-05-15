"use client";

import Link from "next/link";
import { BookmarkCheck, BookmarkPlus, Link2 } from "lucide-react";
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
  { key: "all", label: "全部场景" },
  { key: "L0", label: "L0 入门" },
  { key: "L1", label: "L1 基础" },
  { key: "daily_life", label: "日常" },
  { key: "help", label: "请求帮助" },
  { key: "social", label: "社交" },
  { key: "scheduling", label: "时间安排" },
];

const getPhraseDescription = (phrase: BuiltinPhraseItemResponse) =>
  phrase.translation?.trim() ||
  phrase.usageNote?.trim() ||
  "先从这个高频表达开始，慢慢沉淀成你的长期资产。";

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
        <LoadingState
          text="必备表达加载中..."
          className="justify-center py-6 text-slate-400"
        />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="-mx-2 flex gap-2 overflow-x-auto px-2">
        {FILTERS.map((filter) => {
          const active = props.activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              className={`h-8 shrink-0 whitespace-nowrap rounded-full px-4 text-[10px] font-black transition ${active
                ? "bg-blue-600 text-white"
                : "border border-slate-100 bg-white text-slate-500"
                }`}
              onClick={() => props.onFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          );
        })}
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
                className={`rounded-[2rem] border border-slate-50 bg-white p-6 shadow-sm ${saved
                  ? "border-l-4 border-l-emerald-500 opacity-90"
                  : "border-l-4 border-l-blue-500"
                  }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-sans text-xl font-black text-slate-900">
                      {phrase.text}
                    </h3>
                    <p className="text-sm font-bold text-slate-500">
                      {getPhraseDescription(phrase)}
                    </p>
                  </div>
                  {saved ? (
                    <div className="rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-600">
                      已加入复习
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50">
                      {getPhraseLevelLabel(phrase.level)}
                    </span>
                    <span className="rounded px-2 py-1 text-[9px] font-black text-amber-600 bg-amber-50">
                      高频表达
                    </span>
                    <span className="rounded px-2 py-1 text-[9px] font-black text-slate-500 bg-slate-50">
                      {getPhraseCategoryLabel(phrase.category)}
                    </span>
                    {phrase.sourceScene ? (
                      <Link
                        href={`/scene/${phrase.sourceScene.slug}`}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-600"
                      >
                        <Link2 className="size-[8px]" aria-hidden="true" />
                        <span className="max-w-[120px] truncate">
                          来源: {phrase.sourceScene.title}
                        </span>
                      </Link>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    disabled={saved || saving}
                    className={`h-auto shrink-0 rounded-xl px-4 py-2 text-[10px] font-black ${saved
                      ? "bg-slate-100 text-slate-400 hover:bg-slate-100"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                      }`}
                    onClick={() => props.onSave(phrase)}
                  >
                    {saved ? (
                      <>
                        <BookmarkCheck className="mr-1.5 size-3.5" aria-hidden="true" />
                        已保存
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="mr-1.5 size-3.5" aria-hidden="true" />
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
