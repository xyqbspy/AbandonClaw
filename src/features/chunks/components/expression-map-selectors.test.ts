import assert from "node:assert/strict";
import test from "node:test";
import { buildExpressionMapViewModel } from "./expression-map-selectors";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

const createPhrase = (
  overrides: Partial<UserPhraseItemResponse> = {},
): UserPhraseItemResponse => ({
  userPhraseId: overrides.userPhraseId ?? "phrase-1",
  phraseId: overrides.phraseId ?? "phrase-1",
  text: overrides.text ?? "burn yourself out",
  normalizedText: overrides.normalizedText ?? "burn yourself out",
  translation: overrides.translation ?? "把自己耗尽",
  usageNote: overrides.usageNote ?? null,
  difficulty: overrides.difficulty ?? null,
  tags: overrides.tags ?? [],
  sourceSceneSlug: overrides.sourceSceneSlug ?? null,
  sourceType: overrides.sourceType ?? "manual",
  sourceNote: overrides.sourceNote ?? null,
  sourceSentenceIndex: overrides.sourceSentenceIndex ?? null,
  sourceSentenceText: overrides.sourceSentenceText ?? null,
  sourceChunkText: overrides.sourceChunkText ?? null,
  expressionClusterId: overrides.expressionClusterId ?? null,
  expressionClusterRole: overrides.expressionClusterRole ?? null,
  expressionClusterMainUserPhraseId: overrides.expressionClusterMainUserPhraseId ?? null,
  aiEnrichmentStatus: overrides.aiEnrichmentStatus ?? null,
  semanticFocus: overrides.semanticFocus ?? null,
  typicalScenario: overrides.typicalScenario ?? null,
  exampleSentences: overrides.exampleSentences ?? [],
  aiEnrichmentError: overrides.aiEnrichmentError ?? null,
  learningItemType: overrides.learningItemType ?? "expression",
  savedAt: overrides.savedAt ?? "2026-03-21T00:00:00.000Z",
  lastSeenAt: overrides.lastSeenAt ?? "2026-03-21T00:00:00.000Z",
  reviewStatus: overrides.reviewStatus ?? "saved",
  reviewCount: overrides.reviewCount ?? 0,
  correctCount: overrides.correctCount ?? 0,
  incorrectCount: overrides.incorrectCount ?? 0,
  lastReviewedAt: overrides.lastReviewedAt ?? null,
  nextReviewAt: overrides.nextReviewAt ?? null,
  masteredAt: overrides.masteredAt ?? null,
});

test("buildExpressionMapViewModel 在无激活簇时回退到来源表达", () => {
  const sourceExpression = createPhrase({
    userPhraseId: "source-1",
    text: "call it a day",
    reviewStatus: "reviewing",
  });

  const viewModel = buildExpressionMapViewModel({
    mapData: null,
    activeClusterId: null,
    mapSourceExpression: sourceExpression,
    phrases: [sourceExpression],
  });

  assert.equal(viewModel.activeCluster, null);
  assert.equal(viewModel.centerExpressionText, "call it a day");
  assert.deepEqual(viewModel.displayedClusterExpressions, []);
  assert.equal(viewModel.expressionStatusByNormalized.get("call it a day"), "reviewing");
});

test("buildExpressionMapViewModel 会优先选择来源场景原始表达作为中心表达，并限制展示数量", () => {
  const sourceExpression = createPhrase({
    userPhraseId: "source-1",
    text: "burn yourself out",
    sourceSceneSlug: "scene-a",
  });
  const sourceScenePrimary = createPhrase({
    userPhraseId: "row-1",
    text: "push yourself too hard",
    normalizedText: "push yourself too hard",
    sourceSceneSlug: "scene-a",
    reviewStatus: "mastered",
    reviewCount: 4,
  });
  const fallbackRow = createPhrase({
    userPhraseId: "row-2",
    text: "burn out",
    normalizedText: "burn out",
    reviewStatus: "saved",
    reviewCount: 1,
  });
  const otherRows = [
    createPhrase({ userPhraseId: "row-3", text: "run yourself ragged", normalizedText: "run yourself ragged", reviewCount: 3 }),
    createPhrase({ userPhraseId: "row-4", text: "overwork yourself", normalizedText: "overwork yourself", reviewCount: 2 }),
    createPhrase({ userPhraseId: "row-5", text: "wear yourself out", normalizedText: "wear yourself out", reviewCount: 1 }),
    createPhrase({ userPhraseId: "row-6", text: "drive yourself too hard", normalizedText: "drive yourself too hard", reviewCount: 0 }),
    createPhrase({ userPhraseId: "row-7", text: "push too far", normalizedText: "push too far", reviewCount: 0 }),
    createPhrase({ userPhraseId: "row-8", text: "push beyond your limit", normalizedText: "push beyond your limit", reviewCount: 0 }),
    createPhrase({ userPhraseId: "row-9", text: "work nonstop", normalizedText: "work nonstop", reviewCount: 0 }),
  ];

  const mapData: ExpressionMapResponse = {
    version: "v1",
    sourceSceneId: "scene-a",
    clusters: [
      {
        id: "cluster-1",
        anchor: "burn yourself out",
        meaning: "过度透支自己",
        expressions: [
          "burn out",
          "push yourself too hard",
          "run yourself ragged",
          "overwork yourself",
          "wear yourself out",
          "drive yourself too hard",
          "push too far",
          "push beyond your limit",
          "work nonstop",
          "push yourself too hard",
        ],
        sourceSceneIds: ["scene-a"],
        nodes: [
          {
            id: "node-1",
            text: "push yourself too hard",
            sourceSceneId: "scene-a",
            sourceType: "original",
          },
          {
            id: "node-2",
            text: "burn out",
            sourceSceneId: "scene-b",
            sourceType: "original",
          },
        ],
      },
    ],
  };

  const viewModel = buildExpressionMapViewModel({
    mapData,
    activeClusterId: "cluster-1",
    mapSourceExpression: sourceExpression,
    phrases: [sourceExpression, sourceScenePrimary, fallbackRow, ...otherRows],
  });

  assert.equal(viewModel.activeCluster?.id, "cluster-1");
  assert.equal(viewModel.centerExpressionText, "push yourself too hard");
  assert.equal(viewModel.displayedClusterExpressions.length, 8);
  assert.deepEqual(viewModel.displayedClusterExpressions.slice(0, 2), [
    "push yourself too hard",
    "drive yourself too hard",
  ]);
  assert.ok(viewModel.displayedClusterExpressions.includes("push too far"));
  assert.ok(!viewModel.displayedClusterExpressions.includes("push yourself too hard "));
  assert.equal(viewModel.expressionStatusByNormalized.get("push yourself too hard"), "mastered");
});
