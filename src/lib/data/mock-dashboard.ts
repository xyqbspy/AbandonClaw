import { DailyTask, ProgressSummary } from "@/lib/types";

export const dailyTasks: DailyTask[] = [
  {
    id: "task-1",
    title: "完成一节课程阅读",
    description: "继续当前课程，至少收藏 2 条短语。",
    durationMinutes: 12,
    done: false,
    actionHref: "/lesson/morning-routines",
  },
  {
    id: "task-2",
    title: "进行一次短时复习",
    description: "完成 8 条复习项，保持表达熟悉度。",
    durationMinutes: 8,
    done: false,
    actionHref: "/review",
  },
  {
    id: "task-3",
    title: "输出练习",
    description: "用新收藏短语写 1 句英文表达。",
    durationMinutes: 4,
    done: true,
    actionHref: "/chunks",
  },
];

export const progressSummary: ProgressSummary = {
  streakDays: 9,
  lessonsCompleted: 18,
  chunksSaved: 64,
  reviewAccuracy: 86,
  weeklyMinutes: [18, 22, 15, 27, 34, 20, 12],
  skillBreakdown: [
    { name: "语境词汇理解", value: 72 },
    { name: "句子节奏感", value: 58 },
    { name: "听辨信心", value: 44 },
    { name: "主动回忆", value: 63 },
  ],
};
