import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { SelectionDetailSheet } from "./selection-detail-sheet";

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

  render(
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

  const sentenceSection = screen.getByText("当前句子").closest("section");
  assert.ok(sentenceSection);

  fireEvent.click(within(sentenceSection).getByRole("button", { name: "翻译" }));
  assert.ok(within(sentenceSection).getByRole("button", { name: "收起" }));

  fireEvent.click(within(sentenceSection).getByRole("button", { name: "朗读" }));

  const relatedButton = within(sentenceSection).getByRole("button", { name: "call it a day" });
  fireEvent.mouseEnter(relatedButton);
  fireEvent.focus(relatedButton);
  fireEvent.blur(relatedButton);
  fireEvent.mouseLeave(relatedButton);
  fireEvent.click(relatedButton);

  assert.deepEqual(blockSpeakCalls, ["I don't want to burn out. Let's call it a day."]);
  assert.deepEqual(hoveredChunks, ["call it a day", "call it a day", null, null]);
  assert.deepEqual(selectedChunks, ["call it a day"]);
});

test("SelectionDetailSheet 会限制例句数量，并处理翻译展开与例句朗读", () => {
  const pronouncedTexts: string[] = [];

  render(
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

  const chunkSection = screen.getByText("短语解析").closest("section");
  assert.ok(chunkSection);
  assert.equal(screen.queryByText("This third example should stay hidden."), null);

  fireEvent.click(within(chunkSection).getByRole("button", { name: "朗读" }));
  const exampleTranslateButtons = within(chunkSection).getAllByRole("button", { name: "翻译" });
  fireEvent.click(exampleTranslateButtons[0]);
  assert.ok(within(chunkSection).getByRole("button", { name: "收起" }));

  const exampleSpeakButtons = within(chunkSection).getAllByRole("button", { name: "朗读例句" });
  fireEvent.click(exampleSpeakButtons[0]);

  assert.deepEqual(pronouncedTexts, ["burn out", "You'll burn out if you never rest."]);
});

test("SelectionDetailSheet 在空态下会隐藏句子区并禁用底部动作", () => {
  let saveCount = 0;
  let reviewCount = 0;

  render(
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

  assert.equal(screen.queryByText("当前句子"), null);

  const saveButton = screen.getByRole("button", { name: "收藏短语" });
  const reviewButton = screen.getByRole("button", { name: "加入复习" });

  assert.equal(saveButton.hasAttribute("disabled"), true);
  assert.equal(reviewButton.hasAttribute("disabled"), true);

  fireEvent.click(saveButton);
  fireEvent.click(reviewButton);

  assert.equal(saveCount, 0);
  assert.equal(reviewCount, 0);
});
