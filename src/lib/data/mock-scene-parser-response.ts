import { SceneParserResponse } from "@/lib/types/scene-parser";

const makeRange = (text: string, chunkText: string) => {
  const start = text.toLowerCase().indexOf(chunkText.toLowerCase());
  const safeStart = start >= 0 ? start : 0;
  return { start: safeStart, end: safeStart + chunkText.length };
};

const chunk = (
  sentenceText: string,
  text: string,
  translation: string,
  usageNote: string,
  examples: Array<{ en: string; zh: string }>,
) => {
  const range = makeRange(sentenceText, text);
  return {
    id: text,
    key: text,
    text,
    translation,
    grammarLabel: "Chunk",
    meaningInSentence: `这里可理解为：${translation}`,
    usageNote,
    examples,
    start: range.start,
    end: range.end,
  };
};

export const takeTheMorningOffParserResponse: SceneParserResponse = {
  version: "v1",
  scene: {
    id: "scene-take-the-morning-off",
    slug: "take-the-morning-off",
    title: "Take the Morning Off（早上请半天假）",
    subtitle: "A low-energy morning and practical recovery plan.",
    description: "Dialogue focused on fatigue and practical advice.",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    tags: ["health", "work"],
    type: "dialogue",
    sections: [
      {
        id: "sec-1",
        title: "Morning Check-in",
        summary: "A and B discuss energy and recovery.",
        blocks: [
          {
            id: "blk-1",
            type: "dialogue",
            speaker: "A",
            sentences: [
              {
                id: "s-1",
                text: "You look like you're running on empty this morning.",
                translation: "你今天早上看起来像电量见底。",
                tts: "You look like you're running on empty this morning.",
                chunks: [
                  chunk(
                    "You look like you're running on empty this morning.",
                    "running on empty",
                    "靠最后一口气硬撑",
                    "非常常见的疲惫状态表达。",
                    [
                      { en: "I'm running on empty today.", zh: "我今天全靠硬撑。" },
                      { en: "She was running on empty all week.", zh: "她这周都在硬撑。" },
                    ],
                  ),
                ],
              },
            ],
          },
          {
            id: "blk-2",
            type: "dialogue",
            speaker: "B",
            sentences: [
              {
                id: "s-2",
                text: "I am. I stayed up too late and barely slept.",
                translation: "是啊，我熬太晚了，几乎没睡。",
                tts: "I am. I stayed up too late and barely slept.",
                chunks: [
                  chunk(
                    "I am. I stayed up too late and barely slept.",
                    "stayed up too late",
                    "熬夜太晚",
                    "解释低能量原因。",
                    [
                      { en: "I stayed up too late again.", zh: "我又熬夜太晚。" },
                      { en: "She stayed up too late studying.", zh: "她学习熬夜太晚。" },
                    ],
                  ),
                  chunk(
                    "I am. I stayed up too late and barely slept.",
                    "barely slept",
                    "几乎没睡",
                    "比 slept badly 语气更重。",
                    [
                      { en: "I barely slept last night.", zh: "我昨晚几乎没睡。" },
                      { en: "He barely slept before the exam.", zh: "他考前几乎没睡。" },
                    ],
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
