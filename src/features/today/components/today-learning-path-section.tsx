import {
  TODAY_SECTION_CLASSNAME,
  TODAY_SECTION_EMOJI_CLASSNAME,
  TODAY_SECTION_TITLE_CLASSNAME,
  TODAY_TASK_STEP_ACTIVE_CLASSNAME,
  TODAY_TASK_STEP_BASE_CLASSNAME,
  TODAY_TASK_STEP_COMPLETED_CLASSNAME,
  TODAY_TASK_STEP_DESC_CLASSNAME,
  TODAY_TASK_STEP_ICON_CLASSNAME,
  TODAY_TASK_STEP_INACTIVE_CLASSNAME,
  TODAY_TASK_STEP_TITLE_CLASSNAME,
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
              className={`${TODAY_TASK_STEP_BASE_CLASSNAME} ${
                variant === "completed"
                  ? TODAY_TASK_STEP_COMPLETED_CLASSNAME
                  : variant === "active"
                    ? TODAY_TASK_STEP_ACTIVE_CLASSNAME
                    : TODAY_TASK_STEP_INACTIVE_CLASSNAME
              } ${isLocked ? "cursor-not-allowed opacity-80" : "active:scale-[0.98]"}`}
              onClick={() => {
                if (isLocked) return;
                onOpenTask(task);
              }}
            >
              <div className={TODAY_TASK_STEP_ICON_CLASSNAME}>
                <span className={TODAY_TASK_ICON_GLYPH_CLASSNAME}>
                  {variant === "completed" ? "✓" : STEP_ICONS[index] ?? "•"}
                </span>
              </div>
              <div className={TODAY_TASK_STEP_TITLE_CLASSNAME}>{task.title}</div>
              <div className={TODAY_TASK_STEP_DESC_CLASSNAME}>
                {getTaskStepDescription(task, index)}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
