"use client";

import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  Ellipsis,
  FileInput,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CATEGORY_FILTER_OPTIONS,
  LEVEL_FILTER_OPTIONS,
  SceneCategoryFilter,
  SceneLevelFilter,
  SceneSortOption,
  SceneSourceFilter,
  SORT_OPTIONS,
  SOURCE_FILTER_OPTIONS,
} from "./scene-display";

type SceneFilterBarProps = {
  category: SceneCategoryFilter;
  level: SceneLevelFilter;
  source: SceneSourceFilter;
  sort: SceneSortOption;
  onCategoryChange: (value: SceneCategoryFilter) => void;
  onLevelChange: (value: SceneLevelFilter) => void;
  onSourceChange: (value: SceneSourceFilter) => void;
  onSortChange: (value: SceneSortOption) => void;
  onOpenGenerate: () => void;
  onOpenImport: () => void;
};

const filterTriggerClassName =
  "flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 text-[10px] font-black text-slate-600 transition active:scale-[0.97]";
const menuItemClassName = "rounded-xl px-3 py-2.5 text-sm font-semibold";

export function SceneFilterBar({
  category,
  level,
  source,
  sort,
  onCategoryChange,
  onLevelChange,
  onSourceChange,
  onSortChange,
  onOpenGenerate,
  onOpenImport,
}: SceneFilterBarProps) {
  const selectedLevel = LEVEL_FILTER_OPTIONS.find((option) => option.value === level) ?? LEVEL_FILTER_OPTIONS[0];
  const selectedSource =
    SOURCE_FILTER_OPTIONS.find((option) => option.value === source) ?? SOURCE_FILTER_OPTIONS[0];
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0];
  const selectedCategory =
    CATEGORY_FILTER_OPTIONS.find((option) => option.value === category) ?? CATEGORY_FILTER_OPTIONS[0];

  return (
    <div className="flex items-center gap-2 font-sans">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterMenu
          label={selectedCategory.label}
          options={CATEGORY_FILTER_OPTIONS}
          selected={category}
          onSelect={onCategoryChange}
        />
        <FilterMenu
          label={selectedLevel.label}
          options={LEVEL_FILTER_OPTIONS}
          selected={level}
          onSelect={onLevelChange}
        />
        <FilterMenu
          label={selectedSource.label}
          options={SOURCE_FILTER_OPTIONS}
          selected={source}
          onSelect={onSourceChange}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="排序方式"
            className={filterTriggerClassName}
          >
            <ArrowDownWideNarrow className="size-3.5 text-blue-500" />
            <span>{selectedSort.label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className={menuItemClassName}
                onClick={() => onSortChange(option.value)}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.value === sort ? <Check className="size-4 text-blue-500" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="更多操作"
            className="flex size-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 transition active:scale-[0.97]"
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
            <DropdownMenuItem className={menuItemClassName} onClick={onOpenGenerate}>
              <Sparkles className="size-4 text-blue-500" />
              生成场景
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClassName} onClick={onOpenImport}>
              <FileInput className="size-4 text-slate-500" />
              导入自定义
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FilterMenu<TValue extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ value: TValue; label: string }>;
  selected: TValue;
  onSelect: (value: TValue) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={filterTriggerClassName}>
        <span>{label}</span>
        <ChevronDown className="size-3 text-slate-300" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={menuItemClassName}
            onClick={() => onSelect(option.value)}
          >
            <span className="min-w-0 flex-1">{option.label}</span>
            {option.value === selected ? <Check className="size-4 text-blue-500" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
