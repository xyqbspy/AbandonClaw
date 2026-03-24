import assert from "node:assert/strict";
import test from "node:test";
import { ParsedScene } from "@/lib/types/scene-parser";
import { mergeDraftDialogueIntoParsedScene } from "./generation";

test("mergeDraftDialogueIntoParsedScene 会按 turn 重建 block，并保留每句 chunk", () => {
  const parsedScene: ParsedScene = {
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
            sentences: [
              {
                id: "sentence-1",
                text: "You're still here?",
                translation: "你还在这儿？",
                tts: "You're still here?",
                chunks: [
                  {
                    id: "chunk-1",
                    key: "still here",
                    text: "still here",
                    translation: "还在这儿",
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
                    translation: "已经八点了",
                    start: 5,
                    end: 17,
                  },
                ],
              },
            ],
          },
          {
            id: "block-2",
            type: "dialogue",
            speaker: "B",
            sentences: [
              {
                id: "sentence-3",
                text: "I just need ten more minutes.",
                translation: "我只需要再十分钟。",
                tts: "I just need ten more minutes.",
                chunks: [
                  {
                    id: "chunk-3",
                    key: "ten more minutes",
                    text: "ten more minutes",
                    translation: "再十分钟",
                    start: 12,
                    end: 28,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = mergeDraftDialogueIntoParsedScene(parsedScene, {
    version: "v1",
    title: "Late Office（加班夜）",
    turns: [
      {
        speaker: "A",
        translation: "你还在这儿？已经晚上八点了。",
        sentences: [
          {
            text: "You're still here?",
            translation: "你还在这儿？",
          },
          {
            text: "It's already 8 PM.",
            translation: "已经晚上八点了。",
          },
        ],
      },
      {
        speaker: "B",
        translation: "我只需要再十分钟。",
        sentences: [
          {
            text: "I just need ten more minutes.",
            translation: "我只需要再十分钟。",
          },
        ],
      },
    ],
  });

  assert.equal(result.title, "Late Office（加班夜）");
  assert.equal(result.sections[0]?.blocks.length, 2);

  const firstBlock = result.sections[0]?.blocks[0];
  const secondBlock = result.sections[0]?.blocks[1];

  assert.ok(firstBlock);
  assert.ok(secondBlock);
  assert.equal(firstBlock.speaker, "A");
  assert.equal(firstBlock.sentences.length, 2);
  assert.deepEqual(firstBlock.sentences[0]?.chunks.map((chunk) => chunk.text), ["still here"]);
  assert.deepEqual(firstBlock.sentences[1]?.chunks.map((chunk) => chunk.text), ["already 8 PM"]);

  assert.equal(secondBlock.speaker, "B");
  assert.equal(secondBlock.sentences.length, 1);
  assert.deepEqual(secondBlock.sentences[0]?.chunks.map((chunk) => chunk.text), ["ten more minutes"]);
});
