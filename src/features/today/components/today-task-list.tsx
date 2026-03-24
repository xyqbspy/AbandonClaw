import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TodayTaskList({
  tasks,
  onStartTask,
}: {
  tasks: DailyTask[];
  onStartTask?: (task: DailyTask) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{"\u4eca\u65e5\u4efb\u52a1"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between ${
              task.status === "up_next" ? "border-primary/35 bg-primary/[0.03]" : ""
            }`}
          >
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {task.done ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : task.status === "locked" ? (
                  <Lock className="size-4 text-muted-foreground" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>
            {onStartTask ? (
              <button
                type="button"
                disabled={task.status === "locked"}
                onClick={() => onStartTask(task)}
                className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  task.done
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : task.status === "locked"
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
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
                className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  task.done
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : task.status === "locked"
                      ? "pointer-events-none bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
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
