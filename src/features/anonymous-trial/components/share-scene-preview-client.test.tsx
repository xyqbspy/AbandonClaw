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

// 全量记录创建的 Audio 实例,便于断言 src + 触发 onended/onerror
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
              text: "I just wrapped up the report.",
              translation: "我刚把报告搞定。",
              chunks: ["wrapped up", "the report"],
              chunkDetails: [],
            },
            {
              id: "sen-2",
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
    showPracticePreview?: boolean;
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

const getSentenceAudioButton = (container: HTMLElement, sentenceId: string) => {
  const sentenceNode = container.querySelector(`[data-sentence-id="${sentenceId}"]`);
  assert.ok(sentenceNode, `应渲染句子 ${sentenceId}`);
  const button = sentenceNode.parentElement?.querySelector("button[data-audio-state]");
  assert.ok(button, `句子 ${sentenceId} 应渲染朗读按钮`);
  return button as HTMLElement;
};

const getChunkButton = (
  result: ReturnType<typeof render>,
  chunkText: string,
) => {
  const buttons = result.getAllByRole("button", { name: chunkText });
  assert.ok(buttons.length >= 1, `应渲染 chunk 按钮: ${chunkText}`);
  return buttons[0] as HTMLElement;
};

test("ShareScenePreviewClient 渲染场景标题/句子/chunk 按钮", async () => {
  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup?from=share&scene=share-sample" />,
  );

  await flushAsync();

  assert.ok(result.getByText("Sharing a small win at work"));
  assert.ok(result.getByText("I just wrapped up the report."));
  assert.ok(result.getAllByText("翻译").length >= 2);
  for (const chunk of ["wrapped up", "the report", "a relief"]) {
    assert.ok(result.getAllByRole("button", { name: chunk }).length >= 1);
  }
});

test("ShareScenePreviewClient mount 后上报 anon_first_scene_viewed 并保证 anonId 已落盘", async () => {
  const Component = getComponent();
  render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );

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

test("ShareScenePreviewClient 点击 chunk 按钮触发 explain-selection 调用,带 X-Anonymous-Id 头", async () => {
  fetchResponder = (call) => {
    if (call.url.includes("/api/explain-selection")) {
      return new Response(
        JSON.stringify({
          chunk: { text: "wrapped up", translation: "搞定", explanation: "完成某事" },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-Quota-Type": "explain_selection",
            "X-Quota-Daily-Limit": "200",
            "X-Quota-Daily-Remaining": "199",
            "X-Quota-Session-Limit": "3",
            "X-Quota-Session-Remaining": "2",
            "X-Quota-Reset-At": "2026-05-29T00:00:00.000Z",
          },
        },
      );
    }
    return new Response(null, { status: 204 });
  };

  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const chunkButton = getChunkButton(result, "wrapped up");

  await act(async () => {
    fireEvent.click(chunkButton);
  });
  await flushAsync();

  const explainCalls = findFetchCalls((url) => url.includes("/api/explain-selection"));
  assert.equal(explainCalls.length, 1, "应该恰好 1 次 explain-selection 调用");
  assert.equal(explainCalls[0].method, "POST");
  assert.ok(
    explainCalls[0].headers["x-anonymous-id"]?.length === 36,
    `应该带 X-Anonymous-Id 头(实际:${explainCalls[0].headers["x-anonymous-id"]})`,
  );

  await waitFor(() => {
    assert.ok(result.getAllByText("搞定").length >= 1, "成功响应后应显示 AI 释义");
    assert.ok(result.getAllByText("完成某事").length >= 1, "成功响应后应显示 AI 说明");
  });
});

test("ShareScenePreviewClient 配额耗尽(429 ANON_QUOTA_EXCEEDED_SESSION)弹出 L3 阻断弹窗", async () => {
  fetchResponder = (call) => {
    if (call.url.includes("/api/explain-selection")) {
      return new Response(
        JSON.stringify({
          code: "ANON_QUOTA_EXCEEDED_SESSION",
          error: "session quota exceeded",
          details: { capability: "explain_selection" },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(null, { status: 204 });
  };

  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const chunkButton = getChunkButton(result, "wrapped up");
  await act(async () => {
    fireEvent.click(chunkButton);
  });
  await flushAsync();

  await waitFor(() => {
    const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
    assert.ok(modal, "429 ANON_QUOTA_EXCEEDED_SESSION 应该弹出 L3 block modal");
    assert.equal(modal!.getAttribute("data-trigger"), "explain_quota_exhausted");
  });

  // L3 弹窗显示应该上报 anon_register_prompt_shown
  const shownCalls = findFetchCalls((url) => url.includes("/api/anonymous/funnel-event")).filter(
    (call) =>
      typeof call.body === "object" &&
      call.body !== null &&
      (call.body as { event?: string }).event === "anon_register_prompt_shown" &&
      (call.body as { payload?: { prompt_level?: string } }).payload?.prompt_level === "L3",
  );
  assert.ok(shownCalls.length >= 1, "L3 弹出时应上报 anon_register_prompt_shown");
});

test("ShareScenePreviewClient 点击顶栏注册按钮上报 anon_register_prompt_clicked L1", async () => {
  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const banner = result.container.querySelector(
    '[data-testid="anonymous-topbar-register-action"]',
  ) as HTMLElement;
  assert.ok(banner, "顶栏注册按钮应渲染");

  await act(async () => {
    fireEvent.click(banner);
  });
  await flushAsync();

  const clickedCalls = findFetchCalls((url) => url.includes("/api/anonymous/funnel-event")).filter(
    (call) =>
      typeof call.body === "object" &&
      call.body !== null &&
      (call.body as { event?: string }).event === "anon_register_prompt_clicked" &&
      (call.body as { payload?: { prompt_level?: string } }).payload?.prompt_level === "L1",
  );
  assert.equal(clickedCalls.length, 1, "顶栏点击应触发 1 次 L1 clicked 上报");
});

test("ShareScenePreviewClient 点击 inline upsell 注册按钮上报 anon_register_prompt_clicked L2", async () => {
  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const inlineRegister = result.container.querySelector(
    '[data-testid="anonymous-inline-upsell-register"]',
  ) as HTMLElement;
  assert.ok(inlineRegister, "inline upsell 注册按钮应渲染");

  await act(async () => {
    fireEvent.click(inlineRegister);
  });
  await flushAsync();

  const clickedCalls = findFetchCalls((url) => url.includes("/api/anonymous/funnel-event")).filter(
    (call) =>
      typeof call.body === "object" &&
      call.body !== null &&
      (call.body as { event?: string }).event === "anon_register_prompt_clicked" &&
      (call.body as { payload?: { prompt_level?: string } }).payload?.prompt_level === "L2",
  );
  assert.equal(clickedCalls.length, 1, "inline upsell 点击应触发 1 次 L2 clicked 上报");
});

// === 句子级 TTS 预生成播放 ===

test("ShareScenePreviewClient 渲染每个 sentence 的播放按钮(初始 idle 状态)", async () => {
  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  for (const sentenceId of ["sen-1", "sen-2"]) {
    const button = getSentenceAudioButton(result.container, sentenceId);
    assert.equal(button.getAttribute("data-audio-state"), "idle");
  }
});

test("ShareScenePreviewClient 点击播放按钮触发 GET /api/anonymous/tts/play 带 sceneSlug/sentenceId/text + 创建 Audio 播放", async () => {
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
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const firstPlayButton = getSentenceAudioButton(result.container, "sen-1");
  await act(async () => {
    fireEvent.click(firstPlayButton);
  });
  await flushAsync();

  const playCalls = findFetchCalls((url) => url.includes("/api/anonymous/tts/play"));
  assert.equal(playCalls.length, 1, "应该恰好 1 次 tts/play 调用");
  assert.equal(playCalls[0].method, "GET");
  assert.match(playCalls[0].url, /kind=sentence/);
  assert.match(playCalls[0].url, /sceneSlug=share-sample/);
  assert.match(playCalls[0].url, /sentenceId=sen-1/);
  assert.match(playCalls[0].url, /text=I\+just\+wrapped\+up\+the\+report\./);
  assert.ok(
    playCalls[0].headers["x-anonymous-id"]?.length === 36,
    "应带 X-Anonymous-Id 头",
  );

  assert.equal(mockedAudios.length, 1, "成功响应后应该创建 1 个 Audio");
  assert.match(mockedAudios[0].src, /signed\/sen-1\.mp3/);
  assert.equal(mockedAudios[0].playInvocations, 1);

  await waitFor(() =>
    assert.equal(
      firstPlayButton.getAttribute("data-audio-state"),
      "playing",
      "Audio.play() 后按钮音频状态应该是 playing",
    ),
  );
});

test("ShareScenePreviewClient TTS 配额耗尽(429 ANON_QUOTA_EXCEEDED_SESSION)弹出 tts_quota_exhausted L3 modal", async () => {
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
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const firstPlayButton = getSentenceAudioButton(result.container, "sen-1");
  await act(async () => {
    fireEvent.click(firstPlayButton);
  });
  await flushAsync();

  await waitFor(() => {
    const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
    assert.ok(modal, "TTS 配额耗尽应弹出 block modal");
    assert.equal(modal!.getAttribute("data-trigger"), "tts_quota_exhausted");
  });

  assert.equal(mockedAudios.length, 0, "配额耗尽不应创建 Audio 实例");
});

test("ShareScenePreviewClient TTS storage miss(404)不弹 modal 且不创建 Audio", async () => {
  fetchResponder = (call) => {
    if (call.url.includes("/api/anonymous/tts/play")) {
      return new Response(
        JSON.stringify({ code: "NOT_FOUND", error: "audio not found" }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(null, { status: 204 });
  };

  const Component = getComponent();
  const result = render(
    <Component initialLesson={SAMPLE_LESSON} registerHref="/signup" />,
  );
  await flushAsync();

  const firstPlayButton = getSentenceAudioButton(result.container, "sen-1");
  await act(async () => {
    fireEvent.click(firstPlayButton);
  });
  await flushAsync();

  const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
  assert.equal(modal, null, "storage miss 不应弹 L3 modal(只是单句不可用)");
  assert.equal(mockedAudios.length, 0, "storage miss 不应创建 Audio");
});

test("ShareScenePreviewClient 试用练习只做本地反馈,提交保存会触发注册阻断", async () => {
  const Component = getComponent();
  const result = render(
    <Component
      initialLesson={SAMPLE_LESSON}
      registerHref="/signup?from=trial&scene=share-sample"
      showPracticePreview
      backHref="/trial"
    />,
  );
  await flushAsync();

  assert.ok(result.getByText("← 返回试用场景"));
  assert.ok(result.getByText("预生成练习题"));

  const input = result.container.querySelector("input") as HTMLInputElement;
  assert.ok(input, "应渲染本地练习输入框");
  await act(async () => {
    fireEvent.change(input, { target: { value: "wrapped up" } });
  });

  await act(async () => {
    fireEvent.click(result.getAllByText("查看本地反馈")[0]);
  });
  assert.ok(result.getByText("答对了。这个结果只保存在当前页面。"));

  const beforeSubmitCalls = fetchCalls.length;
  await act(async () => {
    fireEvent.click(result.getByText("提交并保存"));
  });
  await flushAsync();

  const modal = result.container.querySelector('[data-testid="anonymous-block-modal"]');
  assert.ok(modal, "提交保存必须弹注册阻断");
  assert.equal(modal!.getAttribute("data-trigger"), "feature_disabled");
  assert.equal(
    fetchCalls.length,
    beforeSubmitCalls + 1,
    "提交保存只允许触发 L3 shown 漏斗事件,不得调用提交/保存 API",
  );
  assert.ok(
    fetchCalls.at(-1)?.url.includes("/api/anonymous/funnel-event"),
    "最后一次请求应为漏斗事件",
  );
});
