import { ExplainSelectionRequest, SelectionExplainResponse } from "@/lib/types";

const normalize = (text: string) => text.trim().toLowerCase();

const uniqueChunks = (chunks: string[], selectedText: string) => {
  const lowerSelected = normalize(selectedText);
  const result: string[] = [];
  for (const chunk of chunks) {
    const value = chunk.trim();
    if (!value) continue;
    if (normalize(value) === lowerSelected) continue;
    if (!result.includes(value)) result.push(value);
  }
  return result.slice(0, 4);
};

export function explainWithMock(
  payload: ExplainSelectionRequest,
): SelectionExplainResponse {
  const selected = payload.selectedText.trim();
  const key = normalize(selected);
  const relatedChunks = uniqueChunks(payload.sourceChunks ?? [], selected);

  const sentenceLayer = {
    text: payload.sourceSentence,
    translation:
      payload.sourceTranslation?.trim() ||
      "该句描述了一个日常场景中动作先后的关系。",
    ttsText: payload.sourceSentence,
  };

  if (key.includes("as soon as")) {
    return {
      sentence: sentenceLayer,
      chunk: {
        text: selected,
        translation: "一……就……",
        pronunciation: "/əz suːn əz/",
        meaningInSentence: "这里表示“闹钟一响，就立刻起床”。",
        usageNote:
          "用于连接两个动作，强调后一个动作紧接前一个动作发生。常用于口语和叙事表达。",
        examples: [
          "Call me as soon as you arrive.",
          "She left the office as soon as the meeting ended.",
        ],
        notes: ["将来语境中从句常用一般现在时"],
      },
      relatedChunks,
    };
  }

  if (key.includes("used to")) {
    return {
      sentence: sentenceLayer,
      chunk: {
        text: selected,
        translation: "过去常常（现在不再）",
        pronunciation: "/juːst tə/",
        meaningInSentence: "这里强调“以前常按贪睡键”，但现在已经改变。",
        usageNote:
          "表示过去习惯或状态，暗含现在不同。后面通常接动词原形。",
        examples: [
          "I used to work late every night.",
          "They used to live near the river.",
        ],
        notes: ["不用于只发生一次的过去事件"],
      },
      relatedChunks,
    };
  }

  return {
    sentence: sentenceLayer,
    chunk: {
      text: selected,
      translation: `“${selected}”在该语境下的常见释义`,
      meaningInSentence: "在这句话里，它用于强调句子中的关键语义关系。",
      usageNote:
        "建议优先记忆“短语 + 完整句子”。先理解它在当前句子里承担的作用，再迁移到自己的表达中。",
      examples: [
        `I saved "${selected}" as a useful phrase.`,
        `Try using "${selected}" in your next sentence.`,
      ],
      notes: ["加入复习后建议 24 小时内回看一次"],
    },
    relatedChunks,
  };
}
