import { AIExplanation, Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { getLessonSentences, normalizeLessonStructure } from "@/lib/shared/lesson-content";

const ex = (en: string, zh: string) => ({ en, zh });

const makeRange = (text: string, target: string) => {
  const start = text.toLowerCase().indexOf(target.toLowerCase());
  const safeStart = start >= 0 ? start : 0;
  return { start: safeStart, end: safeStart + target.length };
};

const buildChunkDetail = (
  sentenceText: string,
  chunkText: string,
  translation: string,
  usageNote: string,
  examples: Array<{ en: string; zh: string }>,
) => {
  const range = makeRange(sentenceText, chunkText);
  return {
    id: chunkText,
    text: chunkText,
    translation,
    grammarLabel: "Chunk",
    meaningInSentence: `这里可理解为：${translation}`,
    usageNote,
    examples,
    start: range.start,
    end: range.end,
  };
};

const monologueScene: Lesson = {
  id: "scene-monologue-reset",
  slug: "getting-back-on-track",
  title: "Getting Back on Track（找回学习状态）",
  subtitle: "A short self-reflection monologue.",
  description: "Build momentum with small, realistic steps.",
  difficulty: "Intermediate",
  estimatedMinutes: 7,
  completionRate: 0,
  tags: ["monologue", "study", "reset"],
  sceneType: "monologue",
  sourceType: "builtin",
  sections: [
    {
      id: "sec-1",
      title: "Self Reflection",
      summary: "From feeling off to restarting.",
      blocks: [
        {
          id: "blk-1",
          kind: "monologue",
          speaker: "A",
          translation: "我昨天睡得很晚，而且一直在刷视频而不是学英语，所以最近状态不太好。",
          tts: "I went to bed pretty late yesterday. I kept watching videos instead of studying English. I haven't really been in a good state lately.",
          sentences: [
            {
              id: "m-1",
              speaker: "A",
              text: "I went to bed pretty late yesterday.",
              translation: "我昨天睡得挺晚的。",
              tts: "I went to bed pretty late yesterday.",
              chunks: ["went to bed pretty late"],
              chunkDetails: [
                buildChunkDetail(
                  "I went to bed pretty late yesterday.",
                  "went to bed pretty late",
                  "睡得挺晚",
                  "很自然地描述前一天作息拖晚了。",
                  [
                    ex("I went to bed pretty late last night.", "我昨晚睡得挺晚。"),
                    ex("He went to bed pretty late after work.", "他下班后睡得挺晚。"),
                  ],
                ),
              ],
            },
            {
              id: "m-2",
              speaker: "A",
              text: "I kept watching videos instead of studying English.",
              translation: "我一直在刷视频，而不是学英语。",
              tts: "I kept watching videos instead of studying English.",
              chunks: ["instead of"],
              chunkDetails: [
                buildChunkDetail(
                  "I kept watching videos instead of studying English.",
                  "instead of",
                  "而不是",
                  "用于对比‘本来该做’与‘实际在做’。",
                  [
                    ex("I slept instead of working.", "我睡觉了而不是工作。"),
                    ex("She walked instead of taking a taxi.", "她走路了而不是打车。"),
                  ],
                ),
              ],
            },
            {
              id: "m-3",
              speaker: "A",
              text: "I haven't really been in a good state lately.",
              translation: "我最近确实不太在状态。",
              tts: "I haven't really been in a good state lately.",
              chunks: ["in a good state", "lately"],
              chunkDetails: [
                buildChunkDetail(
                  "I haven't really been in a good state lately.",
                  "in a good state",
                  "状态不错",
                  "常用于学习/工作状态描述。",
                  [
                    ex("I'm not in a good state today.", "我今天状态不太好。"),
                    ex("She is finally in a good state again.", "她终于又回到好状态了。"),
                  ],
                ),
                buildChunkDetail(
                  "I haven't really been in a good state lately.",
                  "lately",
                  "最近",
                  "常搭配现在完成时。",
                  [
                    ex("I've been really busy lately.", "我最近一直很忙。"),
                    ex("He looks tired lately.", "他最近看起来很累。"),
                  ],
                ),
              ],
            },
          ],
        },
        {
          id: "blk-2",
          kind: "monologue",
          speaker: "A",
          translation: "前几周我回老家过年，一直挺忙的。",
          tts: "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
          sentences: [
            {
              id: "m-4",
              speaker: "A",
              text: "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
              translation: "前几周我回老家过春节了，所以一直挺忙的。",
              tts: "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
              chunks: ["over the past couple of weeks", "went back to my hometown", "quite busy"],
              chunkDetails: [
                buildChunkDetail(
                  "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
                  "over the past couple of weeks",
                  "在过去这几周里",
                  "用于交代最近一段时间的背景，很适合 monologue 开场补充上下文。",
                  [
                    ex("Over the past couple of weeks, work has been intense.", "过去这几周工作一直很忙。"),
                    ex("Over the past couple of weeks, I've been traveling a lot.", "过去这几周我经常在外奔波。"),
                  ],
                ),
                buildChunkDetail(
                  "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
                  "went back to my hometown",
                  "回老家了",
                  "自然表达回家乡、回老家。",
                  [
                    ex("I went back to my hometown during the holiday.", "假期我回老家了。"),
                    ex("She wants to go back to her hometown next month.", "她下个月想回老家。"),
                  ],
                ),
                buildChunkDetail(
                  "Over the past couple of weeks, I went back to my hometown for the Chinese New Year, so I've been quite busy.",
                  "quite busy",
                  "挺忙的",
                  "比 very busy 口气更自然、更日常。",
                  [
                    ex("I've been quite busy these days.", "我这几天挺忙的。"),
                    ex("Things have been quite busy at work.", "最近工作上一直挺忙。"),
                  ],
                ),
              ],
            },
          ],
        },
        {
          id: "blk-3",
          kind: "monologue",
          speaker: "A",
          translation: "但我希望能从今天开始，慢慢回到正轨。",
          tts: "But I hope I can slowly get back on track starting today.",
          sentences: [
            {
              id: "m-5",
              speaker: "A",
              text: "But I hope I can slowly get back on track starting today.",
              translation: "但我希望能从今天开始，慢慢回到正轨。",
              tts: "But I hope I can slowly get back on track starting today.",
              chunks: ["get back on track"],
              chunkDetails: [
                buildChunkDetail(
                  "But I hope I can slowly get back on track starting today.",
                  "get back on track",
                  "回到正轨",
                  "用于从低状态恢复节奏。",
                  [
                    ex("I need to get back on track this week.", "我这周得回到正轨。"),
                    ex("Let's get back on track tomorrow.", "我们明天回到节奏。"),
                  ],
                ),
              ],
            },
          ],
        },
      ],
    },
  ],
  explanations: [],
};

export const lessons: Lesson[] = [
  normalizeLessonStructure(monologueScene),
];

export const scenes = lessons;

const explanationSeed: AIExplanation[] = [
  {
    key: "instead of",
    text: "instead of",
    translation: "而不是",
    explanation: "用于替代关系表达。",
    examples: ["I slept instead of working.", "She walked instead of taking a taxi."],
    exampleTranslations: ["我睡觉了而不是工作。", "她走路了而不是打车。"],
    breakdown: ["替代", "高频"],
    pronunciation: "/ɪnˈsted əv/",
    grammarLabel: "Chunk",
  },
];

for (const lesson of lessons) {
  if (lesson.explanations.length === 0) {
    lesson.explanations = explanationSeed;
  }
}

export const getLessonBySlug = (slug: string) => lessons.find((lesson) => lesson.slug === slug);
export const getSceneBySlug = (slug: string) => getLessonBySlug(slug);

export const getSentenceById = (lesson: Lesson, sentenceId: string) =>
  getLessonSentences(lesson).find((sentence) => sentence.id === sentenceId);

export const getFirstSentence = (lesson: Lesson): LessonSentence | undefined =>
  getLessonSentences(lesson)[0];

export const findMatchingChunkInSentence = (sentence: LessonSentence, selectedText: string) => {
  const selected = selectedText.trim().toLowerCase();
  if (!selected) return undefined;
  return sentence.chunks.find((chunk) => chunk.toLowerCase() === selected);
};

const toChunkLayer = (
  explanation: AIExplanation | undefined,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  if (explanation) {
    return {
      text: chunkText,
      translation: explanation.translation,
      grammarLabel: explanation.grammarLabel,
      pronunciation: explanation.pronunciation,
      meaningInSentence: `这里可以理解为：${sentence.translation ?? ""}`,
      usageNote: "建议先理解这个 chunk 在当前句中的作用，再迁移到自己的表达里。",
      examples: explanation.examples.slice(0, 2).map((en, index) => ({
        en,
        zh: explanation.exampleTranslations[index] ?? "",
      })),
      notes: explanation.breakdown,
    };
  }

  return {
    text: chunkText,
    translation: "常用表达",
    meaningInSentence: "这里是句子中的核心语义单元。",
    usageNote: "先记 chunk，再放回整句复述。",
    examples: [
      ex(`Try using "${chunkText}" in your own sentence.`, `试着在自己的句子里用“${chunkText}”。`),
      ex(`I saved "${chunkText}" for review.`, `我把“${chunkText}”加入复习了。`),
    ],
    notes: ["优先记忆“chunk + 整句”组合"],
  };
};

export const getChunkLayerFromLesson = (
  lesson: Lesson,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  const localChunk = sentence.chunkDetails?.find(
    (item) => item.text.toLowerCase() === chunkText.toLowerCase(),
  );
  if (localChunk) {
    return {
      text: localChunk.text,
      translation: localChunk.translation,
      grammarLabel: localChunk.grammarLabel,
      pronunciation: localChunk.pronunciation,
      meaningInSentence: localChunk.meaningInSentence,
      usageNote: localChunk.usageNote,
      examples: (localChunk.examples ?? []).slice(0, 2),
      notes: localChunk.notes ?? [],
    };
  }

  const explanation = lesson.explanations.find(
    (item) => item.key.toLowerCase() === chunkText.toLowerCase(),
  );
  return toChunkLayer(explanation, sentence, chunkText);
};
