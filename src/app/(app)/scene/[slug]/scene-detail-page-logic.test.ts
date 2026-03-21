import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSceneDetailHref,
  buildScenePrefetchCandidates,
  estimateSceneLearningProgress,
  parseSceneDetailRouteState,
} from "./scene-detail-page-logic";

const createSearchParams = (value: string) => new URLSearchParams(value);

test("parseSceneDetailRouteState 会把查询参数解析成稳定路由状态", () => {
  assert.deepEqual(parseSceneDetailRouteState(createSearchParams("view=variant-study&variant=v2")), {
    viewMode: "variant-study",
    activeVariantId: "v2",
  });
  assert.deepEqual(parseSceneDetailRouteState(createSearchParams("view=variants")), {
    viewMode: "variants",
    activeVariantId: null,
  });
  assert.deepEqual(parseSceneDetailRouteState(createSearchParams("view=unknown&variant=v2")), {
    viewMode: "scene",
    activeVariantId: null,
  });
});

test("buildSceneDetailHref 会正确维护 scene/variant 相关查询参数", () => {
  assert.equal(
    buildSceneDetailHref({
      sceneSlug: "coffee-chat",
      searchParams: createSearchParams("foo=1"),
      nextViewMode: "variants",
    }),
    "/scene/coffee-chat?foo=1&view=variants",
  );
  assert.equal(
    buildSceneDetailHref({
      sceneSlug: "coffee-chat",
      searchParams: createSearchParams("foo=1&view=variants"),
      nextViewMode: "variant-study",
      variantId: "v2",
    }),
    "/scene/coffee-chat?foo=1&view=variant-study&variant=v2",
  );
  assert.equal(
    buildSceneDetailHref({
      sceneSlug: "coffee-chat",
      searchParams: createSearchParams("foo=1&view=variant-study&variant=v2"),
      nextViewMode: "scene",
    }),
    "/scene/coffee-chat?foo=1",
  );
});

test("estimateSceneLearningProgress 会按视图模式输出稳定进度", () => {
  assert.equal(estimateSceneLearningProgress("scene"), 20);
  assert.equal(estimateSceneLearningProgress("practice"), 90);
  assert.equal(estimateSceneLearningProgress("variants"), 65);
  assert.equal(estimateSceneLearningProgress("variant-study"), 65);
});

test("buildScenePrefetchCandidates 会优先取后续场景，再回退最近缓存并去重", () => {
  const extractSlugFromSceneCacheKey = (key: string) =>
    key.startsWith("scene:") ? key.slice("scene:".length) : "";

  assert.deepEqual(
    buildScenePrefetchCandidates({
      requestSlug: "scene-b",
      sceneSlugs: ["scene-a", "scene-b", "scene-c", "scene-d"],
      recentCacheKeys: ["scene:scene-a", "scene:scene-d", "scene:scene-b"],
      extractSlugFromSceneCacheKey,
    }),
    ["scene-c", "scene-d"],
  );

  assert.deepEqual(
    buildScenePrefetchCandidates({
      requestSlug: "scene-d",
      sceneSlugs: ["scene-a", "scene-b", "scene-c", "scene-d"],
      recentCacheKeys: ["scene:scene-b", "scene:scene-d", "scene:scene-a"],
      extractSlugFromSceneCacheKey,
    }),
    ["scene-b", "scene-a"],
  );
});
