import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLE_CARD_INTERACTIVE,
  APPLE_BODY_TEXT,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";
import {
  TODAY_TASK_ACTION_BASE_CLASSNAME,
  TODAY_TASK_ACTION_DISABLED_CLASSNAME,
  TODAY_TASK_ACTION_STRONG_CLASSNAME,
  TODAY_TASK_ACTION_WRAPPER_CLASSNAME,
} from "@/features/today/components/today-page-styles";

export function TodayTaskList({
  tasks,
  onStartTask,
}: {
  tasks: DailyTask[];
  onStartTask?: (task: DailyTask) => void;
}) {
  return (
    <Card className={APPLE_CARD_INTERACTIVE}>
      <CardHeader>
        <CardTitle className={APPLE_TITLE_MD}>{"\u4eca\u65e5\u4efb\u52a1"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-[var(--mobile-space-md)]">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`flex flex-col gap-[var(--mobile-space-md)] p-[var(--mobile-space-md)] sm:flex-row sm:items-center sm:justify-between ${
              task.status === "up_next"
                ? "rounded-[var(--app-radius-panel)] border border-primary/20 bg-primary/[0.05] shadow-[var(--app-shadow-soft)]"
                : APPLE_PANEL
            }`}
          >
            <div className="space-y-[var(--mobile-space-2xs)]">
              <p className={`flex items-center gap-[var(--mobile-space-sm)] font-semibold ${APPLE_BODY_TEXT}`}>
                {task.done ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : task.status === "locked" ? (
                  <Lock className={`size-4 ${APPLE_META_TEXT}`} />
                ) : (
                  <Circle className={`size-4 ${APPLE_META_TEXT}`} />
                )}
                <span className={`inline-flex size-[clamp(18px,4.8vw,20px)] items-center justify-center rounded-full bg-[var(--app-surface)] text-[length:var(--mobile-font-caption)] ${APPLE_META_TEXT}`}>
                  {index + 1}
                </span>
                {task.title}
              </p>
              <p className={APPLE_META_TEXT}>{task.description}</p>
            </div>
            {onStartTask ? (
              <button
                type="button"
                disabled={task.status === "locked"}
                onClick={() => onStartTask(task)}
                className={`${TODAY_TASK_ACTION_WRAPPER_CLASSNAME} ${
                  task.done
                    ? TODAY_TASK_ACTION_BASE_CLASSNAME
                    : task.status === "locked"
                      ? TODAY_TASK_ACTION_DISABLED_CLASSNAME
                      : TODAY_TASK_ACTION_STRONG_CLASSNAME
                }`}
              >
                {task.actionLabel ??
                  (task.done
                    ? "\u5df2\u5b8c\u6210"
                    : `\u5f00\u59cb\uff08${task.durationMinutes} \u5206\u949f\uff09`)}
              </button>
            ) : (
              <Link
                href={task.actionHref}
                className={`${TODAY_TASK_ACTION_WRAPPER_CLASSNAME} ${
                  task.done
                    ? TODAY_TASK_ACTION_BASE_CLASSNAME
                    : task.status === "locked"
                      ? `${TODAY_TASK_ACTION_DISABLED_CLASSNAME} pointer-events-none`
                      : TODAY_TASK_ACTION_STRONG_CLASSNAME
                }`}
              >
                {task.actionLabel ??
                  (task.done
                    ? "\u5df2\u5b8c\u6210"
                    : `\u5f00\u59cb\uff08${task.durationMinutes} \u5206\u949f\uff09`)}
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
