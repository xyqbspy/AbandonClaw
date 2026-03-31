import { ManualExpressionAssistResponse, SimilarExpressionCandidateResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";

export const CHUNKS_SOURCE_NOTES = {
  manualSimilarAi: "manual-similar-ai",
  manualContrastAi: "manual-contrast-ai",
  focusSimilarAi: "focus-similar-ai",
  focusContrastAi: "focus-contrast-ai",
  quickAddSimilar: "manual-similar-direct",
  quickAddContrast: "manual-contrast-direct",
  generatedSimilar: "similar-ai-mvp",
} as const;

const toOptional = (value: string | null | undefined) => value ?? undefined;

export const buildManualBaseExpressionSavePayload = ({
  assist,
  createClusterForSimilar,
  baseKey,
}: {
  assist: ManualExpressionAssistResponse;
  createClusterForSimilar: boolean;
  baseKey: string;
}) => ({
  text: assist.inputItem.text,
  learningItemType: "expression" as const,
  translation: toOptional(assist.inputItem.translation),
  usageNote: toOptional(assist.inputItem.usageNote),
  expressionClusterId: createClusterForSimilar ? `create-cluster:${baseKey}` : undefined,
  sourceType: "manual" as const,
  sourceSentenceText: toOptional(assist.inputItem.examples[0]?.en),
  sourceChunkText: assist.inputItem.text,
});

export const buildManualAssistCandidatePayload = ({
  assist,
  candidate,
  kind,
  expressionClusterId,
  relationSourceUserPhraseId,
}: {
  assist: ManualExpressionAssistResponse;
  candidate: SimilarExpressionCandidateResponse;
  kind: "similar" | "contrast";
  expressionClusterId?: string;
  relationSourceUserPhraseId?: string;
}) => ({
  text: candidate.text,
  sourceType: "manual" as const,
  sourceNote:
    kind === "similar"
      ? CHUNKS_SOURCE_NOTES.manualSimilarAi
      : CHUNKS_SOURCE_NOTES.manualContrastAi,
  sourceSentenceText: toOptional(assist.inputItem.examples[0]?.en),
  sourceChunkText: candidate.text,
  expressionClusterId: kind === "similar" ? expressionClusterId : undefined,
  relationSourceUserPhraseId,
  relationType: relationSourceUserPhraseId ? kind : undefined,
});

export const buildFocusAssistCandidatePayload = ({
  focusItem,
  candidate,
  kind,
}: {
  focusItem: UserPhraseItemResponse;
  candidate: SimilarExpressionCandidateResponse;
  kind: "similar" | "contrast";
}) => ({
  text: candidate.text,
  learningItemType: "expression" as const,
  sourceType: "manual" as const,
  sourceNote:
    kind === "similar"
      ? CHUNKS_SOURCE_NOTES.focusSimilarAi
      : CHUNKS_SOURCE_NOTES.focusContrastAi,
  sourceSentenceText: toOptional(focusItem.sourceSentenceText),
  sourceChunkText: candidate.text,
  expressionClusterId: kind === "similar" ? toOptional(focusItem.expressionClusterId) : undefined,
  relationSourceUserPhraseId: focusItem.userPhraseId,
  relationType: kind,
});

export const buildGeneratedSimilarBasePayload = ({
  seedExpression,
}: {
  seedExpression: UserPhraseItemResponse;
}) => ({
  text: seedExpression.text,
  expressionClusterId:
    seedExpression.expressionClusterId ?? `create-cluster:${seedExpression.userPhraseId}`,
  sourceType: seedExpression.sourceType,
  sourceSceneSlug: toOptional(seedExpression.sourceSceneSlug),
  sourceSentenceText: toOptional(seedExpression.sourceSentenceText),
  sourceChunkText: seedExpression.text,
  translation: toOptional(seedExpression.translation),
});

export const buildGeneratedSimilarCandidatePayload = ({
  candidate,
  seedExpression,
  clusterId,
}: {
  candidate: SimilarExpressionCandidateResponse;
  seedExpression: UserPhraseItemResponse;
  clusterId: string;
}) => ({
  text: candidate.text,
  expressionClusterId: clusterId,
  sourceType: "manual" as const,
  sourceNote: CHUNKS_SOURCE_NOTES.generatedSimilar,
  sourceSentenceText: toOptional(seedExpression.sourceSentenceText),
  sourceChunkText: candidate.text,
  relationSourceUserPhraseId: seedExpression.userPhraseId,
  relationType: "similar" as const,
});

export const buildQuickAddRelatedPayload = ({
  focusExpression,
  text,
  kind,
}: {
  focusExpression: UserPhraseItemResponse;
  text: string;
  kind: "similar" | "contrast";
}) => ({
  text,
  learningItemType: "expression" as const,
  sourceType: "manual" as const,
  sourceNote:
    kind === "similar"
      ? CHUNKS_SOURCE_NOTES.quickAddSimilar
      : CHUNKS_SOURCE_NOTES.quickAddContrast,
  sourceSentenceText: toOptional(focusExpression.sourceSentenceText),
  sourceChunkText: text,
  relationSourceUserPhraseId: focusExpression.userPhraseId,
  relationType: kind,
});
