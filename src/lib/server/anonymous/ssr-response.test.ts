import assert from "node:assert/strict";
import test from "node:test";
import {
  ANONYMOUS_CACHE_CONTROL,
  isSearchEngineBotFromHeaders,
  setAnonymousResponseHeaders,
} from "./ssr-response";

test("setAnonymousResponseHeaders 写入 Cache-Control: private, no-store", () => {
  const headers = new Headers();
  setAnonymousResponseHeaders(headers);
  assert.equal(headers.get("Cache-Control"), ANONYMOUS_CACHE_CONTROL);
  assert.match(ANONYMOUS_CACHE_CONTROL, /no-store/);
  assert.doesNotMatch(ANONYMOUS_CACHE_CONTROL, /public/);
});

test("setAnonymousResponseHeaders 覆盖已存在的 Cache-Control", () => {
  const headers = new Headers({ "cache-control": "public, max-age=3600" });
  setAnonymousResponseHeaders(headers);
  assert.equal(headers.get("Cache-Control"), ANONYMOUS_CACHE_CONTROL);
});

test("isSearchEngineBotFromHeaders 命中 Googlebot UA 返 true", () => {
  const incoming = new Headers({ "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
  assert.equal(isSearchEngineBotFromHeaders(incoming), true);
});

test("isSearchEngineBotFromHeaders 普通 Chrome UA 返 false", () => {
  const incoming = new Headers({
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  });
  assert.equal(isSearchEngineBotFromHeaders(incoming), false);
});

test("isSearchEngineBotFromHeaders 空 UA 返 false", () => {
  const incoming = new Headers();
  assert.equal(isSearchEngineBotFromHeaders(incoming), false);
});
