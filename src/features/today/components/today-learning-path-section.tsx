import { Headphones, RotateCw, Sparkles } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_ICONS = [Headphones, Sparkles, RotateCw] as const;
const STEP_TITLES = ["场景输入", "表达沉淀", "回忆复习"] as const;
const STEP_ICON_STYLES = [
  "bg-indigo-50 text-indigo-500",
  "bg-emerald-50 text-emerald-500",
  "bg-rose-50 text-rose-500",
] as const;

const getTaskStepVariant = (task: DailyTask) => {
  if (task.done) return "completed";
  if (task.status === "up_next" || task.status === "available") return "active";
  return "inactive";
};

export function TodayLearningPathSection({
  tasks,
  onOpenTask,
}: {
  tasks: DailyTask[];
  primaryTaskTitle: string;
  primaryTaskReason: string;
  onOpenTask: (task: DailyTask) => void;
}) {
  return (
    <section className="grid grid-cols-3 gap-4">
      {tasks.slice(0, 3).map((task, index) => {
        const Icon = STEP_ICONS[index] ?? Sparkles;
        const variant = getTaskStepVariant(task);
        const isLocked = task.status === "locked";

        return (
          <button
            key={task.id}
            type="button"
            disabled={isLocked}
            className={cn(
              "rounded-[1.5rem] border border-slate-100 bg-white px-3 py-4 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.98]",
              variant === "active" && "border-indigo-100 bg-white",
              variant === "completed" && "border-emerald-100 bg-white",
              variant === "inactive" && "border-slate-100 bg-white",
              isLocked && "cursor-not-allowed opacity-70",
            )}
            onClick={() => {
              if (isLocked) return;
              onOpenTask(task);
            }}
          >
            <div
              className={cn(
                "mx-auto mb-3 flex size-10 items-center justify-center rounded-2xl",
                STEP_ICON_STYLES[index],
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <span className="block font-sans text-[12px] font-black tracking-[-0.01em] text-slate-600">
              {STEP_TITLES[index] ?? task.title}
            </span>
          </button>
        );
      })}
    </section>
  );
}
