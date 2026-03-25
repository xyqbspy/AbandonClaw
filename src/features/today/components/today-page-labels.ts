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
  continueCurrentPrefix: string;
  continueHintTitle: string;
};

export const todayPageLabels: TodayPageLabels = {
  loadFail: "加载今日学习数据失败。",
  eyebrow: "今日学习",
  desc: "先完成一个场景输入，再带走表达，最后做一轮回忆。",
  statStreak: "连续学习",
  statSaved: "已保存表达",
  statAcc: "复习正确率",
  continueTitle: "继续这一轮",
  continueEmptyTitle: "从一个场景开始今天的输入",
  continueEmptyDesc: "你还没有进行中的场景，先选一个真实语境开始。",
  continueBtn: "继续推进",
  currentProgress: "当前进度",
  recTitle: "推荐下一组场景",
  sceneLoading: "场景加载中...",
  recEmpty: "暂时没有可推荐场景。",
  estimatedMinutes: "预计时间",
  minute: "分钟",
  taskSceneTitle: "先完成一个场景输入",
  taskSceneDesc: "进入一个真实语境，先听懂、看懂，再开始训练。",
  taskReviewTitle: "最后做一轮回忆",
  taskOutputTitle: "带走 1 到 2 条表达",
  userFallback: "学习者",
  day: "天",
  continueCurrentPrefix: "当前",
  continueHintTitle: "下一步",
};
