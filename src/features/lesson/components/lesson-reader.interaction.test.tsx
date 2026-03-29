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
            translation: "我正在努力跟上进度。你很快就会好的。",
            sentences: [
              {
                id: "s-1",
                speaker: "A",
                text: "I'm trying to catch up.",
                translation: "我正在努力跟上进度。",
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

function createGroupedMobileLesson(): Lesson {
  return {
    id: "grouped-mobile-1",
    slug: "grouped-mobile",
    title: "Grouped Mobile",
    subtitle: "Two short sentences in one mobile group",
    difficulty: "Intermediate",
    estimatedMinutes: 3,
    completionRate: 0,
    tags: ["mobile"],
    sceneType: "monologue",
    sourceType: "builtin",
    sections: [
      {
        id: "section-1",
        title: "Section 1",
        summary: "Grouped sentences",
        blocks: [
          {
            id: "block-1",
            kind: "monologue",
            translation: "第一句。第二句。",
            sentences: [
              {
                id: "m-1",
                text: "This is the first sentence.",
                translation: "第一句。",
                chunks: ["first sentence"],
                chunkDetails: [],
              },
              {
                id: "m-2",
                text: "This is the second sentence.",
                translation: "第二句。",
                chunks: ["second sentence"],
                chunkDetails: [],
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

function getTrainingCard() {
  const card = document.querySelector("[data-current-training-sentence]");
  assert.ok(card instanceof HTMLElement);
  return card;
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

  assert.ok(screen.getByText("I went to bed pretty late yesterday."));

  fireEvent.click(screen.getByText("I kept watching videos instead of studying English."));

  await waitFor(() => {
    assert.ok(screen.getAllByText("instead of").length >= 1);
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
    assert.ok(screen.getAllByText("instead of").length >= 1);
    assert.match(toolbar.className, /pointer-events-none/);
  });
});

test("LessonReader 在移动端点击句子后会打开详情 sheet 并激活首个短语", async () => {
  mockMatchMedia(true);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} />);

  fireEvent.click(screen.getByText("You'll be fine soon."));

  const dialog = await screen.findByRole("dialog", { name: "学习详情" });
  assert.equal(within(dialog).getAllByText("catch up").length >= 1, true);
  assert.ok(within(dialog).getByText("赶上，追上进度"));
});

test("LessonReader 在移动端点击翻译或朗读按钮时不会误打开详情 sheet", () => {
  mockMatchMedia(true);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} />);

  const blockArticle = screen.getByText("I'm trying to catch up.").closest("article");
  assert.ok(blockArticle);
  const blockContainer = blockArticle.parentElement;
  assert.ok(blockContainer);

  fireEvent.click(within(blockContainer).getByRole("button", { name: "翻译" }));
  assert.equal(screen.queryByRole("dialog", { name: "学习详情" }), null);

  fireEvent.click(within(blockContainer).getByRole("button", { name: "朗读" }));
  assert.equal(screen.queryByRole("dialog", { name: "学习详情" }), null);
});

test("LessonReader 在训练模式下点击句子会直接打开详情", async () => {
  mockMatchMedia(false);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} interactionMode="training" />);

  const targetSentence = document.querySelector('[data-sentence-id="s-2"]');
  assert.ok(targetSentence instanceof HTMLElement);
  fireEvent.click(targetSentence);

  const trainingCard = getTrainingCard();
  assert.equal(trainingCard.dataset.currentTrainingSentence, "You'll be fine soon.");

  await waitFor(() => {
    assert.ok(screen.getAllByText("be fine").length >= 1);
  });
  assert.equal(screen.queryByRole("button", { name: "看解释" }), null);
});

test("LessonReader 在移动端训练模式下点击分组内具体句子时，学习详情会跟随切到对应短语", async () => {
  mockMatchMedia(true);
  const lesson = createGroupedMobileLesson();

  render(<LessonReader lesson={lesson} interactionMode="training" />);

  fireEvent.click(screen.getByText("This is the first sentence."));
  await waitFor(() => {
    const dialog = screen.getByRole("dialog", { name: "学习详情" });
    assert.ok(within(dialog).getAllByText("first sentence").length >= 1);
  });

  fireEvent.click(screen.getByText("This is the second sentence."));
  await waitFor(() => {
    const dialog = screen.getByRole("dialog", { name: "学习详情" });
    assert.ok(within(dialog).getAllByText("second sentence").length >= 1);
  });
});

test("LessonReader 在训练模式下不会显示底部操作栏内容", async () => {
  mockMatchMedia(false);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} interactionMode="training" />);

  fireEvent.click(screen.getByText("You'll be fine soon."));
  await waitFor(() => {
    assert.equal(screen.queryByRole("button", { name: "看解释" }), null);
    assert.equal(screen.queryByText("先听一句，再自己跟读或复述一遍。"), null);
  });
});

test("LessonReader 在训练模式下切换当前句时，训练条会跟随当前句同步", async () => {
  mockMatchMedia(false);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} interactionMode="training" />);

  const firstSentence = document.querySelector('[data-sentence-id="s-2"]');
  assert.ok(firstSentence instanceof HTMLElement);
  fireEvent.click(firstSentence);

  await waitFor(() => {
    const trainingCard = getTrainingCard();
    assert.equal(trainingCard.dataset.currentTrainingSentence, "You'll be fine soon.");
    assert.equal(screen.queryByRole("button", { name: "看解释" }), null);
  });

  const secondSentence = document.querySelector('[data-sentence-id="s-1"]');
  assert.ok(secondSentence instanceof HTMLElement);
  fireEvent.click(secondSentence);

  await waitFor(() => {
    const trainingCard = getTrainingCard();
    assert.equal(trainingCard.dataset.currentTrainingSentence, "I'm trying to catch up.");
    assert.equal(screen.queryByRole("button", { name: "看解释" }), null);
  });

  assert.ok(firstSentence instanceof HTMLElement);
  fireEvent.click(firstSentence);

  await waitFor(() => {
    const trainingCard = getTrainingCard();
    assert.equal(trainingCard.dataset.currentTrainingSentence, "You'll be fine soon.");
    assert.equal(screen.queryByRole("button", { name: "看解释" }), null);
  });
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

test("LessonReader 移动端训练模式下点击只有一条 chunk 的句子时会默认选中第一条", async () => {
  mockMatchMedia(true);
  const lesson = createDialogueLesson();

  render(<LessonReader lesson={lesson} interactionMode="training" />);

  fireEvent.click(screen.getByText("You'll be fine soon."));

  const dialog = await screen.findByRole("dialog", { name: "学习详情" });
  await waitFor(() => {
    assert.ok(within(dialog).getAllByText("be fine").length >= 1);
    assert.ok(within(dialog).getByText("没问题，会好的"));
  });
});
