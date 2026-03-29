import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { SelectionDetailSheet } from "./selection-detail-sheet";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window as typeof globalThis & Window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function createSentence(overrides: Partial<LessonSentence> = {}): LessonSentence {
  return {
    id: overrides.id ?? "sentence-1",
    text: overrides.text ?? "I don't want to burn out.",
    translation: overrides.translation ?? "我不想把自己耗尽。",
    chunks: overrides.chunks ?? ["burn out", "call it a day"],
    speaker: overrides.speaker,
    audioText: overrides.audioText,
    tts: overrides.tts,
    chunkDetails: overrides.chunkDetails,
  };
}

function createChunkDetail(overrides: Partial<SelectionChunkLayer> = {}): SelectionChunkLayer {
  return {
    text: overrides.text ?? "burn out",
    translation: overrides.translation ?? "精疲力尽",
    grammarLabel: overrides.grammarLabel ?? "verb phrase",
    pronunciation: overrides.pronunciation,
    meaningInSentence: overrides.meaningInSentence ?? "used up all your energy",
    usageNote: overrides.usageNote ?? "remember the feeling",
    examples: overrides.examples ?? [
      { en: "You'll burn out if you never rest.", zh: "" },
      { en: "I almost burned out last year.", zh: "我去年差点撑不住了。" },
      { en: "This third example should stay hidden.", zh: "第三条例句不应显示。" },
    ],
    notes: overrides.notes,
  };
}

test("SelectionDetailSheet 会处理 block 朗读和相关短语交互", () => {
  const blockSpeakCalls: string[] = [];
  const selectedChunks: string[] = [];
  const hoveredChunks: Array<string | null> = [];
  const currentSentence = createSentence();

  const view = render(
    <SelectionDetailSheet
      currentBlock={{
        id: "block-1",
        sentences: [
          currentSentence,
          createSentence({
            id: "sentence-2",
            text: "Let's call it a day.",
            translation: "今天先到这里吧。",
          }),
        ],
        translation: "我不想把自己耗尽。今天先到这里吧。",
      }}
      currentSentence={currentSentence}
      chunkDetail={createChunkDetail()}
      relatedChunks={["burn out", "call it a day"]}
      open
      loading={false}
      speakingText={null}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onPronounceBlock={() => blockSpeakCalls.push("I don't want to burn out. Let's call it a day.")}
      onSelectRelated={(chunk) => selectedChunks.push(chunk)}
      hoveredChunkKey={null}
      onHoverChunk={(chunkKey) => hoveredChunks.push(chunkKey)}
      playingChunkKey={null}
    />,
  );

  view.getByText("当前句子");
  fireEvent.click(view.getByRole("button", { name: "翻译" }));
  assert.ok(view.getByRole("button", { name: "收起" }));
  fireEvent.click(view.getByRole("button", { name: "朗读" }));

  const relatedButton = view.getByRole("button", { name: "call it a day" });
  fireEvent.mouseEnter(relatedButton);
  fireEvent.focus(relatedButton);
  fireEvent.blur(relatedButton);
  fireEvent.mouseLeave(relatedButton);
  fireEvent.click(relatedButton);

  assert.deepEqual(blockSpeakCalls, ["I don't want to burn out. Let's call it a day."]);
  assert.deepEqual(hoveredChunks, ["call it a day", "call it a day", null, null]);
  assert.deepEqual(selectedChunks, ["call it a day"]);
});

test("SelectionDetailSheet 会限制例句数量，并处理例句朗读", () => {
  const pronouncedTexts: string[] = [];

  const view = render(
    <SelectionDetailSheet
      currentSentence={createSentence()}
      chunkDetail={createChunkDetail()}
      relatedChunks={[]}
      open
      loading={false}
      speakingText={null}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={(text) => pronouncedTexts.push(text)}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
      showSentenceSection={false}
    />,
  );

  const chunkSection = view.getByText("短语详情").closest("section");
  assert.ok(chunkSection);
  assert.equal(view.queryByText("This third example should stay hidden."), null);

  const exampleSpeakButtons = within(chunkSection).getAllByRole("button", { name: "朗读例句" });
  fireEvent.click(exampleSpeakButtons[0]);

  assert.deepEqual(pronouncedTexts, ["You'll burn out if you never rest."]);
});

test("SelectionDetailSheet 在空态下会隐藏句子区并禁用底部动作", () => {
  let saveCount = 0;
  let reviewCount = 0;

  const view = render(
    <SelectionDetailSheet
      currentSentence={null}
      chunkDetail={null}
      relatedChunks={[]}
      open
      loading={false}
      speakingText={null}
      onOpenChange={() => undefined}
      onSave={() => {
        saveCount += 1;
      }}
      onReview={() => {
        reviewCount += 1;
      }}
      onPronounce={() => undefined}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
      showSentenceSection={false}
    />,
  );

  assert.equal(view.queryByText("当前句子"), null);

  const saveButton = view.getByRole("button", { name: "收藏短语" });
  const reviewButton = view.getByRole("button", { name: "加入复习" });

  assert.equal(saveButton.hasAttribute("disabled"), true);
  assert.equal(reviewButton.hasAttribute("disabled"), true);

  fireEvent.click(saveButton);
  fireEvent.click(reviewButton);

  assert.equal(saveCount, 0);
  assert.equal(reviewCount, 0);
});

test("SelectionDetailSheet 可隐藏相关短语播放按钮和详情头部", () => {
  const view = render(
    <SelectionDetailSheet
      currentSentence={createSentence()}
      chunkDetail={createChunkDetail()}
      relatedChunks={["burn out", "call it a day"]}
      open
      loading={false}
      speakingText={null}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
      showSentenceSection={false}
      showRelatedChunkAudio={false}
    />,
  );

  assert.equal(view.queryByRole("button", { name: "朗读 burn out" }), null);
  assert.equal(view.queryByRole("button", { name: "朗读 call it a day" }), null);
  const detailSection = view.getByText("短语详情").closest("section");
  assert.ok(detailSection);
  assert.equal(within(detailSection).queryByText("burn out"), null);
});
