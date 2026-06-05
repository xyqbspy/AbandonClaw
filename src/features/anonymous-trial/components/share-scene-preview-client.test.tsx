import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach, beforeEach } from "node:test";
import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { Lesson } from "@/lib/types";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "next/link": {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  },
  "next/navigation": {
    useRouter: () => ({
      push: () => undefined,
    }),
  },
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

type FetchCall = { url: string; method?: string; body?: unknown; headers: Record<string, string> };
let fetchCalls: FetchCall[] = [];
let fetchResponder: (call: FetchCall) => Response | Promise<Response>;
const originalFetch = globalThis.fetch;
const originalMatchMedia = window.matchMedia;

class MockAudio {
  src: string;
  onended: (() => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  currentTime = 0;
  paused = true;
  playInvocations = 0;
  constructor(src?: string) {
    this.src = src ?? "";
    mockedAudios.push(this);
  }
  async play() {
    this.playInvocations += 1;
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
}
let mockedAudios: MockAudio[] = [];
const originalAudio = (globalThis as { Audio?: unknown }).Audio;

const recordFetch = (input: RequestInfo | URL, init?: RequestInit): FetchCall => {
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? "GET";
  const headersRaw = init?.headers ?? {};
  const headers: Record<string, string> = {};
  if (headersRaw instanceof Headers) {
    headersRaw.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
  } else if (Array.isArray(headersRaw)) {
    for (const [k, v] of headersRaw) headers[k.toLowerCase()] = v;
  } else {
    for (const [k, v] of Object.entries(headersRaw as Record<string, string>)) {
      headers[k.toLowerCase()] = String(v);
    }
  }
  let body: unknown = init?.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // keep string
    }
  }
  return { url, method, body, headers };
};

beforeEach(() => {
  fetchCalls = [];
  mockedAudios = [];
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  fetchResponder = () => new Response(null, { status: 204 });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = recordFetch(input, init);
    fetchCalls.push(call);
    return await fetchResponder(call);
  }) as typeof fetch;
  (globalThis as { Audio: unknown }).Audio = MockAudio;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.matchMedia = originalMatchMedia;
  if (originalAudio === undefined) {
    delete (globalThis as { Audio?: unknown }).Audio;
  } else {
    (globalThis as { Audio: unknown }).Audio = originalAudio;
  }
});

const SAMPLE_LESSON: Lesson = {
  id: "lesson-share-001",
  slug: "share-sample",
  title: "Sharing a small win at work",
  subtitle: "在工位上简单分享一件小成就",
  description: "短场景",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: ["workplace"],
  sceneType: "dialogue",
  sections: [
    {
      id: "sec-1",
      title: "Section 1",
      blocks: [
        {
          id: "blk-1",
          speaker: "A",
          kind: "dialogue",
          sentences: [
            {
              id: "sen-1",
              speaker: "A",
              text: "I just wrapped up the report.",
              translation: "我刚把报告搞定。",
              chunks: ["wrapped up", "the report"],
              chunkDetails: [],
            },
          ],
        },
        {
          id: "blk-2",
          speaker: "B",
          kind: "dialogue",
          sentences: [
            {
              id: "sen-2",
              speaker: "B",
              text: "That's a relief.",
              translation: "总算松了口气。",
              chunks: ["a relief"],
              chunkDetails: [],
            },
          ],
        },
      ],
    },
  ],
  explanations: [],
};

let ClientModule: {
  ShareScenePreviewClient: (props: {
    initialLesson: Lesson;
    registerHref: string;
    backHref?: string;
  }) => React.ReactElement | null;
} | null = null;

function getComponent() {
  if (!ClientModule) {
    const modulePath = localRequire.resolve("./share-scene-preview-client");
    delete localRequire.cache[modulePath];
    ClientModule = localRequire("./share-scene-preview-client") as never;
  }
  return ClientModule!.ShareScenePreviewClient;
}

const flushAsync = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const findFetchCalls = (matcher: (url: string) => boolean) =>
  fetchCalls.filter((call) => matcher(call.url));

test("ShareScenePreviewClient 渲染真实场景气泡和详情入口,不再出现旧试用按钮", async () => {
  const Component = getComponent();
  const result = render(
    <Component
      initialLesson={SAMPLE_LESSON}
      registerHref="/signup?from=trial&scene=share-sample"
      backHref="/trial"
    />,
  );

  await flushAsync();

  assert.ok(result.getByText("在工位上简单分享一件小成就"));
  assert.ok(result.getAllByText("I just wrapped up the report.").length >= 1);
  assert.ok(result.getAllByText("That's a relief.").length >= 1);
  assert.equal(result.queryByText("听一遍"), null);
  assert.equal(result.queryByText(/解释 ·/), null);
  assert.equal(
    result.container.querySelector('[data-testid="share-scene-explain-chunk"]'),
    null,
  );
  assert.ok(result.container.querySelector('[data-sentence-id="sen-1"]'));
  assert.ok(result.container.querySelector('[data-sentence-id="sen-2"]'));
});

test("ShareScenePreviewClient mount 后上报 anon_first_scene_viewed 并保证 anonId 已落盘", async () => {
  const Component = getComponent();
  render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);

  await flushAsync();

  const funnelCalls = findFetchCalls((url) => url.includes("/api/anonymous/funnel-event"));
  assert.ok(
    funnelCalls.some(
      (call) =>
        typeof call.body === "object" &&
        call.body !== null &&
        (call.body as { event?: string }).event === "anon_first_scene_viewed",
    ),
    "应该至少有 1 次 anon_first_scene_viewed 上报",
  );
  const anonId = window.localStorage.getItem("abridge:anon_id");
  assert.ok(anonId && anonId.length === 36, "localStorage 应该已经落盘 UUID");
});

test("ShareScenePreviewClient 点击句子后详情面板切到该句和相关短语", async () => {
  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getByText("That's a relief."));
  });

  await waitFor(() => {
    assert.ok(result.getByText("本轮相关短语"));
    assert.ok(result.getAllByText("a relief").length >= 1);
  });
});

test("ShareScenePreviewClient 保存/加入复习只弹注册阻断,不调用 explain-selection", async () => {
  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getByText("收藏短语"));
  });
  await flushAsync();

  const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
  assert.ok(modal, "保存表达应弹出阻断弹窗");
  assert.equal(modal!.getAttribute("data-trigger"), "feature_disabled");
  assert.ok(result.getByText("涉及功能: 保存表达"));
  assert.equal(findFetchCalls((url) => url.includes("/api/explain-selection")).length, 0);
});

test("ShareScenePreviewClient 练习/变体入口进入固定本地体验,不调用生成或写入接口", async () => {
  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getByTestId("trial-scene-practice-entry"));
  });
  await flushAsync();

  assert.ok(result.getAllByText("填空练习").length >= 1);
  assert.equal(result.container.querySelector('[data-testid="anonymous-block-modal"]'), null);

  await act(async () => {
    fireEvent.click(result.getByText("返回原场景"));
  });
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getByTestId("trial-scene-variant-entry"));
  });
  await flushAsync();

  assert.ok(result.getByText("变体列表"));
  assert.equal(
    findFetchCalls((url) =>
      url.includes("/api/practice") ||
      url.includes("/api/learning") ||
      url.includes("/api/scenes/"),
    ).length,
    0,
  );
});

test("ShareScenePreviewClient 在详情 sheet 内触发保存时先关闭 sheet 且阻断弹层高于详情层", async () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getAllByText("I just wrapped up the report.")[0]);
  });
  await flushAsync();

  await act(async () => {
    fireEvent.click(result.getAllByText("收藏短语").at(-1)!);
  });
  await flushAsync();

  const backdrop = result.getByTestId("anonymous-block-modal-backdrop");
  assert.match(backdrop.getAttribute("class") ?? "", /z-\[90\]/);
  assert.ok(result.getByText("涉及功能: 保存表达"));
});

test("ShareScenePreviewClient 点击气泡朗读按钮触发匿名 TTS 播放", async () => {
  fetchResponder = (call) => {
    if (call.url.includes("/api/anonymous/tts/play")) {
      return new Response(
        JSON.stringify({
          signedUrl: "https://storage.example.com/signed/sen-1.mp3?token=abc",
          source: "storage-hit",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-Quota-Type": "tts_play",
            "X-Quota-Session-Limit": "30",
            "X-Quota-Session-Remaining": "29",
            "X-Quota-Daily-Limit": "unlimited",
            "X-Quota-Daily-Remaining": "unlimited",
            "X-Quota-Reset-At": "2026-05-29T00:00:00.000Z",
          },
        },
      );
    }
    return new Response(null, { status: 204 });
  };

  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  const firstPlayButton = result.container.querySelector(
    'button[aria-label="朗读"]',
  ) as HTMLElement;
  assert.ok(firstPlayButton, "气泡下方应有朗读按钮");

  await act(async () => {
    fireEvent.click(firstPlayButton);
  });
  await flushAsync();

  const playCalls = findFetchCalls((url) => url.includes("/api/anonymous/tts/play"));
  assert.equal(playCalls.length, 1, "应该恰好 1 次 tts/play 调用");
  assert.match(playCalls[0].url, /kind=sentence/);
  assert.match(playCalls[0].url, /sceneSlug=share-sample/);
  assert.match(playCalls[0].url, /sentenceId=sen-1/);
  assert.ok(playCalls[0].headers["x-anonymous-id"]?.length === 36);
  assert.equal(mockedAudios.length, 1);
  assert.equal(mockedAudios[0].playInvocations, 1);
  await waitFor(() => assert.equal(firstPlayButton.getAttribute("data-audio-state"), "playing"));
});

test("ShareScenePreviewClient TTS 配额耗尽弹出 tts_quota_exhausted 阻断弹窗", async () => {
  fetchResponder = (call) => {
    if (call.url.includes("/api/anonymous/tts/play")) {
      return new Response(
        JSON.stringify({
          code: "ANON_QUOTA_EXCEEDED_SESSION",
          error: "session quota exceeded",
          details: { capability: "tts_play" },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(null, { status: 204 });
  };

  const Component = getComponent();
  const result = render(<Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />);
  await flushAsync();

  const firstPlayButton = result.container.querySelector(
    'button[aria-label="朗读"]',
  ) as HTMLElement;
  await act(async () => {
    fireEvent.click(firstPlayButton);
  });
  await flushAsync();

  await waitFor(() => {
    const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
    assert.ok(modal, "TTS 配额耗尽应弹出 block modal");
    assert.equal(modal!.getAttribute("data-trigger"), "tts_quota_exhausted");
  });
  assert.equal(mockedAudios.length, 0);
});
