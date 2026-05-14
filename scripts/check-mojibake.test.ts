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

test("能识别本轮暴露的 changelog 式乱码片段", () => {
  const changelogLikeSample = [
    String.fromCodePoint(0x93c2, 0x626e, 0x6564, 0x93b4),
    String.fromCodePoint(0x7ec9, 0x8bf2, 0x59e9),
    String.fromCodePoint(0x93ba, 0x3128, 0x5d18),
  ].join(" / ");

  const matches = findSuspiciousPatternsInText(changelogLikeSample, "CHANGELOG.md");

  assert.ok(matches.length >= 1);
});

test("检查器源码不再依赖忽略自身", () => {
  const source = readFileSync(new URL("./check-mojibake.ts", import.meta.url), "utf8");

  assert.ok(!source.includes('IGNORED_RELATIVE_PATHS = new Set(["scripts/check-mojibake.ts"])'));
  assert.ok(!source.includes(String.fromCodePoint(0x9983)));
  assert.ok(!source.includes(String.fromCodePoint(0x9410, 0x7470, 0x56ae)));
});
