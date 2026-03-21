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
    showAnswer: "Show Answer",
    hideAnswer: "Hide Answer",
  },
  variants: {
    back: "返回",
    complete: "完成学习",
    deleteSet: "删除变体",
    sourceScenePrefix: "来源场景：",
    variantsHint: "把这些核心表达迁移到相似语境里继续练习。",
    reusedChunksTitle: "核心表达",
    openMap: "查看表达地图",
    loadingMap: "生成中…",
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
