import { NextResponse } from "next/server";
import {
  ExpressionFamily,
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

const FAMILY_HINTS: Array<{
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

const familyKeyByExpression = (normalizedExpression: string) => {
  for (const hint of FAMILY_HINTS) {
    if (hint.members.some((item) => normalizeExpression(item) === normalizedExpression)) {
      return hint.key;
    }
  }
  return normalizedExpression;
};

const familyMeaningByKey = (key: string) =>
  FAMILY_HINTS.find((hint) => hint.key === key)?.meaning ?? "相关表达变体";

const parsePayload = (
  value: unknown,
):
  | { ok: true; value: ExpressionMapGenerateRequest }
  | { ok: false; error: string } => {
  if (!isObject(value)) {
    return { ok: false, error: "Top-level payload must be an object." };
  }

  if (typeof value.sourceSceneId !== "string" || !value.sourceSceneId.trim()) {
    return { ok: false, error: "sourceSceneId is required." };
  }

  if (!Array.isArray(value.baseExpressions)) {
    return { ok: false, error: "baseExpressions must be an array." };
  }

  if (
    value.variantExpressionSources !== undefined &&
    !Array.isArray(value.variantExpressionSources)
  ) {
    return { ok: false, error: "variantExpressionSources must be an array when provided." };
  }

  return { ok: true, value: value as unknown as ExpressionMapGenerateRequest };
};

const buildFamilies = (payload: ExpressionMapGenerateRequest): ExpressionFamily[] => {
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

  const familyMap = new Map<string, ExpressionFamily>();
  for (const node of allNodes) {
    const normalized = normalizeExpression(node.text);
    const familyKey = familyKeyByExpression(normalized);
    const existing = familyMap.get(familyKey);
    if (!existing) {
      familyMap.set(familyKey, {
        id: `family-${familyMap.size + 1}`,
        anchor: node.text,
        meaning: familyMeaningByKey(familyKey),
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

  return Array.from(familyMap.values()).sort(
    (a, b) => b.expressions.length - a.expressions.length,
  );
};

export async function POST(request: Request) {
  try {
    const payloadRaw = (await request.json()) as unknown;
    const parsed = parsePayload(payloadRaw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const families = buildFamilies(parsed.value);
    const response: ExpressionMapResponse = {
      version: "v1",
      sourceSceneId: parsed.value.sourceSceneId,
      families,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate expression map.";
    return NextResponse.json(
      { error: `Expression map generate failed: ${message}` },
      { status: 500 },
    );
  }
}
