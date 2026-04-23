import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLE_CARD_INTERACTIVE,
  APPLE_META_TEXT,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";
import {
  TODAY_TASK_ACTION_BASE_CLASSNAME,
  TODAY_TASK_ACTION_DISABLED_CLASSNAME,
  TODAY_TASK_ACTION_STRONG_CLASSNAME,
  TODAY_TASK_ACTION_WRAPPER_CLASSNAME,
  TODAY_TASK_CONTENT_STACK_CLASSNAME,
  TODAY_TASK_DONE_ICON_CLASSNAME,
  TODAY_TASK_INDEX_BADGE_CLASSNAME,
  TODAY_TASK_META_ICON_CLASSNAME,
  TODAY_TASK_ROW_ACTIVE_CLASSNAME,
  TODAY_TASK_ROW_BASE_CLASSNAME,
  TODAY_TASK_ROW_DEFAULT_CLASSNAME,
  TODAY_TASK_TITLE_LINE_CLASSNAME,
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
            className={`${TODAY_TASK_ROW_BASE_CLASSNAME} ${
              task.status === "up_next"
                ? TODAY_TASK_ROW_ACTIVE_CLASSNAME
                : TODAY_TASK_ROW_DEFAULT_CLASSNAME
            }`}
          >
            <div className={TODAY_TASK_CONTENT_STACK_CLASSNAME}>
              <p className={TODAY_TASK_TITLE_LINE_CLASSNAME}>
                {task.done ? (
                  <CheckCircle2 className={TODAY_TASK_DONE_ICON_CLASSNAME} />
                ) : task.status === "locked" ? (
                  <Lock className={TODAY_TASK_META_ICON_CLASSNAME} />
                ) : (
                  <Circle className={TODAY_TASK_META_ICON_CLASSNAME} />
                )}
                <span className={TODAY_TASK_INDEX_BADGE_CLASSNAME}>
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
