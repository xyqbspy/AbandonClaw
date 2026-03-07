import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { DailyTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TodayTaskList({ tasks }: { tasks: DailyTask[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>今日任务</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {task.done ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>
            <Link
              href={task.actionHref}
              className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                task.done
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {task.done ? "已完成" : `开始（${task.durationMinutes} 分钟）`}
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
