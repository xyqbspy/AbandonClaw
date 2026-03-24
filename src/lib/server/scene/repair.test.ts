import assert from "node:assert/strict";
import test from "node:test";
import { ParsedScene } from "@/lib/types/scene-parser";
import { repairGeneratedSceneDuplicateSentences } from "./repair";

test("repairGeneratedSceneDuplicateSentences 会折叠尾句重复的双句 block", () => {
  const scene: ParsedScene = {
    id: "scene-1",
    slug: "scene-1",
    title: "Late Office",
    type: "dialogue",
    sections: [
      {
        id: "section-1",
        blocks: [
          {
            id: "block-1",
            type: "dialogue",
            speaker: "A",
            translation: "你还在这里？已经晚上八点了。",
            tts: "You're still here? It's already 8 PM.",
            sentences: [
              {
                id: "sentence-1",
                text: "You're still here? It's already 8 PM.",
                translation: "你还在这里？已经晚上八点了。",
                tts: "You're still here? It's already 8 PM.",
                chunks: [
                  {
                    id: "chunk-1",
                    key: "still here",
                    text: "still here",
                    translation: "还在这里",
                    start: 7,
                    end: 17,
                  },
                ],
              },
              {
                id: "sentence-2",
                text: "It's already 8 PM.",
                translation: "已经晚上八点了。",
                tts: "It's already 8 PM.",
                chunks: [
                  {
                    id: "chunk-2",
                    key: "already 8 PM",
                    text: "already 8 PM",
                    translation: "已经八点",
                    start: 5,
                    end: 17,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = repairGeneratedSceneDuplicateSentences(scene);

  assert.equal(result.changedBlockCount, 1);
  assert.equal(result.changedSentenceCount, 1);
  assert.equal(result.repairedScene.sections[0]?.blocks[0]?.sentences.length, 1);
  assert.equal(
    result.repairedScene.sections[0]?.blocks[0]?.sentences[0]?.text,
    "You're still here? It's already 8 PM.",
  );
  assert.deepEqual(
    result.repairedScene.sections[0]?.blocks[0]?.sentences[0]?.chunks.map((chunk) => chunk.text),
    ["still here", "already 8 PM"],
  );
});

test("repairGeneratedSceneDuplicateSentences 不会误伤正常的双句 block", () => {
  const scene: ParsedScene = {
    id: "scene-2",
    slug: "scene-2",
    title: "Normal Dialogue",
    type: "dialogue",
    sections: [
      {
        id: "section-1",
        blocks: [
          {
            id: "block-1",
            type: "dialogue",
            speaker: "B",
            sentences: [
              {
                id: "sentence-1",
                text: "I know, but the deadline is tomorrow morning.",
                translation: "我知道，但截止时间是明天早上。",
                tts: "I know, but the deadline is tomorrow morning.",
                chunks: [],
              },
              {
                id: "sentence-2",
                text: "Just my luck.",
                translation: "真倒霉。",
                tts: "Just my luck.",
                chunks: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = repairGeneratedSceneDuplicateSentences(scene);

  assert.equal(result.changedBlockCount, 0);
  assert.equal(result.changedSentenceCount, 0);
  assert.equal(result.repairedScene.sections[0]?.blocks[0]?.sentences.length, 2);
});
