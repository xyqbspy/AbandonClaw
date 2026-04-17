import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __resetTtsWarmupRegistryForTests,
  getWarmupInfo,
  markAudioWarmed,
} from "./tts-warmup-registry";

afterEach(() => {
  __resetTtsWarmupRegistryForTests();
});

test("markAudioWarmed 会记录资源已预热及来源", () => {
  markAudioWarmed("sentence:scene-1:key", "initial");

  assert.deepEqual(getWarmupInfo("sentence:scene-1:key"), {
    wasWarmed: true,
    source: "initial",
  });
  assert.deepEqual(getWarmupInfo("sentence:scene-1:other"), {
    wasWarmed: false,
  });
});

test("高优先级来源可以覆盖低优先级来源", () => {
  markAudioWarmed("scene:scene-1:key", "initial");
  markAudioWarmed("scene:scene-1:key", "idle");
  markAudioWarmed("scene:scene-1:key", "playback");
  markAudioWarmed("scene:scene-1:key", "initial");

  assert.deepEqual(getWarmupInfo("scene:scene-1:key"), {
    wasWarmed: true,
    source: "playback",
  });
});

test("过期记录不会继续被视为 warmed", async () => {
  __resetTtsWarmupRegistryForTests({ ttlMs: 1 });
  markAudioWarmed("chunk:key", "initial");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.deepEqual(getWarmupInfo("chunk:key"), {
    wasWarmed: false,
  });
});

test("容量超限时会裁剪最旧记录", () => {
  __resetTtsWarmupRegistryForTests({ limit: 2 });
  markAudioWarmed("chunk:one", "initial");
  markAudioWarmed("chunk:two", "idle");
  markAudioWarmed("chunk:three", "playback");

  assert.deepEqual(getWarmupInfo("chunk:one"), {
    wasWarmed: false,
  });
  assert.equal(getWarmupInfo("chunk:two").wasWarmed, true);
  assert.equal(getWarmupInfo("chunk:three").source, "playback");
});

