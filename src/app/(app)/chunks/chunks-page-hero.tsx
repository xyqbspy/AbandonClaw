"use client";

import { BookMarked, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { chunksPageMessages as zh } from "./chunks-page-messages";
import {
  CHUNKS_LIBRARY_TAB_ACTIVE_UNDERLINE_CLASSNAME,
  CHUNKS_LIBRARY_TAB_BUTTON_ACTIVE_TEXT_CLASSNAME,
  CHUNKS_LIBRARY_TAB_BUTTON_BASE_CLASSNAME,
  CHUNKS_LIBRARY_TAB_BUTTON_INACTIVE_TEXT_CLASSNAME,
} from "./chunks-page-styles";

type LibraryTabKey = "mine" | "builtin";

type ChunksPageHeroProps = {
  libraryTab: LibraryTabKey;
  onLibraryTabChange: (next: LibraryTabKey) => void;
  query: string;
  onQueryChange: (next: string) => void;
  summary: string;
  onOpenAddSheet: () => void;
};

// 拆自 chunks/page.tsx return 起始的 sticky header。
// DOM 输出保持字节级兼容（同样的 <header>/<div>/className/aria/placeholder），
// 避免 page.interaction.test selector 漂移。
export function ChunksPageHero({
  libraryTab,
  onLibraryTabChange,
  query,
  onQueryChange,
  summary,
  onOpenAddSheet,
}: ChunksPageHeroProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[760px] px-3 pt-3 pb-4 sm:pt-4 lg:px-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100">
            <BookMarked className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans text-lg font-black text-slate-900">{zh.heroTitle}</h1>
            <p className="text-[10px] font-bold text-slate-400">
              {libraryTab === "builtin"
                ? zh.builtinHeroSubtitle
                : `${zh.heroSubtitle} · ${summary}`}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
          <Input
            className="h-12 rounded-2xl border-0 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 shadow-none outline-none transition-all placeholder:text-slate-300 focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20"
            placeholder={`${zh.searchPlaceholder}...`}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="mt-6 flex items-center gap-8 px-2">
          {[
            { key: "mine" as const, label: zh.tabMine },
            { key: "builtin" as const, label: zh.tabBuiltin },
          ].map((tab) => {
            const active = libraryTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`${CHUNKS_LIBRARY_TAB_BUTTON_BASE_CLASSNAME} ${
                  active
                    ? CHUNKS_LIBRARY_TAB_BUTTON_ACTIVE_TEXT_CLASSNAME
                    : CHUNKS_LIBRARY_TAB_BUTTON_INACTIVE_TEXT_CLASSNAME
                }`}
                onClick={() => onLibraryTabChange(tab.key)}
              >
                {tab.label}
                {active ? (
                  <span className={CHUNKS_LIBRARY_TAB_ACTIVE_UNDERLINE_CLASSNAME} />
                ) : null}
              </button>
            );
          })}
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 cursor-pointer gap-1 rounded-xl px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={onOpenAddSheet}
          >
            <PlusCircle className="size-3.5" aria-hidden="true" />
            {zh.addLearningContent}
          </Button>
        </div>
      </div>
    </header>
  );
}
