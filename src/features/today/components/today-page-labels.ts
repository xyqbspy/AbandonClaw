export type TodayPageLabels = {
  loadFail: string;
  eyebrow: string;
  desc: string;
  statStreak: string;
  statSaved: string;
  statAcc: string;
  continueTitle: string;
  continueEmptyTitle: string;
  continueEmptyDesc: string;
  continueBtn: string;
  currentProgress: string;
  recTitle: string;
  sceneLoading: string;
  recEmpty: string;
  estimatedMinutes: string;
  minute: string;
  taskSceneTitle: string;
  taskSceneDesc: string;
  taskReviewTitle: string;
  taskOutputTitle: string;
  userFallback: string;
  day: string;
};

export const todayPageLabels: TodayPageLabels = {
  loadFail: "加载今日学习数据失败。",
  eyebrow: "今日学习",
  desc: "保持短时、稳定的学习节奏，比一次性学习更容易沉淀表达。",
  statStreak: "连续学习",
  statSaved: "已保存表达",
  statAcc: "复习正确率",
  continueTitle: "继续学习",
  continueEmptyTitle: "选择一个场景开始学习",
  continueEmptyDesc: "你还没有学习记录，先进入一个场景吧。",
  continueBtn: "继续学习",
  currentProgress: "当前进度",
  recTitle: "推荐下一组场景",
  sceneLoading: "场景加载中...",
  recEmpty: "暂无可推荐场景。",
  estimatedMinutes: "预计时间",
  minute: "分钟",
  taskSceneTitle: "完成一个场景学习",
  taskSceneDesc: "选择一个场景开始学习，读完主场景后可直接完成。",
  taskReviewTitle: "进行一次短时复习",
  taskOutputTitle: "沉淀表达",
  userFallback: "学习者",
  day: "天",
};
