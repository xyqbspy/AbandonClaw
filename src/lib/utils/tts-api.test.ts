import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  clearClientEventRecords,
  listClientEventRecords,
} from "./client-events";
import {
  __getAudioRetryFailureRecordForTests,
  __resetTtsTestState,
  __setTtsCacheLimitsForTests,
  clearBrowserTtsCacheEntries,
  buildChunkTtsCacheKey,
  buildSceneFullTtsCacheKey,
  buildSentenceTtsCacheKey,
  ensureChunkAudio,
  ensureSceneFullAudio,
  ensureSentenceAudio,
  getBrowserTtsCacheSummary,
  getTtsPlaybackState,
  listBrowserTtsCacheEntries,
  playChunkAudio,
  playSentenceAudio,
  subscribeTtsPlaybackState,
  stopTtsPlayback,
} from "./tts-api";
import { markAudioWarmed } from "./tts-warmup-registry";
import { USER_SETTINGS_STORAGE_KEY } from "./user-settings";

const originalFetch = globalThis.fetch;
const originalAudio = globalThis.Audio;
const originalWindow = globalThis.window;
const originalCaches = globalThis.caches;
const originalCreateObjectURL = globalThis.URL.createObjectURL;
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

const getRequestUrl = (request: RequestInfo | URL) => {
  if (typeof request === "string") return request;
  if (request instanceof URL) return request.toString();
  return request.url;
};

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

beforeEach(async () => {
  await __resetTtsTestState();
  clearClientEventRecords();
});

afterEach(async () => {
  await __resetTtsTestState();
  stopTtsPlayback();
  globalThis.fetch = originalFetch;
  globalThis.Audio = originalAudio;
  globalThis.window = originalWindow;
  globalThis.caches = originalCaches;
  globalThis.URL.createObjectURL = originalCreateObjectURL;
  globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  clearClientEventRecords();
});

test("ensureSentenceAudio 会对同一音频请求做并发去重", async () => {
  let requestCount = 0;
  let resolveFetch!: (value: Response) => void;

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

  resolveFetch(
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

test("ensureChunkAudio 在内存 URL 缓存超限后会逐出较旧条目", async () => {
  let requestCount = 0;

  __setTtsCacheLimitsForTests({
    urlEntries: 1,
    preloadedUrls: 1,
    persistentObjectUrls: 1,
    browserEntries: 0,
    browserBytes: 0,
  });

  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ url: `https://cdn.test/chunk-${requestCount}.mp3` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const firstUrl = await ensureChunkAudio({
    chunkText: "hang in there",
    chunkKey: "hang-in-there",
  });
  const secondUrl = await ensureChunkAudio({
    chunkText: "call it a day",
    chunkKey: "call-it-a-day",
  });
  const reloadedFirstUrl = await ensureChunkAudio({
    chunkText: "hang in there",
    chunkKey: "hang-in-there",
  });

  assert.equal(firstUrl, "https://cdn.test/chunk-1.mp3");
  assert.equal(secondUrl, "https://cdn.test/chunk-2.mp3");
  assert.equal(reloadedFirstUrl, "https://cdn.test/chunk-3.mp3");
  assert.equal(requestCount, 3);
});

test("ensureChunkAudio 首次成功后会优先命中浏览器本地缓存", async () => {
  let apiRequestCount = 0;
  let sourceAudioFetchCount = 0;
  let objectUrlCount = 0;
  const cacheBuckets = new Map<string, Map<string, Response>>();
  globalThis.window = globalThis as typeof globalThis & Window;

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
          const key = getRequestUrl(request);
          return bucket?.get(key)?.clone() ?? undefined;
        },
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = getRequestUrl(request);
          bucket?.set(key, response.clone());
        },
      } as unknown as Cache;
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

  assert.equal(firstUrl, "https://cdn.test/chunk-persisted.mp3");
  assert.equal(apiRequestCount, 1);
  assert.equal(sourceAudioFetchCount, 1);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((cacheBuckets.get("tts-audio-v2")?.size ?? 0) > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

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
  globalThis.window = globalThis as typeof globalThis & Window;

  globalThis.caches = {
    open: async (name: string) => {
      let bucket = cacheBuckets.get(name);
      if (!bucket) {
        bucket = new Map<string, Response>();
        cacheBuckets.set(name, bucket);
      }
      return {
        match: async (request: RequestInfo | URL) => {
          const key = getRequestUrl(request);
          return bucket?.get(key)?.clone() ?? undefined;
        },
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = getRequestUrl(request);
          bucket?.set(key, response.clone());
        },
        delete: async (request: RequestInfo | URL) => {
          const key = getRequestUrl(request);
          return bucket?.delete(key) ?? false;
        },
        keys: async () =>
          Array.from(bucket?.keys() ?? []).map((key) => new Request(key)),
      } as unknown as Cache;
    },
    delete: async (name: string) => cacheBuckets.delete(name),
    has: async (name: string) => cacheBuckets.has(name),
    keys: async () => Array.from(cacheBuckets.keys()),
    match: async () => undefined,
  } as CacheStorage;

  const cache = await globalThis.caches.open("tts-audio-v2");
  await cache.put(
    new Request("https://local.tts.cache/chunk%3Awrap-up"),
    new Response(new Blob(["1234"], { type: "audio/mpeg" })),
  );
  await cache.put(
    new Request("https://local.tts.cache/sentence%3Ascene-a%3As-1"),
    new Response(new Blob(["123456"], { type: "audio/mpeg" })),
  );
  await cache.put(
    new Request("https://local.tts.cache/sentence%3Ascene-a%3Asentence-block-blk-1-abc"),
    new Response(new Blob(["12"], { type: "audio/mpeg" })),
  );

  const entries = await listBrowserTtsCacheEntries();
  const summary = await getBrowserTtsCacheSummary();

  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => entry.kind).sort(),
    ["block", "chunk", "sentence"],
  );
  assert.equal(summary.entryCount, 3);
  assert.equal(summary.totalBytes, 12);

  const clearResult = await clearBrowserTtsCacheEntries(["chunk:wrap-up"]);
  const nextEntries = await listBrowserTtsCacheEntries();

  assert.equal(clearResult.removedCount, 1);
  assert.equal(clearResult.removedBytes, 4);
  assert.deepEqual(
    nextEntries.map((entry) => entry.cacheKey).sort(),
    ["sentence:scene-a:s-1", "sentence:scene-a:sentence-block-blk-1-abc"],
  );
});

test("浏览器 TTS 缓存在超限后会保留最新写入的音频", async () => {
  let apiRequestCount = 0;
  let sourceAudioFetchCount = 0;
  let objectUrlCount = 0;
  const cacheBuckets = new Map<string, Map<string, Response>>();
  globalThis.window = globalThis as typeof globalThis & Window;

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
          const key = getRequestUrl(request);
          return bucket?.get(key)?.clone() ?? undefined;
        },
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = getRequestUrl(request);
          bucket?.set(key, response.clone());
        },
        delete: async (request: RequestInfo | URL) => {
          const key = getRequestUrl(request);
          return bucket?.delete(key) ?? false;
        },
        keys: async () =>
          Array.from(bucket?.keys() ?? []).map((key) => new Request(key)),
      } as unknown as Cache;
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

  __setTtsCacheLimitsForTests({
    browserEntries: 1,
    browserBytes: 1024 * 1024,
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (typeof input === "string" && input === "/api/tts") {
      apiRequestCount += 1;
      return new Response(
        JSON.stringify({ url: `https://cdn.test/audio-${apiRequestCount}.mp3` }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    sourceAudioFetchCount += 1;
    return new Response(new Blob([`audio-data-${sourceAudioFetchCount}`], { type: "audio/mpeg" }), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  }) as typeof fetch;

  await ensureChunkAudio({
    chunkText: "hang in there",
    chunkKey: "hang-in-there",
  });
  await ensureChunkAudio({
    chunkText: "call it a day",
    chunkKey: "call-it-a-day",
  });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bucketSize = cacheBuckets.get("tts-audio-v2")?.size ?? 0;
    if (bucketSize === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const entries = await listBrowserTtsCacheEntries();

  assert.equal(apiRequestCount, 2);
  assert.equal(sourceAudioFetchCount, 2);
  assert.deepEqual(entries.map((entry) => entry.cacheKey), ["chunk:call-it-a-day"]);
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

test("playChunkAudio 会依次发出 loading、playing 和 idle 状态", async () => {
  const states: Array<ReturnType<typeof getTtsPlaybackState>> = [];
  const unsubscribe = subscribeTtsPlaybackState((state) => {
    states.push(state);
  });

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}

    play() {
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }

    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ url: "https://cdn.test/chunk-status.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await playChunkAudio({
    chunkText: "status test",
    chunkKey: "status-test",
  });
  unsubscribe();

  assert.equal(states[0]?.status, "loading");
  assert.equal(states[0]?.text, "status test");
  assert.ok(states.some((state) => state.status === "playing" && state.text === "status test"));
  assert.equal(getTtsPlaybackState().status, "idle");
  assert.equal(getTtsPlaybackState().kind, null);
});

test("playChunkAudio 会记录 chunk hit/miss 与 warmup 字段", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }
    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ url: "https://cdn.test/chunk-warm.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  markAudioWarmed(
    buildChunkTtsCacheKey({ chunkText: "warm chunk", chunkKey: "warm-chunk" }),
    "initial",
  );
  await playChunkAudio({
    chunkText: "warm chunk",
    chunkKey: "warm-chunk",
  });

  const [record] = listClientEventRecords();
  assert.equal(record?.name, "chunk_audio_play_miss_cache");
  assert.equal(record?.payload.audioUnit, "chunk");
  assert.equal(record?.payload.wasWarmed, true);
  assert.equal(record?.payload.warmupSource, "initial");
});

test("playSentenceAudio 会记录 sentence cache hit / miss 事件", async () => {
  let requestCount = 0;
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
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
    return new Response(JSON.stringify({ url: "https://cdn.test/sentence-observe.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const payload = {
    sceneSlug: "observe-scene",
    sentenceId: "s-1",
    text: "Observe this sentence.",
    speaker: "A",
    mode: "normal" as const,
  };

  await playSentenceAudio(payload);
  await playSentenceAudio(payload);

  assert.equal(requestCount, 1);
  assert.deepEqual(
    listClientEventRecords().map((record) => record.name).reverse(),
    ["sentence_audio_play_miss_cache", "sentence_audio_play_hit_cache"],
  );
  assert.deepEqual(
    listClientEventRecords()
      .map((record) => record.payload.audioUnit)
      .reverse(),
    ["sentence", "sentence"],
  );
  assert.deepEqual(
    listClientEventRecords()
      .map((record) => record.payload.wasWarmed)
      .reverse(),
    [false, false],
  );
});

test("playSentenceAudio 复用 block id 时会在观测 payload 中标记 audioUnit=block", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }
    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ url: "https://cdn.test/block-observe.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await playSentenceAudio({
    sceneSlug: "observe-scene",
    sentenceId: "block-blk-1",
    text: "Observe this block.",
    speaker: "A",
  });

  const [record] = listClientEventRecords();
  assert.equal(record?.name, "sentence_audio_play_miss_cache");
  assert.equal(record?.payload.audioUnit, "block");
  assert.equal(record?.payload.sentenceId, "block-blk-1");
});

test("playSentenceAudio 会把 warmup registry 信息写入播放事件", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }
    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ url: "https://cdn.test/warmed-block.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  const payload = {
    sceneSlug: "observe-scene",
    sentenceId: "block-blk-2",
    text: "A warmed block.",
    speaker: "A",
  };
  markAudioWarmed(buildSentenceTtsCacheKey(payload), "playback");

  await playSentenceAudio(payload);

  const [record] = listClientEventRecords();
  assert.equal(record?.payload.audioUnit, "block");
  assert.equal(record?.payload.wasWarmed, true);
  assert.equal(record?.payload.warmupSource, "playback");
});

test("playChunkAudio applies the stored user voice speed", async () => {
  const storage = createLocalStorageMock();
  storage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify({ voiceSpeed: "1.2x" }));
  globalThis.window = {
    localStorage: storage,
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  const playbackRates: number[] = [];

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    playbackRate = 1;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}

    play() {
      playbackRates.push(this.playbackRate);
      queueMicrotask(() => {
        this.onended?.();
      });
      return Promise.resolve();
    }

    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ url: "https://cdn.test/chunk-speed.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await playChunkAudio({
    chunkText: "speed test",
    chunkKey: "speed-test",
  });

  assert.deepEqual(playbackRates, [1.2]);
});

test("ensureSentenceAudio 连续失败按 ladder 升级 cooldown，命中冷却时直接 throw 不发 fetch", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;
  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(
      JSON.stringify({ error: "synthesizer crashed", code: "TTS_PROVIDER_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = {
    sceneSlug: "scene-cooldown",
    sentenceId: "s-1",
    text: "First sentence please.",
    speaker: "A",
    mode: "normal" as const,
  };
  const cacheKey = buildSentenceTtsCacheKey(payload);

  // 第 1 次失败：失败计数 1，cooldownMs=0，立即可 retry
  await assert.rejects(() => ensureSentenceAudio(payload));
  let record = __getAudioRetryFailureRecordForTests(cacheKey);
  assert.equal(record?.failureCount, 1);
  assert.equal(record?.cooldownMs, 0);
  assert.equal(fetchCount, 1);

  // 第 2 次失败：失败计数 2，cooldownMs 升到 5_000
  await assert.rejects(() => ensureSentenceAudio(payload));
  record = __getAudioRetryFailureRecordForTests(cacheKey);
  assert.equal(record?.failureCount, 2);
  assert.equal(record?.cooldownMs, 5_000);
  assert.equal(fetchCount, 2);

  // 第 3 次：仍在 cooldown 期内，应直接 throw 不发 fetch
  await assert.rejects(() => ensureSentenceAudio(payload), (error) => {
    const detail = (error as Error & { details?: Record<string, unknown> }).details;
    assert.ok(detail);
    assert.equal(detail?.failureCount, 2);
    assert.equal(detail?.cooldownMs, 5_000);
    return true;
  });
  assert.equal(fetchCount, 2, "cooldown 命中时不应发起新 fetch");

  // 命中 cooldown 时应记录 tts_request_cooling_down 事件
  const coolingDown = listClientEventRecords().find(
    (record) => record.name === "tts_request_cooling_down",
  );
  assert.ok(coolingDown, "expected tts_request_cooling_down event");
  assert.equal(coolingDown?.payload.kind, "sentence");
  assert.equal(coolingDown?.payload.failureCount, 2);
  assert.equal(coolingDown?.payload.cooldownMs, 5_000);
});

test("ensureChunkAudio 成功后 cooldown 立即清零，再失败时按 1 次失败起算", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;
  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  let nextResponseShouldFail = true;
  globalThis.fetch = (async () => {
    if (nextResponseShouldFail) {
      return new Response(JSON.stringify({ error: "transient" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ url: "https://cdn.test/chunk-recovered.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const cacheKey = buildChunkTtsCacheKey({
    chunkText: "recover me",
    chunkKey: "recover-me",
  });

  // 第 1 次失败：record 出现，failureCount=1
  await assert.rejects(() =>
    ensureChunkAudio({ chunkText: "recover me", chunkKey: "recover-me" }),
  );
  assert.equal(__getAudioRetryFailureRecordForTests(cacheKey)?.failureCount, 1);

  // 切换为成功响应：成功后 record 应被清除
  nextResponseShouldFail = false;
  await ensureChunkAudio({ chunkText: "recover me", chunkKey: "recover-me" });
  assert.equal(
    __getAudioRetryFailureRecordForTests(cacheKey),
    null,
    "成功后 record 应被 clearAudioRetryFailure 删除",
  );

  // 命中内存 cache 后再请求也不会触发 fetch；为了测试新失败的 record 重置，
  // 重置 cache 状态后再次让 fetch 失败
  await __resetTtsTestState({ preservePersistentCache: false });
  nextResponseShouldFail = true;
  await assert.rejects(() =>
    ensureChunkAudio({ chunkText: "recover me", chunkKey: "recover-me" }),
  );
  // 重置后第 1 次失败的 failureCount 仍是 1（不是承接之前的 2/3）
  assert.equal(__getAudioRetryFailureRecordForTests(cacheKey)?.failureCount, 1);
});

test("ensureSceneFullAudio 失败时不进入泛化 audioRetry cooldown（走自己的 sceneFullFailureCooldowns）", async () => {
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;
  globalThis.Audio = class {
    preload = "auto";
    src = "";
    load() {}
  } as typeof Audio;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "scene full failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  const params = {
    sceneSlug: "scene-isolated",
    sceneType: "monologue" as const,
    segments: [{ text: "Only segment." }],
  };
  const cacheKey = buildSceneFullTtsCacheKey(params);

  await assert.rejects(() => ensureSceneFullAudio(params));
  assert.equal(
    __getAudioRetryFailureRecordForTests(cacheKey),
    null,
    "scene_full 失败不应写入 audioRetryFailureRecords",
  );
});

