"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScenePack } from "./scene-display";

type StarterPathCarouselProps = {
  packs: ScenePack[];
  onOpenPackScene: (sceneSlug: string) => void;
};

export function StarterPathCarousel({
  packs,
  onOpenPackScene,
}: StarterPathCarouselProps) {
  if (packs.every((pack) => pack.totalCount === 0)) return null;

  return (
    <section className="-mt-3 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">推荐路径</h2>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-blue-600" />
          <span className="size-1.5 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="relative md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <div className="flex gap-4 overflow-x-auto pr-3 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-4 md:overflow-visible xl:grid-cols-4">
          {packs.map((pack, index) => {
            if (pack.totalCount === 0) return null;
            const isPrimary = pack.accent === "dark";
            const disabled = !pack.primaryScene;

            return (
              <article
                key={pack.id}
                className={`min-w-[82vw] snap-center rounded-[2.5rem] border p-7 transition md:min-w-0 ${
                  isPrimary
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
                    : "border-slate-100 bg-slate-50 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                }`}
              >
                <p className={`font-sans text-[10px] font-black uppercase tracking-widest ${isPrimary ? "text-blue-400" : "text-slate-400"}`}>
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className={`mt-2 font-sans text-2xl font-black ${isPrimary ? "text-white" : "text-slate-800"}`}>
                  {pack.title}
                </h2>
                <p className={`mt-1 font-sans text-xs ${isPrimary ? "text-slate-400 leading-relaxed" : "text-slate-500"}`}>
                  {pack.description}
                </p>

                <div className={`mt-8 flex items-center justify-between font-sans text-[10px] font-bold ${isPrimary ? "text-slate-400" : "text-slate-300"}`}>
                  <span>{pack.totalCount} 个场景</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className={`size-4 ${isPrimary ? "text-blue-300" : "text-blue-500"}`} />
                    已完成 {pack.completedCount} / {pack.totalCount}
                  </span>
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <p className={`min-w-0 font-sans text-[10px] font-bold ${isPrimary ? "text-slate-400" : "text-slate-300"}`}>
                    {pack.primaryScene ? `下一步：${pack.primaryScene.title}` : "完成上一组后再来这里。"}
                  </p>
                  <Button
                    type="button"
                    radius="lg"
                    disabled={disabled}
                    className={`h-11 shrink-0 gap-2 rounded-xl px-6 text-xs font-black transition active:scale-[0.98] active:opacity-90 ${
                      isPrimary
                        ? "bg-blue-600 text-white hover:bg-blue-600"
                        : "bg-slate-900 text-white hover:bg-slate-900"
                    }`}
                    onClick={() => {
                      if (pack.primaryScene) onOpenPackScene(pack.primaryScene.slug);
                    }}
                  >
                    {pack.completedCount >= pack.totalCount ? "再次学习" : "开始这一组"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
