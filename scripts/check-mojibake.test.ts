import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { findSuspiciousPatternsInText } from "./check-mojibake";

const mojibakeSample = `示例：${String.fromCodePoint(0x9983)} / ${String.fromCodePoint(
  0x9410,
  0x7470,
  0x56ae,
)} / ${String.fromCodePoint(0xfffd)}`;

test("能识别高置信度乱码片段", () => {
  const matches = findSuspiciousPatternsInText(mojibakeSample, "sample.md");

  assert.ok(matches.length >= 1);
  assert.equal(matches[0]?.path, "sample.md");
});

test("检查器源码不再依赖忽略自身", () => {
  const source = readFileSync(new URL("./check-mojibake.ts", import.meta.url), "utf8");

  assert.ok(!source.includes('IGNORED_RELATIVE_PATHS = new Set(["scripts/check-mojibake.ts"])'));
  assert.ok(!source.includes(String.fromCodePoint(0x9983)));
  assert.ok(!source.includes(String.fromCodePoint(0x9410, 0x7470, 0x56ae)));
});
