import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LessonSentence } from "@/lib/types";
import { SentenceBlock } from "./sentence-block";

afterEach(() => {
  cleanup();
});

function createSentence(overrides: Partial<LessonSentence> = {}): LessonSentence {
  return {
    id: overrides.id ?? "sentence-1",
    text: overrides.text ?? "I don't want to burn out.",
    translation: overrides.translation ?? "我不想把自己耗尽。",
    chunks: overrides.chunks ?? ["burn out", "call it a day"],
    speaker: overrides.speaker ?? "A",
    audioText: overrides.audioText ?? "I don't want to burn out.",
    tts: overrides.tts,
    chunkDetails: overrides.chunkDetails,
  };
}

test("SentenceBlock 会处理句子点击、翻译切换和朗读", () => {
  const pronouncedTexts: string[] = [];
  const tappedSentenceIds: string[] = [];

  render(
    <SentenceBlock
      sentence={createSentence()}
      speaking={false}
      activeChunkKey={null}
      hoveredChunkKey={null}
      onPronounce={(text) => pronouncedTexts.push(text)}
      onSelectText={() => undefined}
      onHoverChunk={() => undefined}
      onSentenceTap={(sentenceId) => tappedSentenceIds.push(sentenceId)}
      mobileTapEnabled
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "翻译" }));
  assert.ok(screen.getByText("我不想把自己耗尽。"));

  fireEvent.click(screen.getByRole("button", { name: "收起" }));
  fireEvent.click(screen.getByRole("button", { name: "朗读" }));
  fireEvent.click(screen.getByText("I don't want to burn out."));

  assert.deepEqual(pronouncedTexts, ["I don't want to burn out."]);
  assert.deepEqual(tappedSentenceIds, ["sentence-1"]);
});

test("SentenceBlock 会处理短语 chip 的点击与 hover/focus 交互", () => {
  const selectedPayloads: Array<{
    text: string;
    meta?: {
      mode: "chip";
      sourceSentence: string;
      sourceTranslation?: string;
      sourceChunks?: string[];
      sentenceId: string;
    };
  }> = [];
  const hoveredChunks: Array<string | null> = [];
  const sentence = createSentence();

  render(
    <SentenceBlock
      sentence={sentence}
      speaking={false}
      activeChunkKey="burn out"
      hoveredChunkKey={null}
      onPronounce={() => undefined}
      onSelectText={(text, meta) => selectedPayloads.push({ text, meta })}
      onHoverChunk={(chunkKey) => hoveredChunks.push(chunkKey)}
      onSentenceTap={() => undefined}
      mobileTapEnabled
    />,
  );

  const chipButton = screen.getByRole("button", { name: "call it a day" });
  fireEvent.mouseEnter(chipButton);
  fireEvent.focus(chipButton);
  fireEvent.blur(chipButton);
  fireEvent.mouseLeave(chipButton);
  fireEvent.click(chipButton);

  assert.deepEqual(hoveredChunks, ["call it a day", "call it a day", null, null]);
  assert.deepEqual(selectedPayloads, [
    {
      text: "call it a day",
      meta: {
        mode: "chip",
        sourceSentence: sentence.text,
        sourceTranslation: sentence.translation,
        sourceChunks: sentence.chunks,
        sentenceId: sentence.id,
      },
    },
  ]);
});
