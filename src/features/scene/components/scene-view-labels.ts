export type ScenePracticeViewLabels = {
  back: string;
  delete: string;
  complete: string;
  basedOnVariantPrefix: string;
  basedOnScenePrefix: string;
  practiceHint: string;
  empty: string;
  chunkPrefix: string;
  showAnswer: string;
  hideAnswer: string;
  inputPlaceholder: string;
  checkAnswer: string;
  resetAnswer: string;
  correct: string;
  incorrect: string;
  clozePrompt: string;
  answerLabel: string;
  progressLabel: string;
  totalAttemptsLabel: string;
  totalIncorrectLabel: string;
  readyToComplete: string;
  completeAllTypingFirst: string;
  currentQuestionLabel: string;
  currentAttemptsLabel: string;
  currentIncorrectLabel: string;
  currentCompletedLabel: string;
  summaryTitle: string;
  summaryCompleted: string;
  summaryAttempts: string;
  summaryIncorrect: string;
  summaryMistakeChunks: string;
  summaryNoMistakes: string;
  summaryReviewHint: string;
  summaryVariantHint: string;
  summaryReviewAction: string;
  summaryVariantAction: string;
  prevQuestion: string;
  nextQuestion: string;
  finishQuestionSet: string;
};

export type SceneVariantsViewLabels = {
  back: string;
  complete: string;
  deleteSet: string;
  sourceScenePrefix: string;
  variantsHint: string;
  reusedChunksTitle: string;
  openMap: string;
  loadingMap: string;
  empty: string;
  statusPrefix: string;
  open: string;
  delete: string;
};

export type SceneExpressionMapViewLabels = {
  back: string;
  description: string;
  empty: string;
  sourceSceneCountPrefix: string;
};

export type SceneViewLabels = {
  practice: ScenePracticeViewLabels;
  variants: SceneVariantsViewLabels;
  expressionMap: SceneExpressionMapViewLabels;
};

export const sceneViewLabels: SceneViewLabels = {
  practice: {
    back: "返回原场景",
    delete: "删除当前练习",
    complete: "标记为已完成",
    basedOnVariantPrefix: "当前练习基于：",
    basedOnScenePrefix: "来源场景：",
    practiceHint: "这组练习基于当前场景生成，用来帮助你回忆、填空和改写核心表达。",
    empty: "还没有可查看的练习集。",
    chunkPrefix: "chunk:",
    showAnswer: "显示答案",
    hideAnswer: "隐藏答案",
    inputPlaceholder: "输入你认为正确的表达",
    checkAnswer: "检查答案",
    resetAnswer: "重做",
    correct: "回答正确",
    incorrect: "还不对，再试一次",
    clozePrompt: "把空缺的表达补完整",
    answerLabel: "参考答案",
    progressLabel: "答题进度",
    totalAttemptsLabel: "已提交次数",
    totalIncorrectLabel: "错误次数",
    readyToComplete: "已完成当前练习作答，可以标记完成。",
    completeAllTypingFirst: "请先完成并答对当前练习。",
    currentQuestionLabel: "当前题目",
    currentAttemptsLabel: "当前题已尝试",
    currentIncorrectLabel: "当前题错误",
    currentCompletedLabel: "当前题已答对",
    summaryTitle: "练习总结",
    summaryCompleted: "答对题数",
    summaryAttempts: "总提交次数",
    summaryIncorrect: "总错误次数",
    summaryMistakeChunks: "本轮出错的表达",
    summaryNoMistakes: "本轮没有错题，做得很好。",
    summaryReviewHint: "建议先回看这些表达对应的场景句子，再做一轮练习。",
    summaryVariantHint: "这一轮已经比较稳了，可以继续去做变体训练。",
    summaryReviewAction: "回到场景复习",
    summaryVariantAction: "进入变体训练",
    prevQuestion: "上一题",
    nextQuestion: "下一题",
    finishQuestionSet: "当前题组已完成",
  },
  variants: {
    back: "返回",
    complete: "完成学习",
    deleteSet: "删除变体",
    sourceScenePrefix: "来源场景：",
    variantsHint: "把这些核心表达迁移到相似语境里继续练习。",
    reusedChunksTitle: "核心表达",
    openMap: "查看表达地图",
    loadingMap: "生成中",
    empty: "还没有可查看的变体集。",
    statusPrefix: "状态：",
    open: "打开",
    delete: "删除",
  },
  expressionMap: {
    back: "返回变体页",
    description: "表达簇会把当前场景与变体中的相关说法归在一起，帮助你快速看到同一意思的不同表达。",
    empty: "暂无表达簇。先生成变体后再查看表达地图。",
    sourceSceneCountPrefix: "出现场景数：",
  },
};
