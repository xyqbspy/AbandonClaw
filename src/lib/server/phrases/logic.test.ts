import assert from "node:assert/strict";
import test from "node:test";

import { resolveDeleteExpressionClusterResult } from "./logic";

test("resolveDeleteExpressionClusterResult 在删除主表达后会为剩余成员补位新主表达", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: ["variant-1", "variant-2"],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: false,
      nextMainUserPhraseId: "variant-1",
    },
  );
});

test("resolveDeleteExpressionClusterResult 在当前主表达仍保留时不会误改主表达", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: ["main-1", "variant-1"],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: false,
      nextMainUserPhraseId: "main-1",
    },
  );
});

test("resolveDeleteExpressionClusterResult 在删除空簇最后一个表达时会返回删除空簇", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: [],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: true,
      nextMainUserPhraseId: null,
    },
  );
});
