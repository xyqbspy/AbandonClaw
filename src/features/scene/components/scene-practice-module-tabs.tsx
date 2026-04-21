"use client";

import { Lock } from "lucide-react";
import type { PracticeMode } from "@/lib/types/learning-flow";
import { getPracticeModeLabel } from "@/lib/shared/scene-training-copy";
import type { derivePracticeModules } from "./scene-practice-selectors";

type PracticeModule = ReturnType<typeof derivePracticeModules>[number];

const moduleChipBaseClassName =
  "relative rounded-[12px] border-2 px-[var(--mobile-space-md)] py-[var(--mobile-space-md)] text-center text-[length:var(--mobile-font-body-sm)] font-bold transition-all duration-200";

export function ScenePracticeModuleTabs({
  activeMode,
  moduleCompletionMap,
  modules,
  onSelectMode,
  unlockedModes,
}: {
  activeMode: PracticeMode | null;
  moduleCompletionMap: Record<string, boolean>;
  modules: PracticeModule[];
  onSelectMode: (mode: PracticeMode) => void;
  unlockedModes: Set<PracticeMode>;
}) {
  if (modules.length <= 1) return null;

  return (
    <section className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-[var(--mobile-space-md)]">
        {modules.map((module) => {
          const unlocked = unlockedModes.has(module.mode);
          const done = moduleCompletionMap[module.mode];
          const active = activeMode === module.mode;
          return (
            <button
              key={module.mode}
              type="button"
              className={`${moduleChipBaseClassName} ${
                active
                  ? "border-[var(--app-scene-panel-accent)] bg-[var(--app-scene-panel-accent-soft)] text-[var(--app-scene-panel-accent)]"
                  : unlocked
                    ? "border-transparent bg-[var(--app-surface)] text-foreground shadow-[var(--app-shadow-soft)]"
                    : "border-transparent bg-[var(--app-surface-subtle)] text-[var(--muted-foreground)] opacity-60"
              } min-w-[clamp(112px,30vw,124px)] shrink-0`}
              disabled={!unlocked}
              onClick={() => onSelectMode(module.mode)}
            >
              {!unlocked ? (
                <Lock className="absolute right-1.5 top-1.5 size-3 text-[var(--muted-foreground)]" />
              ) : null}
              <span className="block">{getPracticeModeLabel(module.mode)}</span>
              <span className="mt-1 block text-[length:var(--mobile-font-caption)] font-medium opacity-80">
                {done ? "已完成" : unlocked ? "进行中" : "未解锁"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
