import { Headphones, RotateCw, Sparkles } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_ICONS = [Headphones, Sparkles, RotateCw] as const;
const STEP_TITLES = ["场景输入", "表达沉淀", "回忆复习"] as const;

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
    <section className="grid grid-cols-3 gap-3">
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
              "rounded-[16px] border bg-white px-3 py-4 text-center transition active:scale-[0.98]",
              variant === "active" && "border-[#007AFF] bg-[#f0f7ff]",
              variant === "completed" && "border-[#bdecc9] bg-[#f0fff4]",
              variant === "inactive" && "border-transparent",
              isLocked && "cursor-not-allowed opacity-70",
            )}
            onClick={() => {
              if (isLocked) return;
              onOpenTask(task);
            }}
          >
            <Icon className="mx-auto mb-2 size-5 text-[#007AFF]" aria-hidden="true" />
            <span className="block text-[12px] font-semibold text-[#1d1d1f]">
              {STEP_TITLES[index] ?? task.title}
            </span>
          </button>
        );
      })}
    </section>
  );
}
