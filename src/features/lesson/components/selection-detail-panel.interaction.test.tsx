import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { SelectionDetailPanel } from "./selection-detail-panel";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window as unknown as typeof globalThis & Window;
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

test("SelectionDetailPanel 会处理 block 朗读和相关短语交互", () => {
  const pronouncedTexts: string[] = [];
  const blockSpeakCalls: string[] = [];
  const selectedChunks: string[] = [];
  const hoveredChunks: Array<string | null> = [];
  const currentSentence = createSentence();

  const view = render(
    <SelectionDetailPanel
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
      loading={false}
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={(text) => pronouncedTexts.push(text)}
      onPronounceBlock={() => blockSpeakCalls.push("I don't want to burn out. Let's call it a day.")}
      onSelectRelated={(chunk) => selectedChunks.push(chunk)}
      hoveredChunkKey={null}
      onHoverChunk={(chunkKey) => hoveredChunks.push(chunkKey)}
      playingChunkKey={null}
    />,
  );

  assert.ok(view.getByText("我不想把自己耗尽。今天先到这里吧。"));
  const sentenceSection = view.getByText("当前句子").closest("section");
  assert.ok(sentenceSection);
  fireEvent.click(within(sentenceSection).getByRole("button", { name: "朗读" }));

  const relatedButton = view.getByRole("button", { name: "call it a day" });
  fireEvent.mouseEnter(relatedButton);
  fireEvent.focus(relatedButton);
  fireEvent.blur(relatedButton);
  fireEvent.mouseLeave(relatedButton);
  fireEvent.click(relatedButton);

  assert.deepEqual(pronouncedTexts, []);
  assert.deepEqual(blockSpeakCalls, ["I don't want to burn out. Let's call it a day."]);
  assert.deepEqual(hoveredChunks, ["call it a day", "call it a day", null, null]);
  assert.deepEqual(selectedChunks, ["call it a day"]);
  assert.equal(view.queryByRole("button", { name: "翻译" }), null);
});

test("SelectionDetailPanel 会限制例句数量，并处理底部动作与例句交互", () => {
  const pronouncedTexts: string[] = [];
  let saveCount = 0;
  let reviewCount = 0;

  const view = render(
    <SelectionDetailPanel
      currentSentence={createSentence()}
      chunkDetail={createChunkDetail()}
      relatedChunks={[]}
      loading={false}
      speakingText={null}
      onSave={() => {
        saveCount += 1;
      }}
      onReview={() => {
        reviewCount += 1;
      }}
      saved
      onPronounce={(text) => pronouncedTexts.push(text)}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.equal(view.queryByText("This third example should stay hidden."), null);
  assert.ok(view.getByRole("button", { name: "已收藏" }));
  const detailSection = view.getByText("短语详情").closest("section");
  assert.ok(detailSection);
  const exampleSpeakButtons = within(detailSection).getAllByRole("button", { name: "朗读" });
  fireEvent.click(exampleSpeakButtons[0]);
  fireEvent.click(view.getByRole("button", { name: "已收藏" }));
  fireEvent.click(view.getByRole("button", { name: "加入复习" }));

  assert.deepEqual(pronouncedTexts, ["You'll burn out if you never rest."]);
  assert.equal(saveCount, 1);
  assert.equal(reviewCount, 1);
});

test("SelectionDetailPanel 会处理加载态与空态", () => {
  const view = render(
    <SelectionDetailPanel
      currentSentence={createSentence()}
      chunkDetail={createChunkDetail()}
      relatedChunks={["burn out"]}
      loading
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.equal(document.querySelectorAll(".animate-pulse").length >= 2, true);

  view.rerender(
    <SelectionDetailPanel
      currentSentence={null}
      chunkDetail={null}
      relatedChunks={[]}
      loading={false}
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.equal(view.getAllByText(/点击下方短语查看解析与例句/).length >= 1, true);
  assert.equal(view.queryAllByRole("button", { name: "朗读" }).length, 0);
});
test("SelectionDetailPanel 的保存与加入复习按钮使用最新样式", () => {
  const view = render(
    <SelectionDetailPanel
      currentSentence={createSentence()}
      chunkDetail={createChunkDetail()}
      relatedChunks={[]}
      loading={false}
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onPronounceBlock={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
      saved
    />,
  );

  const actionBar = view.container.querySelector("div.grid.grid-cols-2");
  assert.ok(actionBar);
  const [saveButton, reviewButton] = Array.from(actionBar.querySelectorAll("button"));

  assert.ok(saveButton);
  assert.ok(reviewButton);
  assert.ok(saveButton.className.includes("app-button-secondary"));
  assert.ok(reviewButton.className.includes("app-button-primary"));
  assert.ok(reviewButton.textContent?.includes("📝"));
});
