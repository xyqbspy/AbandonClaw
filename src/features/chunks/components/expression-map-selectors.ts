import { normalizePhraseText } from "@/lib/shared/phrases";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";
import { PhraseReviewStatus, UserPhraseItemResponse } from "@/lib/utils/phrases-api";

type BuildExpressionMapViewModelParams = {
  mapData: ExpressionMapResponse | null;
  activeClusterId: string | null;
  mapSourceExpression: UserPhraseItemResponse | null;
  phrases: UserPhraseItemResponse[];
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

const overlapScore = (a: string, b: string) => {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let same = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) same += 1;
  }
  return same / Math.max(aTokens.size, bTokens.size);
};

const getActiveCluster = (
  mapData: ExpressionMapResponse | null,
  activeClusterId: string | null,
): ExpressionCluster | null => {
  if (!mapData || !activeClusterId) return null;
  return mapData.clusters.find((cluster) => cluster.id === activeClusterId) ?? null;
};

const buildExpressionStatusByNormalized = (phrases: UserPhraseItemResponse[]) => {
  const map = new Map<string, PhraseReviewStatus>();
  for (const row of phrases) {
    map.set(normalizePhraseText(row.text), row.reviewStatus);
  }
  return map;
};

const buildPhraseByNormalized = (phrases: UserPhraseItemResponse[]) => {
  const map = new Map<string, UserPhraseItemResponse>();
  for (const row of phrases) {
    map.set(normalizePhraseText(row.text), row);
  }
  return map;
};

const resolveCenterExpressionText = ({
  activeCluster,
  mapSourceExpression,
  mapSourceSceneId,
  phraseByNormalized,
}: {
  activeCluster: ExpressionCluster | null;
  mapSourceExpression: UserPhraseItemResponse | null;
  mapSourceSceneId: string | null;
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
}) => {
  if (!activeCluster) return mapSourceExpression?.text ?? "";

  const candidates = Array.from(
    new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
  );
  if (candidates.length === 0) return mapSourceExpression?.text ?? activeCluster.anchor;

  const scored = candidates.map((text) => {
    const normalized = normalizePhraseText(text);
    const userRow = phraseByNormalized.get(normalized) ?? null;
    const nodes = activeCluster.nodes.filter(
      (node) => normalizePhraseText(node.text) === normalized,
    );
    let score = 0;
    if (
      nodes.some(
        (node) => node.sourceType === "original" && node.sourceSceneId === mapSourceSceneId,
      )
    ) {
      score += 600;
    }
    if (userRow) {
      score += 260;
      score += Math.min(80, userRow.reviewCount * 10);
    }
    if (userRow?.sourceSceneSlug && mapSourceExpression?.sourceSceneSlug) {
      if (userRow.sourceSceneSlug === mapSourceExpression.sourceSceneSlug) score += 80;
    }
    const tokenCount = Math.max(1, tokenize(text).length);
    score += Math.max(0, 40 - tokenCount * 6);
    score += Math.max(0, 40 - text.length);
    return { text, normalized, score };
  });

  scored.sort((a, b) => b.score - a.score || a.normalized.localeCompare(b.normalized));
  return scored[0]?.text ?? mapSourceExpression?.text ?? activeCluster.anchor;
};

const resolveDisplayedClusterExpressions = ({
  activeCluster,
  centerExpressionText,
  mapSourceSceneId,
  phraseByNormalized,
}: {
  activeCluster: ExpressionCluster | null;
  centerExpressionText: string;
  mapSourceSceneId: string | null;
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
}) => {
  if (!activeCluster) return [] as string[];

  const center = centerExpressionText || activeCluster.anchor;
  const uniqueExpressions = Array.from(
    new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
  );

  const scored = uniqueExpressions.map((text) => {
    const normalized = normalizePhraseText(text);
    const row = phraseByNormalized.get(normalized) ?? null;
    const nodes = activeCluster.nodes.filter(
      (node) => normalizePhraseText(node.text) === normalized,
    );
    let score = 0;
    if (normalized === normalizePhraseText(center)) score += 1000;
    score += overlapScore(center, text) * 120;
    if (row) score += 100;
    if (row?.reviewCount) score += Math.min(20, row.reviewCount);
    if (
      nodes.some(
        (node) => node.sourceType === "original" && node.sourceSceneId === mapSourceSceneId,
      )
    ) {
      score += 50;
    }
    score += Math.max(0, 18 - Math.abs(text.length - center.length));
    return { text, normalized, score };
  });

  scored.sort((a, b) => b.score - a.score || a.normalized.localeCompare(b.normalized));
  return scored.slice(0, 8).map((item) => item.text);
};

export const buildExpressionMapViewModel = ({
  mapData,
  activeClusterId,
  mapSourceExpression,
  phrases,
}: BuildExpressionMapViewModelParams) => {
  const activeCluster = getActiveCluster(mapData, activeClusterId);
  const expressionStatusByNormalized = buildExpressionStatusByNormalized(phrases);
  const phraseByNormalized = buildPhraseByNormalized(phrases);
  const mapSourceSceneId = mapData?.sourceSceneId ?? null;

  const centerExpressionText = resolveCenterExpressionText({
    activeCluster,
    mapSourceExpression,
    mapSourceSceneId,
    phraseByNormalized,
  });

  const displayedClusterExpressions = resolveDisplayedClusterExpressions({
    activeCluster,
    centerExpressionText,
    mapSourceSceneId,
    phraseByNormalized,
  });

  return {
    activeCluster,
    expressionStatusByNormalized,
    centerExpressionText,
    displayedClusterExpressions,
  };
};
