import {
  TODAY_SECTION_CLASSNAME,
  TODAY_SECTION_EMOJI_CLASSNAME,
  TODAY_SECTION_TITLE_CLASSNAME,
  TODAY_TASK_ICON_GLYPH_CLASSNAME,
} from "@/features/today/components/today-page-styles";
import { DailyTask } from "@/lib/types";

const STEP_ICONS = ["🎧", "✨", "🧠"] as const;
const STEP_FALLBACK_DESCS = ["开始练习", "带走表达", "主动提取"] as const;

const getTaskStepVariant = (task: DailyTask) => {
  if (task.done) return "completed";
  if (task.status === "up_next" || task.status === "available") return "active";
  return "inactive";
};

const getTaskStepDescription = (task: DailyTask, index: number) => {
  if (task.shortReason) return task.shortReason;
  if (task.done) return "已完成";
  if (task.status === "locked") return index === 0 ? STEP_FALLBACK_DESCS[index] : "等待解锁";
  return task.actionLabel?.replace(/^继续：/, "") ?? STEP_FALLBACK_DESCS[index];
};

export function TodayLearningPathSection({
  tasks,
  primaryTaskTitle,
  primaryTaskReason,
  onOpenTask,
}: {
  tasks: DailyTask[];
  primaryTaskTitle: string;
  primaryTaskReason: string;
  onOpenTask: (task: DailyTask) => void;
}) {
  return (
    <section className={TODAY_SECTION_CLASSNAME}>
      <div className={`mb-[var(--mobile-space-lg)] ${TODAY_SECTION_TITLE_CLASSNAME} text-[#334155]`}>
        <span className={TODAY_SECTION_EMOJI_CLASSNAME}>🪄</span>
        <span>今日学习路径</span>
      </div>
      <div className="mb-[var(--mobile-space-md)] rounded-[var(--app-radius-card)] border border-[#DBEAFE] bg-[#F8FBFF] px-[var(--mobile-space-md)] py-[var(--mobile-space-sm)] text-left">
        <div className="text-[length:var(--mobile-font-body-sm)] font-semibold text-[#1E3A8A]">
          {primaryTaskTitle}
        </div>
        <div className="mt-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] leading-[1.45] text-[#5B6B85]">
          {primaryTaskReason}
        </div>
      </div>
      <div className="flex gap-[var(--mobile-space-sm)]">
        {tasks.map((task, index) => {
          const variant = getTaskStepVariant(task);
          const isLocked = task.status === "locked";
          return (
            <button
              key={task.id}
              type="button"
              disabled={isLocked}
              className={`flex-1 rounded-[var(--app-radius-card)] border px-[var(--mobile-space-sm)] py-[var(--mobile-space-md)] text-center transition ${
                variant === "completed"
                  ? "border-[#A3E9B0] bg-[#E6F7EC]"
                  : variant === "active"
                    ? "border-[#3B82F6] bg-[#EFF6FF] shadow-[0_2px_6px_rgba(59,130,246,0.1)]"
                    : "border-[#EDF2F7] bg-[#F8FAFE]"
              } ${isLocked ? "cursor-not-allowed opacity-80" : "active:scale-[0.98]"}`}
              onClick={() => {
                if (isLocked) return;
                onOpenTask(task);
              }}
            >
              <div className="mx-auto mb-[var(--mobile-space-sm)] flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/80 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)] aspect-square">
                <span className={TODAY_TASK_ICON_GLYPH_CLASSNAME}>
                  {variant === "completed" ? "✓" : STEP_ICONS[index] ?? "•"}
                </span>
              </div>
              <div className="text-[length:var(--mobile-font-body-sm)] font-semibold leading-[1.2] tracking-[-0.01em] text-[#1F2A44]">
                {task.title}
              </div>
              <div className="mt-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] leading-[1.35] text-[#6C7A91]">
                {getTaskStepDescription(task, index)}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
