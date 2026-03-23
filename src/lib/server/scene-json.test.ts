import assert from "node:assert/strict";
import test from "node:test";

import { parseJsonWithFallback } from "./scene-json";

test("parseJsonWithFallback 能修复字符串中的未转义换行", () => {
  const raw = `{
    "version": "v1",
    "scene": {
      "id": "scene-1",
      "slug": "scene-1",
      "type": "monologue",
      "sections": [
        {
          "id": "sec-1",
          "blocks": [
            {
              "id": "blk-1",
              "type": "monologue",
              "translation": "第一行
第二行",
              "sentences": [
                {
                  "id": "s1",
                  "text": "Hello there.",
                  "chunks": []
                }
              ]
            }
          ]
        }
      ]
    }
  }`;

  const parsed = parseJsonWithFallback(raw) as {
    scene: { sections: Array<{ blocks: Array<{ translation: string }> }> };
  };

  assert.equal(parsed.scene.sections[0].blocks[0].translation, "第一行\n第二行");
});

test("parseJsonWithFallback 能修复字符串中的未转义双引号", () => {
  const raw = `{
    "message": "He said "hello" to me.",
    "items": []
  }`;

  const parsed = parseJsonWithFallback(raw) as { message: string };

  assert.equal(parsed.message, `He said "hello" to me.`);
});

test("parseJsonWithFallback 不会把值字符串里引号后的冒号误判为 key 结束", () => {
  const raw = `{
    "message": "The label "A": is still part of the sentence.",
    "items": []
  }`;

  const parsed = parseJsonWithFallback(raw) as { message: string };

  assert.equal(parsed.message, `The label "A": is still part of the sentence.`);
});

test("parseJsonWithFallback 清理注释时不会误删字符串里的 URL", () => {
  const raw = `{
    // comment
    "url": "https://example.com/a//b",
    "title": "demo", /* trailing */
  }`;

  const parsed = parseJsonWithFallback(raw) as { url: string; title: string };

  assert.equal(parsed.url, "https://example.com/a//b");
  assert.equal(parsed.title, "demo");
});
