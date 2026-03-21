import assert from "node:assert/strict";
import test from "node:test";
import {
  groupSentencesForMobile,
  interactionReducer,
  InteractionState,
} from "./lesson-reader-logic";
import { LessonSentence } from "@/lib/types";

const createSentence = (overrides: Partial<LessonSentence> = {}): LessonSentence => ({
  id: overrides.id ?? "sentence-1",
  text: overrides.text ?? "We should call it a day.",
  translation: overrides.translation ?? "我们今天先到这里。",
  chunks: overrides.chunks ?? [],
  speaker: overrides.speaker,
  audioText: overrides.audioText,
  tts: overrides.tts,
  chunkDetails: overrides.chunkDetails,
});

test("groupSentencesForMobile 会把短句问答配成一组", () => {
  const groups = groupSentencesForMobile([
    createSentence({ id: "s1", text: "Are you coming?" }),
    createSentence({ id: "s2", text: "Yes, in a minute." }),
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].map((sentence) => sentence.id),
    ["s1", "s2"],
  );
});

test("groupSentencesForMobile 遇到说话人标签时会拆成单句组", () => {
  const groups = groupSentencesForMobile([
    createSentence({ id: "s1", text: "Morning.", speaker: "A" }),
    createSentence({ id: "s2", text: "Morning.", speaker: "B" }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.map((sentence) => sentence.id)),
    [["s1"], ["s2"]],
  );
});

test("groupSentencesForMobile 遇到超长句时不会合并下一句", () => {
  const groups = groupSentencesForMobile([
    createSentence({
      id: "s1",
      text: "This is a very long sentence that should stay alone because it clearly exceeds the mobile grouping threshold by a comfortable margin.",
    }),
    createSentence({ id: "s2", text: "Short follow-up." }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.map((sentence) => sentence.id)),
    [["s1"], ["s2"]],
  );
});

test("interactionReducer 在句子选中和 chunk 激活时会正确清理互斥状态", () => {
  const initialState: InteractionState = {
    activeSentenceId: "s1",
    activeChunkKey: "chunk-1",
    hoveredChunkKey: "chunk-2",
    selectionState: null,
  };

  const selectedState = interactionReducer(initialState, {
    type: "SENTENCE_SELECTED_FROM_SELECTION",
    payload: {
      text: "call it a day",
      sentenceId: "s2",
      top: 10,
      left: 20,
    },
  });

  assert.deepEqual(selectedState, {
    activeSentenceId: "s2",
    activeChunkKey: null,
    hoveredChunkKey: null,
    selectionState: {
      text: "call it a day",
      sentenceId: "s2",
      top: 10,
      left: 20,
    },
  });

  const chunkState = interactionReducer(selectedState, {
    type: "CHUNK_ACTIVATED",
    payload: { sentenceId: "s3", chunkKey: "chunk-3" },
  });

  assert.deepEqual(chunkState, {
    activeSentenceId: "s3",
    activeChunkKey: "chunk-3",
    hoveredChunkKey: null,
    selectionState: null,
  });
});

test("interactionReducer 支持清空选区和 hover 更新", () => {
  const initialState: InteractionState = {
    activeSentenceId: "s1",
    activeChunkKey: null,
    hoveredChunkKey: "chunk-1",
    selectionState: {
      text: "burn out",
      sentenceId: "s1",
      top: 8,
      left: 16,
    },
  };

  const cleared = interactionReducer(initialState, { type: "SELECTION_CLEARED" });
  assert.equal(cleared.selectionState, null);
  assert.equal(cleared.hoveredChunkKey, "chunk-1");

  const hovered = interactionReducer(cleared, {
    type: "CHUNK_HOVERED",
    payload: { chunkKey: "chunk-9" },
  });
  assert.equal(hovered.hoveredChunkKey, "chunk-9");
});
