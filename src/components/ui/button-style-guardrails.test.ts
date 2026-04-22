import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const roots = ["src/app", "src/components", "src/features"];
const sourceFilePattern = /\.(ts|tsx)$/;
const skipFilePattern = /(\.test\.|\.interaction\.test\.|\.d\.ts$)/;
const buttonElementPattern = /<(?:Button|LoadingButton|ConfirmButton)\b[\s\S]*?(?:\/>|<\/(?:Button|LoadingButton|ConfirmButton)>)/g;

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return walkFiles(path);
    if (!sourceFilePattern.test(path) || skipFilePattern.test(path)) return [];
    return [path];
  });
}

test("按钮不得混用 ghost variant 和 APPLE_BUTTON 外观类", () => {
  const violations = roots
    .flatMap(walkFiles)
    .flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(source.matchAll(buttonElementPattern))
        .filter(([buttonSource]) =>
          /variant=["']ghost["']/.test(buttonSource) && /APPLE_BUTTON_(BASE|STRONG|DANGER)/.test(buttonSource),
        )
        .map(([buttonSource]) => {
          const line = source.slice(0, source.indexOf(buttonSource)).split("\n").length;
          return `${path}:${line}`;
        });
    });

  assert.deepEqual(violations, []);
});
