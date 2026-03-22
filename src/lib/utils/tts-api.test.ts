import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  __resetTtsTestState,
  clearBrowserTtsCacheEntries,
  ensureChunkAudio,
  ensureSentenceAudio,
  getBrowserTtsCacheSummary,
  listBrowserTtsCacheEntries,
  playChunkAudio,
  stopTtsPlayback,
} from "./tts-api";

const originalFetch = globalThis.fetch;
const originalAudio = globalThis.Audio;
const originalCaches = globalThis.caches;
const originalCreateObjectURL = globalThis.URL.createObjectURL;
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

beforeEach(async () => {
  await __resetTtsTestState();
});

afterEach(async () => {
  await __resetTtsTestState();
  stopTtsPlayback();
  globalThis.fetch = originalFetch;
  globalThis.Audio = originalAudio;
  globalThis.caches = originalCaches;
  globalThis.URL.createObjectURL = originalCreateObjectURL;
  globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
});

test("ensureSentenceAudio 会对同一音频请求做并发去重", async () => {
  let requestCount = 0;
  let resolveFetch: ((value: Response) => void) | null = null;

  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  globalThis.fetch = (async () => {
    requestCount += 1;
    return await new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  }) as typeof fetch;

  const first = ensureSentenceAudio({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "Good morning.",
    speaker: "A",
    mode: "normal",
  });
  const second = ensureSentenceAudio({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "Good morning.",
    speaker: "A",
    mode: "normal",
  });

  await Promise.resolve();
  assert.equal(requestCount, 1);

  resolveFetch?.(
    new Response(JSON.stringify({ url: "https://cdn.test/audio-1.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const [firstUrl, secondUrl] = await Promise.all([first, second]);
  assert.equal(firstUrl, "https://cdn.test/audio-1.mp3");
  assert.equal(secondUrl, "https://cdn.test/audio-1.mp3");
});

test("ensureChunkAudio 命中前端内存缓存后不会重复请求", async () => {
  let requestCount = 0;

  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ url: "https://cdn.test/chunk-1.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const firstUrl = await ensureChunkAudio({
    chunkText: "wrap up",
    chunkKey: "wrap-up",
  });
  const secondUrl = await ensureChunkAudio({
    chunkText: "wrap up",
    chunkKey: "wrap-up",
  });

  assert.equal(firstUrl, "https://cdn.test/chunk-1.mp3");
  assert.equal(secondUrl, "https://cdn.test/chunk-1.mp3");
  assert.equal(requestCount, 1);
});

test("ensureChunkAudio 首次成功后会优先命中浏览器本地缓存", async () => {
  let apiRequestCount = 0;
  let sourceAudioFetchCount = 0;
  let objectUrlCount = 0;
  const cacheBuckets = new Map<string, Map<string, Response>>();

  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  globalThis.caches = {
    open: async (name: string) => {
      let bucket = cacheBuckets.get(name);
      if (!bucket) {
        bucket = new Map<string, Response>();
        cacheBuckets.set(name, bucket);
      }
      return {
        match: async (request: RequestInfo | URL) => {
          const key = typeof request === "string" ? request : request.url;
          return bucket?.get(key)?.clone() ?? undefined;
        },
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = typeof request === "string" ? request : request.url;
          bucket?.set(key, response.clone());
        },
      } as Cache;
    },
    delete: async (name: string) => cacheBuckets.delete(name),
    has: async (name: string) => cacheBuckets.has(name),
    keys: async () => Array.from(cacheBuckets.keys()),
    match: async () => undefined,
  } as CacheStorage;

  globalThis.URL.createObjectURL = ((blob: Blob) => {
    objectUrlCount += 1;
    return `blob:tts-${objectUrlCount}-${blob.size}`;
  }) as typeof URL.createObjectURL;
  globalThis.URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (typeof input === "string" && input === "/api/tts") {
      apiRequestCount += 1;
      return new Response(JSON.stringify({ url: "https://cdn.test/chunk-persisted.mp3" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    sourceAudioFetchCount += 1;
    return new Response(new Blob(["audio-data"], { type: "audio/mpeg" }), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  }) as typeof fetch;

  const firstUrl = await ensureChunkAudio({
    chunkText: "hang in there",
    chunkKey: "hang-in-there",
  });

  assert.match(firstUrl, /^blob:tts-/);
  assert.equal(apiRequestCount, 1);
  assert.equal(sourceAudioFetchCount, 1);

  await __resetTtsTestState({ preservePersistentCache: true });

  globalThis.fetch = (async () => {
    throw new Error("browser cache hit should not request remote tts");
  }) as typeof fetch;
  globalThis.URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

  const secondUrl = await ensureChunkAudio({
    chunkText: "hang in there",
    chunkKey: "hang-in-there",
  });

  assert.match(secondUrl, /^blob:tts-/);
  assert.notEqual(secondUrl, firstUrl);
});

test("浏览器 TTS 缓存 helper 可以列出大小并定向清理", async () => {
  const cacheBuckets = new Map<string, Map<string, Response>>();

  globalThis.caches = {
    open: async (name: string) => {
      let bucket = cacheBuckets.get(name);
      if (!bucket) {
        bucket = new Map<string, Response>();
        cacheBuckets.set(name, bucket);
      }
      return {
        match: async (request: RequestInfo | URL) => {
          const key = typeof request === "string" ? request : request.url;
          return bucket?.get(key)?.clone() ?? undefined;
        },
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = typeof request === "string" ? request : request.url;
          bucket?.set(key, response.clone());
        },
        delete: async (request: RequestInfo | URL) => {
          const key = typeof request === "string" ? request : request.url;
          return bucket?.delete(key) ?? false;
        },
        keys: async () =>
          Array.from(bucket?.keys() ?? []).map((key) => new Request(key)),
      } as Cache;
    },
    delete: async (name: string) => cacheBuckets.delete(name),
    has: async (name: string) => cacheBuckets.has(name),
    keys: async () => Array.from(cacheBuckets.keys()),
    match: async () => undefined,
  } as CacheStorage;

  const cache = await globalThis.caches.open("tts-audio-v1");
  await cache.put(
    new Request("https://local.tts.cache/chunk%3Awrap-up"),
    new Response(new Blob(["1234"], { type: "audio/mpeg" })),
  );
  await cache.put(
    new Request("https://local.tts.cache/sentence%3Ascene-a%3As-1"),
    new Response(new Blob(["123456"], { type: "audio/mpeg" })),
  );

  const entries = await listBrowserTtsCacheEntries();
  const summary = await getBrowserTtsCacheSummary();

  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.kind).sort(),
    ["chunk", "sentence"],
  );
  assert.equal(summary.entryCount, 2);
  assert.equal(summary.totalBytes, 10);

  const clearResult = await clearBrowserTtsCacheEntries(["chunk:wrap-up"]);
  const nextEntries = await listBrowserTtsCacheEntries();

  assert.equal(clearResult.removedCount, 1);
  assert.equal(clearResult.removedBytes, 4);
  assert.deepEqual(nextEntries.map((entry) => entry.cacheKey), ["sentence:scene-a:s-1"]);
});

test("playChunkAudio 会复用同一个播放音频实例", async () => {
  let requestCount = 0;
  let nextAudioId = 0;
  const playedInstanceIds = new Set<number>();

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;
    id: number;

    constructor() {
      this.id = nextAudioId;
      nextAudioId += 1;
    }

    load() {}

    play() {
      playedInstanceIds.add(this.id);
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }

    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;

  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ url: `https://cdn.test/chunk-${requestCount}.mp3` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  await playChunkAudio({
    chunkText: "wrap up today",
    chunkKey: "wrap-up-today",
  });
  stopTtsPlayback();

  await playChunkAudio({
    chunkText: "call it a day",
    chunkKey: "call-it-a-day",
  });

  assert.equal(playedInstanceIds.size, 1);
});
