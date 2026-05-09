import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProfileCanEnterApp,
  assertProfileCanGenerate,
  assertProfileCanWrite,
} from "./auth";
import { ForbiddenError } from "./errors";

const profile = (access_status?: "active" | "disabled" | "generation_limited" | "readonly") =>
  ({ access_status } as never);

test("active 或缺省 access_status 可以进入、生成和写入", () => {
  assert.doesNotThrow(() => assertProfileCanEnterApp(profile("active")));
  assert.doesNotThrow(() => assertProfileCanGenerate(profile("active")));
  assert.doesNotThrow(() => assertProfileCanWrite(profile("active")));
  assert.doesNotThrow(() => assertProfileCanEnterApp(profile()));
  assert.doesNotThrow(() => assertProfileCanGenerate(profile()));
  assert.doesNotThrow(() => assertProfileCanWrite(profile()));
});

test("disabled 会阻止进入、生成和写入", () => {
  assert.throws(() => assertProfileCanEnterApp(profile("disabled")), ForbiddenError);
  assert.throws(() => assertProfileCanGenerate(profile("disabled")), ForbiddenError);
  assert.throws(() => assertProfileCanWrite(profile("disabled")), ForbiddenError);
});

test("generation_limited 只阻止生成", () => {
  assert.doesNotThrow(() => assertProfileCanEnterApp(profile("generation_limited")));
  assert.throws(() => assertProfileCanGenerate(profile("generation_limited")), ForbiddenError);
  assert.doesNotThrow(() => assertProfileCanWrite(profile("generation_limited")));
});

test("readonly 只阻止写入", () => {
  assert.doesNotThrow(() => assertProfileCanEnterApp(profile("readonly")));
  assert.doesNotThrow(() => assertProfileCanGenerate(profile("readonly")));
  assert.throws(() => assertProfileCanWrite(profile("readonly")), ForbiddenError);
});
