import assert from "node:assert/strict";
import test from "node:test";

import { builtinSceneSeeds } from "./builtin-scene-seeds";

const ALLOWED_LEVELS = new Set(["L0", "L1", "L2"]);
const ALLOWED_SOURCE_TYPES = new Set(["builtin"]);

test("builtin scenes 数据地基满足第一版入门闭环要求", () => {
  assert.equal(builtinSceneSeeds.length >= 24, true);

  for (const seed of builtinSceneSeeds) {
    assert.equal(Boolean(seed.meta.slug), true, `${seed.meta.slug} 缺少 slug`);
    assert.equal(Boolean(seed.meta.title), true, `${seed.meta.slug} 缺少 title`);
    assert.equal(seed.meta.title, seed.lesson.title, `${seed.meta.slug} meta title 与 lesson title 不一致`);
    assert.equal(ALLOWED_LEVELS.has(seed.meta.level), true, `${seed.meta.slug} level 非法`);
    assert.equal(Boolean(seed.meta.category), true, `${seed.meta.slug} 缺少 category`);
    assert.equal(Boolean(seed.meta.learningGoal), true, `${seed.meta.slug} 缺少 learningGoal`);
    assert.equal(
      typeof seed.meta.estimatedMinutes,
      "number",
      `${seed.meta.slug} 缺少 estimatedMinutes`,
    );
    assert.equal(
      ALLOWED_SOURCE_TYPES.has(seed.meta.sourceType),
      true,
      `${seed.meta.slug} sourceType 非法`,
    );
  }
});

test("builtin scene 核心 chunks 有稳定顺序和类型", () => {
  for (const seed of builtinSceneSeeds) {
    const chunks = seed.lesson.explanations;
    assert.equal(
      chunks.length >= 4 && chunks.length <= 8,
      true,
      `${seed.meta.slug} chunks 数量应在 4-8 之间`,
    );

    chunks.forEach((chunk, index) => {
      assert.equal(Boolean(chunk.text), true, `${seed.meta.slug} chunk 缺少 text`);
      assert.equal(Boolean(chunk.translation), true, `${seed.meta.slug} chunk 缺少 translation`);
      assert.equal(chunk.order, index + 1, `${seed.meta.slug} chunk order 不连续`);
      assert.equal(chunk.chunkType, "core_phrase", `${seed.meta.slug} chunkType 非法`);
      assert.equal(chunk.type, "core_phrase", `${seed.meta.slug} type 非法`);
    });

    const sentenceChunkDetails = seed.lesson.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        block.sentences.flatMap((sentence) => sentence.chunkDetails ?? []),
      ),
    );
    for (const detail of sentenceChunkDetails) {
      assert.equal(typeof detail.order, "number", `${seed.meta.slug} chunkDetail 缺少 order`);
      assert.equal(detail.chunkType, "core_phrase", `${seed.meta.slug} chunkDetail chunkType 非法`);
      assert.equal(detail.type, "core_phrase", `${seed.meta.slug} chunkDetail type 非法`);
    }
  }
});

test("starter path 与 builtin 入门场景语义分离且排序连续", () => {
  const starters = builtinSceneSeeds
    .filter((seed) => seed.meta.isStarter)
    .sort((left, right) => left.meta.sortOrder - right.meta.sortOrder);

  assert.equal(starters.length >= 2, true);
  assert.equal(starters.every((seed) => seed.meta.category === "starter"), true);
  assert.equal(starters.every((seed) => seed.meta.sourceType === "builtin"), true);
  assert.equal(starters.every((seed) => typeof seed.meta.starterOrder === "number"), true);

  for (let index = 1; index < starters.length; index += 1) {
    assert.equal(
      starters[index].meta.starterOrder,
      (starters[index - 1].meta.starterOrder ?? 0) + 1,
      "starter path starterOrder 必须连续",
    );
  }

  const nonStarterBuiltinScenes = builtinSceneSeeds.filter((seed) => !seed.meta.isStarter);
  assert.equal(nonStarterBuiltinScenes.length > 0, true);
  assert.equal(
    nonStarterBuiltinScenes.every((seed) => seed.meta.sourceType === "builtin"),
    true,
  );
  assert.equal(nonStarterBuiltinScenes.every((seed) => seed.meta.starterOrder === null), true);
});
