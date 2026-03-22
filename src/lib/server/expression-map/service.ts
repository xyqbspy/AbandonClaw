import { ValidationError } from "@/lib/server/errors";
import {
  listExpressionMapClusterMembers,
  listExpressionMapMembershipsByPhraseIds,
  listSavedUserPhrasesForExpressionMap,
} from "@/lib/server/expression-map/repo";
import {
  ExpressionCluster,
  ExpressionMapGenerateRequest,
  ExpressionMapResponse,
  ExpressionNode,
} from "@/lib/types/expression-map";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeExpression = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ");

const normalizePhraseText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ");

const CLUSTER_HINTS: Array<{
  key: string;
  meaning: string;
  members: string[];
}> = [
  {
    key: "low-energy",
    meaning: "表示精力见底、非常疲惫",
    members: ["running on empty", "exhausted", "worn out", "drained"],
  },
  {
    key: "stop-for-today",
    meaning: "表示今天先收工、到此为止",
    members: ["call it a day", "wrap it up", "stop for today"],
  },
  {
    key: "survive-day",
    meaning: "表示先把这一天撑过去",
    members: ["get through the day", "make it through the day", "survive the day"],
  },
];

const clusterKeyByExpression = (normalizedExpression: string) => {
  for (const hint of CLUSTER_HINTS) {
    if (hint.members.some((item) => normalizeExpression(item) === normalizedExpression)) {
      return hint.key;
    }
  }
  return normalizedExpression;
};

const clusterMeaningByKey = (key: string) =>
  CLUSTER_HINTS.find((hint) => hint.key === key)?.meaning ?? "相关表达变体";

export function parseExpressionMapGenerateRequest(
  value: unknown,
): ExpressionMapGenerateRequest {
  if (!isObject(value)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  if (typeof value.sourceSceneId !== "string" || !value.sourceSceneId.trim()) {
    throw new ValidationError("sourceSceneId is required.");
  }

  if (!Array.isArray(value.baseExpressions)) {
    throw new ValidationError("baseExpressions must be an array.");
  }

  if (
    value.variantExpressionSources !== undefined &&
    !Array.isArray(value.variantExpressionSources)
  ) {
    throw new ValidationError("variantExpressionSources must be an array when provided.");
  }

  return value as unknown as ExpressionMapGenerateRequest;
}

function buildFallbackClusters(payload: ExpressionMapGenerateRequest): ExpressionCluster[] {
  const allNodes: ExpressionNode[] = [];
  const seenNode = new Set<string>();

  payload.baseExpressions.forEach((text, index) => {
    if (typeof text !== "string" || !text.trim()) return;
    const normalized = normalizeExpression(text);
    const nodeId = `${payload.sourceSceneId}:original:${normalized}`;
    if (seenNode.has(nodeId)) return;
    seenNode.add(nodeId);
    allNodes.push({
      id: `node-original-${index + 1}`,
      text: text.trim(),
      sourceSceneId: payload.sourceSceneId,
      sourceType: "original",
    });
  });

  payload.variantExpressionSources?.forEach((source, sourceIndex) => {
    if (!isObject(source) || typeof source.sourceSceneId !== "string") return;
    if (!Array.isArray(source.expressions)) return;

    source.expressions.forEach((text, expressionIndex) => {
      if (typeof text !== "string" || !text.trim()) return;
      const normalized = normalizeExpression(text);
      const nodeId = `${source.sourceSceneId}:variant:${normalized}`;
      if (seenNode.has(nodeId)) return;
      seenNode.add(nodeId);
      allNodes.push({
        id: `node-variant-${sourceIndex + 1}-${expressionIndex + 1}`,
        text: text.trim(),
        sourceSceneId: source.sourceSceneId,
        sourceType: "variant",
      });
    });
  });

  const clusterMap = new Map<string, ExpressionCluster>();
  for (const node of allNodes) {
    const normalized = normalizeExpression(node.text);
    const clusterKey = clusterKeyByExpression(normalized);
    const existing = clusterMap.get(clusterKey);
    if (!existing) {
      clusterMap.set(clusterKey, {
        id: `cluster-${clusterMap.size + 1}`,
        anchor: node.text,
        meaning: clusterMeaningByKey(clusterKey),
        expressions: [node.text],
        sourceSceneIds: [node.sourceSceneId],
        nodes: [node],
      });
      continue;
    }

    if (!existing.expressions.some((item) => normalizeExpression(item) === normalized)) {
      existing.expressions.push(node.text);
    }
    if (!existing.sourceSceneIds.includes(node.sourceSceneId)) {
      existing.sourceSceneIds.push(node.sourceSceneId);
    }
    existing.nodes.push(node);
  }

  return Array.from(clusterMap.values()).sort(
    (a, b) => b.expressions.length - a.expressions.length,
  );
}

async function buildRealUserClusters(params: {
  userId: string;
  payload: ExpressionMapGenerateRequest;
}) {
  const allTexts = Array.from(
    new Set([
      ...params.payload.baseExpressions,
      ...(params.payload.variantExpressionSources ?? []).flatMap((source) => source.expressions ?? []),
    ]),
  )
    .map((text) => text.trim())
    .filter(Boolean);
  if (allTexts.length === 0) return [] as ExpressionCluster[];

  const normalizedTexts = Array.from(
    new Set(allTexts.map((text) => normalizePhraseText(text)).filter(Boolean)),
  );
  const phraseRows = await listSavedUserPhrasesForExpressionMap(params.userId);
  const matchingPhraseRows = phraseRows.filter((row) => {
    const phrase = Array.isArray(row.phrase) ? (row.phrase[0] ?? null) : row.phrase;
    const normalized = normalizePhraseText(
      phrase?.normalized_text ?? phrase?.display_text ?? "",
    );
    return normalizedTexts.includes(normalized);
  });
  if (matchingPhraseRows.length === 0) return [] as ExpressionCluster[];

  const membershipRows = await listExpressionMapMembershipsByPhraseIds(
    matchingPhraseRows.map((row) => row.id),
  );
  const targetClusterIds = Array.from(
    new Set(
      membershipRows
        .map((row) => {
          const cluster = Array.isArray(row.cluster) ? (row.cluster[0] ?? null) : row.cluster;
          return cluster?.user_id === params.userId ? row.cluster_id : null;
        })
        .filter((item): item is string => Boolean(item)),
    ),
  );
  if (targetClusterIds.length === 0) return [] as ExpressionCluster[];

  const fullMembershipRows = await listExpressionMapClusterMembers(targetClusterIds);
  const clusterMap = new Map<string, ExpressionCluster>();

  for (const row of fullMembershipRows) {
    const cluster = Array.isArray(row.cluster) ? (row.cluster[0] ?? null) : row.cluster;
    const userPhrase = Array.isArray(row.user_phrase)
      ? (row.user_phrase[0] ?? null)
      : row.user_phrase;
    const phrase = userPhrase
      ? Array.isArray(userPhrase.phrase)
        ? (userPhrase.phrase[0] ?? null)
        : userPhrase.phrase
      : null;

    if (!cluster || cluster.user_id !== params.userId || !userPhrase) continue;
    const text = (phrase?.display_text ?? "").trim();
    if (!text) continue;

    const existing = clusterMap.get(cluster.id) ?? {
      id: cluster.id,
      anchor: text,
      meaning: cluster.semantic_focus?.trim() || cluster.title?.trim() || "相关表达变体",
      expressions: [] as string[],
      sourceSceneIds: [] as string[],
      nodes: [] as ExpressionNode[],
    };

    if (row.user_phrase_id === cluster.main_user_phrase_id) {
      existing.anchor = text;
    }
    if (!existing.expressions.some((item) => normalizePhraseText(item) === normalizePhraseText(text))) {
      existing.expressions.push(text);
    }
    if (userPhrase.source_scene_slug && !existing.sourceSceneIds.includes(userPhrase.source_scene_slug)) {
      existing.sourceSceneIds.push(userPhrase.source_scene_slug);
    }
    existing.nodes.push({
      id: row.user_phrase_id,
      text,
      sourceSceneId: userPhrase.source_scene_slug ?? params.payload.sourceSceneId,
      sourceType:
        row.user_phrase_id === cluster.main_user_phrase_id || row.role === "main"
          ? "original"
          : "variant",
    });
    clusterMap.set(cluster.id, existing);
  }

  return Array.from(clusterMap.values()).sort((a, b) => b.expressions.length - a.expressions.length);
}

export async function generateExpressionMap(params: {
  userId: string;
  payload: ExpressionMapGenerateRequest;
}): Promise<ExpressionMapResponse> {
  const realClusters = await buildRealUserClusters(params);
  const fallbackClusters = buildFallbackClusters(params.payload);
  const usedTextSet = new Set(
    realClusters.flatMap((cluster) => cluster.expressions.map((text) => normalizePhraseText(text))),
  );
  const clusters = [
    ...realClusters,
    ...fallbackClusters.filter((cluster) =>
      cluster.expressions.some((text) => !usedTextSet.has(normalizePhraseText(text))),
    ),
  ];

  return {
    version: "v1",
    sourceSceneId: params.payload.sourceSceneId,
    clusters,
  };
}
