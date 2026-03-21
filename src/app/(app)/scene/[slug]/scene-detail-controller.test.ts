import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSceneToolIntent,
  resolveVariantDeleteOutcome,
  shouldReuseExpressionMapCache,
} from "./scene-detail-controller";

test("resolveSceneToolIntent 会区分 generate / open / ignore", () => {
  assert.equal(
    resolveSceneToolIntent({ hasBaseLesson: false, loading: false, status: "idle" }),
    "ignore",
  );
  assert.equal(
    resolveSceneToolIntent({ hasBaseLesson: true, loading: true, status: "idle" }),
    "ignore",
  );
  assert.equal(
    resolveSceneToolIntent({ hasBaseLesson: true, loading: false, status: "idle" }),
    "generate",
  );
  assert.equal(
    resolveSceneToolIntent({ hasBaseLesson: true, loading: false, status: "generated" }),
    "open",
  );
});

test("resolveVariantDeleteOutcome 会在删除当前激活变体时返回回退结果", () => {
  assert.deepEqual(
    resolveVariantDeleteOutcome({
      activeVariantId: "variant-1",
      deletingVariantId: "variant-1",
    }),
    {
      shouldClearActiveVariant: true,
      nextViewMode: "variants",
    },
  );

  assert.deepEqual(
    resolveVariantDeleteOutcome({
      activeVariantId: "variant-1",
      deletingVariantId: "variant-2",
    }),
    {
      shouldClearActiveVariant: false,
      nextViewMode: null,
    },
  );
});

test("shouldReuseExpressionMapCache 会只在同一变体集时复用缓存", () => {
  assert.equal(
    shouldReuseExpressionMapCache({
      currentVariantSetId: "variant-set-1",
      cachedVariantSetId: "variant-set-1",
    }),
    true,
  );
  assert.equal(
    shouldReuseExpressionMapCache({
      currentVariantSetId: "variant-set-1",
      cachedVariantSetId: "variant-set-2",
    }),
    false,
  );
});
