import assert from "node:assert/strict";
import test from "node:test";

import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

import { buildSavedFocusDetailState } from "./chunks-page-logic";

const createPhrase = (
  overrides: Partial<UserPhraseItemResponse> = {},
): UserPhraseItemResponse => ({
  userPhraseId: overrides.userPhraseId ?? "phrase-1",
  phraseId: overrides.phraseId ?? "phrase-1",
  text: overrides.text ?? "call it a day",
  normalizedText: overrides.normalizedText ?? "call it a day",
  translation: overrides.translation ?? "今天先到这里",
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

test("buildSavedFocusDetailState 会在命中已保存表达后切到已保存态", () => {
  const savedSimilar = createPhrase({
    userPhraseId: "saved-1",
    text: "survive the day",
    normalizedText: "survive the day",
  });
  const savedContrast = createPhrase({
    userPhraseId: "saved-2",
    text: "pace yourself",
    normalizedText: "pace yourself",
  });

  assert.equal(
    buildSavedFocusDetailState({
      focusDetail: null,
      matchedSavedItem: savedSimilar,
    }),
    null,
  );

  assert.deepEqual(
    buildSavedFocusDetailState({
      focusDetail: {
        text: "survive the day",
        differenceLabel: "更强调熬过去",
        kind: "suggested-similar",
        savedItem: null,
        assistItem: null,
      },
      matchedSavedItem: savedSimilar,
    }),
    {
      text: "survive the day",
      differenceLabel: "更强调熬过去",
      kind: "library-similar",
      savedItem: savedSimilar,
      assistItem: null,
    },
  );

  assert.deepEqual(
    buildSavedFocusDetailState({
      focusDetail: {
        text: "pace yourself",
        differenceLabel: "更强调控制节奏",
        kind: "contrast",
        savedItem: null,
        assistItem: null,
      },
      matchedSavedItem: savedContrast,
    }),
    {
      text: "pace yourself",
      differenceLabel: "更强调控制节奏",
      kind: "contrast",
      savedItem: savedContrast,
      assistItem: null,
    },
  );
});
test("buildSavedFocusDetailState updates saved detail fields after enrichment refresh", () => {
  const staleSaved = createPhrase({
    userPhraseId: "saved-3",
    text: "get through the day",
    normalizedText: "get through the day",
    translation: null,
    usageNote: null,
    aiEnrichmentStatus: "pending",
    exampleSentences: [],
  });
  const refreshedSaved = createPhrase({
    userPhraseId: "saved-3",
    text: "get through the day",
    normalizedText: "get through the day",
    translation: "熬过这一天",
    usageNote: "常指艰难但还是撑过去。",
    aiEnrichmentStatus: "done",
    exampleSentences: [{ en: "I just need to get through the day.", zh: "我只要先熬过今天。" }],
  });

  assert.deepEqual(
    buildSavedFocusDetailState({
      focusDetail: {
        text: "get through the day",
        differenceLabel: null,
        kind: "library-similar",
        savedItem: staleSaved,
        assistItem: null,
      },
      matchedSavedItem: refreshedSaved,
    }),
    {
      text: "get through the day",
      differenceLabel: null,
      kind: "library-similar",
      savedItem: refreshedSaved,
      assistItem: null,
    },
  );

  assert.deepEqual(
    buildSavedFocusDetailState({
      focusDetail: {
        text: "get through the day",
        differenceLabel: null,
        kind: "current",
        savedItem: staleSaved,
        assistItem: null,
      },
      matchedSavedItem: refreshedSaved,
    }),
    {
      text: "get through the day",
      differenceLabel: null,
      kind: "current",
      savedItem: refreshedSaved,
      assistItem: null,
    },
  );
});
