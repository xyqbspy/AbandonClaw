import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_SM,
  APPLE_CARD_INTERACTIVE,
  APPLE_BODY_TEXT,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";

export function TodayTaskList({
  tasks,
  onStartTask,
}: {
  tasks: DailyTask[];
  onStartTask?: (task: DailyTask) => void;
}) {
  const buttonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} h-8 px-3`;
  const buttonStrongClassName = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_SM} h-8 px-3`;
  const disabledButtonClassName = `${buttonClassName} cursor-not-allowed border-transparent bg-[var(--app-surface-hover)] text-[var(--muted-foreground)] shadow-none`;

  return (
    <Card className={APPLE_CARD_INTERACTIVE}>
      <CardHeader>
        <CardTitle className={APPLE_TITLE_MD}>{"\u4eca\u65e5\u4efb\u52a1"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between ${
              task.status === "up_next"
                ? "rounded-[var(--app-radius-panel)] border border-primary/20 bg-primary/[0.05] shadow-[var(--app-shadow-soft)]"
                : APPLE_PANEL
            }`}
          >
            <div className="space-y-1">
              <p className={`flex items-center gap-2 font-semibold ${APPLE_BODY_TEXT}`}>
                {task.done ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : task.status === "locked" ? (
                  <Lock className={`size-4 ${APPLE_META_TEXT}`} />
                ) : (
                  <Circle className={`size-4 ${APPLE_META_TEXT}`} />
                )}
                <span className={`inline-flex size-5 items-center justify-center rounded-full bg-[var(--app-surface)] text-[11px] ${APPLE_META_TEXT}`}>
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
                className={`inline-flex cursor-pointer items-center justify-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  task.done
                    ? buttonClassName
                    : task.status === "locked"
                      ? disabledButtonClassName
                      : buttonStrongClassName
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
                className={`inline-flex cursor-pointer items-center justify-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  task.done
                    ? buttonClassName
                    : task.status === "locked"
                      ? `${disabledButtonClassName} pointer-events-none`
                      : buttonStrongClassName
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
