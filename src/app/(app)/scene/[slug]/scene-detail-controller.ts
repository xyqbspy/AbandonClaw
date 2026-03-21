import { GeneratedSetStatus } from "@/lib/types/learning-flow";

export type SceneDetailToolIntent = "generate" | "open" | "ignore";

export const sceneDetailConfirmMessages = {
  deletePracticeSet: "确认删除当前练习吗？删除后将无法查看，需重新生成。",
  deleteVariantSet: "确认删除当前场景下全部变体吗？删除后变体1/2/3都会消失，需重新生成。",
  deleteVariantItem: "确认删除当前变体吗？删除后将无法恢复。",
} as const;

export const resolveSceneToolIntent = ({
  hasBaseLesson,
  loading,
  status,
}: {
  hasBaseLesson: boolean;
  loading: boolean;
  status: GeneratedSetStatus | "idle";
}): SceneDetailToolIntent => {
  if (!hasBaseLesson || loading) return "ignore";
  if (status === "idle") return "generate";
  return "open";
};

export const resolveVariantDeleteOutcome = ({
  activeVariantId,
  deletingVariantId,
}: {
  activeVariantId: string | null;
  deletingVariantId: string;
}) => ({
  shouldClearActiveVariant: activeVariantId === deletingVariantId,
  nextViewMode: activeVariantId === deletingVariantId ? "variants" as const : null,
});

export const shouldReuseExpressionMapCache = ({
  currentVariantSetId,
  cachedVariantSetId,
}: {
  currentVariantSetId: string | null;
  cachedVariantSetId: string | null;
}) => Boolean(currentVariantSetId && cachedVariantSetId === currentVariantSetId);
