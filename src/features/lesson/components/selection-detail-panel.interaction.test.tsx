import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { SelectionDetailPanel } from "./selection-detail-panel";

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

test("SelectionDetailPanel 会处理句子切换、句子朗读和相关短语交互", () => {
  const pronouncedTexts: string[] = [];
  const selectedChunks: string[] = [];
  const hoveredChunks: Array<string | null> = [];
  const selectedSentenceIds: string[] = [];
  const currentSentence = createSentence();
  const otherSentence = createSentence({
    id: "sentence-2",
    text: "Let's call it a day.",
    translation: "今天先到这里吧。",
  });

  render(
    <SelectionDetailPanel
      currentSentence={currentSentence}
      blockSentences={[currentSentence, otherSentence]}
      chunkDetail={createChunkDetail()}
      relatedChunks={["burn out", "call it a day"]}
      loading={false}
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={(text) => pronouncedTexts.push(text)}
      onSelectRelated={(chunk) => selectedChunks.push(chunk)}
      hoveredChunkKey={null}
      onHoverChunk={(chunkKey) => hoveredChunks.push(chunkKey)}
      playingChunkKey={null}
      onSelectSentence={(sentenceId) => selectedSentenceIds.push(sentenceId)}
    />,
  );

  assert.ok(screen.getByText("整句翻译"));
  assert.ok(screen.getByText("I don't want to"));
  assert.equal(document.querySelector("mark")?.textContent, "burn out");

  fireEvent.click(screen.getByRole("button", { name: "句子2" }));
  fireEvent.click(screen.getAllByRole("button", { name: "朗读" })[0]);

  const relatedButton = screen.getByRole("button", { name: "call it a day" });
  fireEvent.mouseEnter(relatedButton);
  fireEvent.focus(relatedButton);
  fireEvent.blur(relatedButton);
  fireEvent.mouseLeave(relatedButton);
  fireEvent.click(relatedButton);

  assert.deepEqual(selectedSentenceIds, ["sentence-2"]);
  assert.deepEqual(pronouncedTexts, ["I don't want to burn out."]);
  assert.deepEqual(hoveredChunks, ["call it a day", "call it a day", null, null]);
  assert.deepEqual(selectedChunks, ["call it a day"]);
});

test("SelectionDetailPanel 会处理短语详情 fallback、例句翻译和底部动作", () => {
  const pronouncedTexts: string[] = [];
  let saveCount = 0;
  let reviewCount = 0;

  render(
    <SelectionDetailPanel
      currentSentence={createSentence()}
      blockSentences={[]}
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
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.ok(screen.getByText("这里表示：精疲力尽"));
  assert.ok(screen.getByText("先理解它在这句话里的作用，再放回整句复述。"));
  assert.equal(screen.queryByText("This third example should stay hidden."), null);
  assert.ok(screen.getByRole("button", { name: "已收藏" }));

  fireEvent.click(screen.getAllByRole("button", { name: "朗读" })[1]);
  const exampleTranslateButtons = screen.getAllByRole("button", { name: "翻译" });
  fireEvent.click(exampleTranslateButtons[0]);
  assert.ok(screen.getByRole("button", { name: "收起" }));
  assert.ok(screen.getByText("该例句翻译待补充。"));

  const exampleSpeakButtons = screen.getAllByRole("button", { name: "朗读例句" });
  fireEvent.click(exampleSpeakButtons[0]);
  fireEvent.click(screen.getByRole("button", { name: "已收藏" }));
  fireEvent.click(screen.getByRole("button", { name: "加入复习" }));

  assert.deepEqual(pronouncedTexts, ["burn out", "You'll burn out if you never rest."]);
  assert.equal(saveCount, 1);
  assert.equal(reviewCount, 1);
});

test("SelectionDetailPanel 会处理加载态与空态", () => {
  const { rerender } = render(
    <SelectionDetailPanel
      currentSentence={createSentence()}
      blockSentences={[]}
      chunkDetail={createChunkDetail()}
      relatedChunks={["burn out"]}
      loading
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.equal(document.querySelectorAll(".animate-pulse").length >= 2, true);

  rerender(
    <SelectionDetailPanel
      currentSentence={null}
      blockSentences={[]}
      chunkDetail={null}
      relatedChunks={[]}
      loading={false}
      speakingText={null}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
      onSelectRelated={() => undefined}
      hoveredChunkKey={null}
      onHoverChunk={() => undefined}
      playingChunkKey={null}
    />,
  );

  assert.ok(screen.getByText("先选择一句内容，查看整句理解。"));
  assert.ok(screen.getByText("当前句暂无可用短语。"));
  assert.ok(screen.getByText("点击下方短语查看解析与例句。"));
});
