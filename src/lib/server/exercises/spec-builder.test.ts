import assert from "node:assert/strict";
import test from "node:test";

import { buildExerciseSpecsFromScene } from "./spec-builder";

test("buildExerciseSpecsFromScene 会在需要补题时为同一句选择最多两个高价值 chunk", () => {
  const exercises = buildExerciseSpecsFromScene(
    {
      id: "scene-1",
      slug: "scene-1",
      title: "Scene 1",
      type: "dialogue",
      sections: [
        {
          id: "section-1",
          blocks: [
            {
              id: "block-1",
              type: "dialogue",
              speaker: "A",
              sentences: [
                {
                  id: "sentence-1",
                  text: "I should call it a day before I burn myself out.",
                  chunks: [
                    { id: "chunk-1", key: "i", text: "I", start: 0, end: 1 },
                    { id: "chunk-2", key: "call it a day", text: "call it a day", start: 9, end: 22 },
                    {
                      id: "chunk-3",
                      key: "burn myself out",
                      text: "burn myself out",
                      start: 32,
                      end: 47,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    10,
  );

  assert.equal(exercises.length, 2);
  assert.deepEqual(exercises.map((exercise) => exercise.chunkId), ["chunk-2", "chunk-3"]);
});

test("buildExerciseSpecsFromScene 会优先选择 grammarLabel 更像表达学习目标的 chunk", () => {
  const exercises = buildExerciseSpecsFromScene(
    {
      id: "scene-1",
      slug: "scene-1",
      title: "Scene 1",
      type: "dialogue",
      sections: [
        {
          id: "section-1",
          blocks: [
            {
              id: "block-1",
              type: "dialogue",
              speaker: "A",
              sentences: [
                {
                  id: "sentence-1",
                  text: "I really need to call it a day before I do something unnecessary tonight.",
                  chunks: [
                    {
                      id: "chunk-1",
                      key: "something unnecessary tonight",
                      text: "something unnecessary tonight",
                      grammarLabel: "Chunk",
                      start: 45,
                      end: 74,
                    },
                    {
                      id: "chunk-2",
                      key: "call it a day",
                      text: "call it a day",
                      grammarLabel: "Phrasal Expression",
                      meaningInSentence: "这里表示今天先收工。",
                      usageNote: "常用于决定先结束当天安排。",
                      start: 17,
                      end: 30,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    1,
  );

  assert.equal(exercises.length, 1);
  assert.equal(exercises[0]?.chunkId, "chunk-2");
});

test("buildExerciseSpecsFromScene 仍会尊重 maxCount 截断", () => {
  const exercises = buildExerciseSpecsFromScene(
    {
      id: "scene-1",
      slug: "scene-1",
      title: "Scene 1",
      type: "dialogue",
      sections: [
        {
          id: "section-1",
          blocks: [
            {
              id: "block-1",
              type: "dialogue",
              speaker: "A",
              sentences: [
                {
                  id: "sentence-1",
                  text: "I should call it a day before I burn myself out.",
                  chunks: [
                    { id: "chunk-1", key: "call it a day", text: "call it a day", start: 9, end: 22 },
                    {
                      id: "chunk-2",
                      key: "burn myself out",
                      text: "burn myself out",
                      start: 32,
                      end: 47,
                    },
                  ],
                },
                {
                  id: "sentence-2",
                  text: "You can take a rain check this time.",
                  chunks: [
                    { id: "chunk-3", key: "take a rain check", text: "take a rain check", start: 8, end: 25 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    2,
  );

  assert.equal(exercises.length, 2);
  assert.deepEqual(exercises.map((exercise) => exercise.chunkId), ["chunk-1", "chunk-2"]);
});
