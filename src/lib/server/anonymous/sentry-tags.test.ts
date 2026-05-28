import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { beforeEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const sentryCalls: Array<{ key: string; value: string }> = [];
let throwOnSetTag = false;

const sentryMock = {
  setTag: (key: string, value: string) => {
    if (throwOnSetTag) throw new Error("sentry not initialized");
    sentryCalls.push({ key, value });
  },
};

const mockedModules = {
  "@sentry/nextjs": sentryMock,
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

const sentryTagsPath = localRequire.resolve("./sentry-tags");
delete localRequire.cache[sentryTagsPath];
const {
  setSentryUserTypeTag,
  setSentryUserTypeTagFromAuthenticated,
} = localRequire("./sentry-tags") as typeof import("./sentry-tags");

beforeEach(() => {
  sentryCalls.length = 0;
  throwOnSetTag = false;
});

test("setSentryUserTypeTag 注入 user_type=registered", () => {
  setSentryUserTypeTag("registered");
  assert.deepEqual(sentryCalls, [{ key: "user_type", value: "registered" }]);
});

test("setSentryUserTypeTag 注入 user_type=anonymous", () => {
  setSentryUserTypeTag("anonymous");
  assert.deepEqual(sentryCalls, [{ key: "user_type", value: "anonymous" }]);
});

test("setSentryUserTypeTagFromAuthenticated true → registered", () => {
  setSentryUserTypeTagFromAuthenticated(true);
  assert.deepEqual(sentryCalls, [{ key: "user_type", value: "registered" }]);
});

test("setSentryUserTypeTagFromAuthenticated false → anonymous", () => {
  setSentryUserTypeTagFromAuthenticated(false);
  assert.deepEqual(sentryCalls, [{ key: "user_type", value: "anonymous" }]);
});

test("setSentryUserTypeTag Sentry 抛错时不冒泡(避免阻塞业务链路)", () => {
  throwOnSetTag = true;
  assert.doesNotThrow(() => setSentryUserTypeTag("anonymous"));
});
