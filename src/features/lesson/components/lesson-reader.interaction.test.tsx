import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { lessons } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { LessonReader } from "./lesson-reader";

const originalMatchMedia = window.matchMedia;
const originalGetSelection = window.getSelection;
const originalToastSuccess = toast.success;
const originalToastMessage = toast.message;
const originalToastError = toast.error;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
  Object.defineProperty(window, "getSelection", {
    configurable: true,
    writable: true,
    value: originalGetSelection,
  });
  toast.success = originalToastSuccess;
  toast.message = originalToastMessage;
  toast.error = originalToastError;
});

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
}

function createSelectionState(sentenceElement: HTMLElement, text: string) {
  const textNode = sentenceElement.firstChild;
  assert.ok(textNode);

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(text.length, textNode.textContent?.length ?? text.length));
  Object.defineProperty(range, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      top: 120,
      bottom: 140,
      left: 120,
      right: 220,
      width: 100,
      height: 20,
      x: 120,
      y: 120,
      toJSON: () => ({}),
    }),
  });

  return {
    rangeCount: 1,
    isCollapsed: false,
    toString: () => text,
    getRangeAt: () => range,
    removeAllRanges: () => undefined,
  };
}

function createDialogueLesson(): Lesson {
  return {
    id: "dialogue-1",
    slug: "small-talk",
    title: "Small Talk",
    subtitle: "Two-line dialogue",
    difficulty: "Intermediate",
    estimatedMinutes: 3,
    completionRate: 0,
    tags: ["dialogue"],
    sceneType: "dialogue",
    sourceType: "builtin",
    sections: [
      {
        id: "section-1",
        title: "Opening",
        summary: "Greeting each other",
        blocks: [
          {
            id: "block-1",
            speaker: "A",
            kind: "dialogue",
            sentences: [
              {
                id: "s-1",
                speaker: "A",
                text: "I'm trying to catch up.",
                translation: "我正努力跟上进度。",
                chunks: ["catch up"],
                chunkDetails: [
                  {
                    id: "chunk-1",
                    text: "catch up",
                    translation: "赶上，追上进度",
                    grammarLabel: "verb phrase",
                    meaningInSentence: "这里表示追上当前进度。",
                    usageNote: "常用于学习或工作语境。",
                    examples: [
                      { en: "I need to catch up this weekend.", zh: "我这周末得追赶进度。" },
                    ],
                    start: 17,
                    end: 25,
                  },
                ],
              },
              {
                id: "s-2",
                speaker: "B",
                text: "You'll be fine soon.",
                translation: "你很快就会好的。",
                chunks: ["be fine"],
                chunkDetails: [
                  {
                    id: "chunk-2",
                    text: "be fine",
                    translation: "没问题，会好的",
                    grammarLabel: "phrase",
                    meaningInSentence: "这里表示情况会改善。",
                    usageNote: "常用于安慰别人。",
                    examples: [
                      { en: "Everything will be fine.", zh: "一切都会好的。" },
                    ],
                    start: 7,
                    end: 14,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    explanations: [],
  };
}

function installToastSpies() {
  const calls = {
    success: [] as string[],
    message: [] as string[],
    error: [] as string[],
  };
  toast.success = ((message?: string) => {
    if (message) calls.success.push(message);
    return "";
  }) as typeof toast.success;
  toast.message = ((message?: string) => {
    if (message) calls.message.push(message);
    return "";
  }) as typeof toast.message;
  toast.error = ((message?: string) => {
    if (message) calls.error.push(message);
    return "";
  }) as typeof toast.error;
  return calls;
}

async function activateChunkInDesktopReader() {
  fireEvent.click(screen.getByRole("button", { name: "went to bed pretty late" }));
  await waitFor(() => {
    assert.ok(screen.getByText("睡得挺晚"));
  });
}

test("LessonReader 在桌面端点击句子后会切换右侧详情", async () => {
  mockMatchMedia(false);
  const lesson = lessons[0];

  render(<LessonReader lesson={lesson} />);

  assert.ok(screen.getByText("我昨天睡得挺晚的。"));

  fireEvent.click(screen.getByText("I kept watching videos instead of studying English."));

  await waitFor(() => {
    assert.ok(screen.getByText("我一直在刷视频，而不是学英语。"));
  });
});

test("LessonReader 在桌面端选中文本后点击释义会切换句子上下文并清空工具栏", async () => {
  mockMatchMedia(false);
  const lesson = lessons[0];

  render(<LessonReader lesson={lesson} />);

  const sentenceElement = screen.getByText("I kept watching videos instead of studying English.");
  const selection = createSelectionState(sentenceElement, "instead of");
  Object.defineProperty(window, "getSelection", {
    configurable: true,
    writable: true,
    value: () => selection,
  });

  document.dispatchEvent(new Event("selectionchange"));

  const toolbar = await screen.findByRole("toolbar", { name: "选中文本操作" });
  await waitFor(() => {
    assert.doesNotMatch(toolbar.className, /pointer-events-none/);
  });

  fireEvent.click(within(toolbar).getByRole("button", { name: "释义" }));

  await waitFor(() => {
    assert.ok(screen.getByText("我一直在刷视频，而不是学英语。"));
    assert.match(toolbar.className, /pointer-events-none/);
  });
});

test("LessonReader 在移动端点击句子后会打开详情 sheet 并激活首个短语", async () => {
  mockMatchMedia(true);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} />);

  fireEvent.click(screen.getByText("You'll be fine soon."));

  const dialog = await screen.findByRole("dialog", { name: "学习详情" });
  assert.ok(within(dialog).getByText("你很快就会好的。"));
  assert.equal(within(dialog).getAllByText("be fine").length >= 1, true);
  assert.ok(within(dialog).getByText("没问题，会好的"));
});

test("LessonReader 收藏当前短语时会透传 payload 并更新已收藏状态", async () => {
  mockMatchMedia(false);
  const toastCalls = installToastSpies();
  const savePayloads: Array<Record<string, unknown>> = [];

  render(
    <LessonReader
      lesson={lessons[0]}
      onSavePhrase={async (payload) => {
        savePayloads.push(payload);
        return { created: true };
      }}
    />,
  );

  await activateChunkInDesktopReader();
  fireEvent.click(screen.getByRole("button", { name: "收藏短语" }));

  await waitFor(() => {
    assert.deepEqual(savePayloads, [
      {
        text: "went to bed pretty late",
        translation: "睡得挺晚",
        usageNote: "很自然地描述前一天作息拖晚了。",
        sourceSceneSlug: "getting-back-on-track",
        sourceSentenceIndex: 0,
        sourceSentenceText: "I went to bed pretty late yesterday.",
        sourceChunkText: "went to bed pretty late",
      },
    ]);
    assert.ok(screen.getByRole("button", { name: "已收藏" }));
    assert.deepEqual(toastCalls.success, ["已收藏短语"]);
  });
});

test("LessonReader 收藏已存在短语时会提示已在收藏中", async () => {
  mockMatchMedia(false);
  const toastCalls = installToastSpies();

  render(
    <LessonReader
      lesson={lessons[0]}
      onSavePhrase={async () => ({ created: false })}
    />,
  );

  await activateChunkInDesktopReader();
  fireEvent.click(screen.getByRole("button", { name: "收藏短语" }));

  await waitFor(() => {
    assert.deepEqual(toastCalls.message, ["该短语已在收藏中"]);
    assert.deepEqual(toastCalls.success, []);
  });
});

test("LessonReader 加入复习失败时会显示错误提示", async () => {
  mockMatchMedia(false);
  const toastCalls = installToastSpies();

  render(
    <LessonReader
      lesson={lessons[0]}
      onReviewPhrase={async () => {
        throw new Error("review failed");
      }}
    />,
  );

  await activateChunkInDesktopReader();
  fireEvent.click(screen.getByRole("button", { name: "加入复习" }));

  await waitFor(() => {
    assert.deepEqual(toastCalls.error, ["review failed"]);
  });
});
