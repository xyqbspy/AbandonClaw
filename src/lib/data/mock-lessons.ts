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

const dialogueScene: Lesson = {
  id: "scene-dialogue-quick-dinner",
  slug: "quick-dinner-after-work",
  title: "Quick Dinner After Work（下班后快吃一口）",
  subtitle: "A practical after-work chat.",
  description: "Use familiar chunks in a realistic dialogue.",
  difficulty: "Intermediate",
  estimatedMinutes: 8,
  completionRate: 0,
  tags: ["dialogue", "work", "daily"],
  sceneType: "dialogue",
  sourceType: "builtin",
  sections: [
    {
      id: "sec-1",
      title: "After Work",
      summary: "A and B decide what to eat.",
      blocks: [
        {
          id: "blk-1",
          kind: "dialogue",
          speaker: "A",
          translation: "今天也很累吧？",
          tts: "Long day today?",
          sentences: [
            {
              id: "d-1",
              speaker: "A",
              text: "Long day today?",
              translation: "今天也很累吧？",
              tts: "Long day today?",
              chunks: ["long day"],
              chunkDetails: [
                buildChunkDetail(
                  "Long day today?",
                  "Long day",
                  "漫长又疲惫的一天",
                  "很适合下班时快速共情开场。",
                  [
                    ex("Yeah, it's been a long day.", "是啊，今天挺累的。"),
                    ex("I had a really long day at work.", "我今天上班特别累。"),
                  ],
                ),
              ],
            },
          ],
        },
        {
          id: "blk-2",
          kind: "dialogue",
          speaker: "B",
          translation: "是啊，我又加班到很晚。",
          tts: "Yeah, I stayed late again.",
          sentences: [
            {
              id: "d-2",
              speaker: "B",
              text: "Yeah, I stayed late again.",
              translation: "是啊，我又加班到很晚。",
              tts: "Yeah, I stayed late again.",
              chunks: ["stayed late"],
              chunkDetails: [
                buildChunkDetail(
                  "Yeah, I stayed late again.",
                  "stayed late",
                  "加班到很晚",
                  "常见工作语境表达。",
                  [
                    ex("I had to stay late yesterday.", "我昨天不得不加班到很晚。"),
                    ex("She stayed late to finish the report.", "她为了完成报告加班到很晚。"),
                  ],
                ),
              ],
            },
          ],
        },
        {
          id: "blk-3",
          kind: "dialogue",
          speaker: "A",
          translation: "要不要随便吃点快的？",
          tts: "Want to grab something quick to eat?",
          sentences: [
            {
              id: "d-3",
              speaker: "A",
              text: "Want to grab something quick to eat?",
              translation: "要不要随便吃点快的？",
              tts: "Want to grab something quick to eat?",
              chunks: ["grab something quick"],
              chunkDetails: [
                buildChunkDetail(
                  "Want to grab something quick to eat?",
                  "grab something quick",
                  "随便快速吃点",
                  "下班后非常实用的提议表达。",
                  [
                    ex("Let's grab something quick.", "我们随便吃点吧。"),
                    ex("I just need something quick to eat.", "我就想赶紧吃点东西。"),
                  ],
                ),
              ],
            },
          ],
        },
        {
          id: "blk-4",
          kind: "dialogue",
          speaker: "B",
          translation: "很好，今晚就简单点。",
          tts: "Perfect. Let's keep it simple tonight.",
          sentences: [
            {
              id: "d-4",
              speaker: "B",
              text: "Perfect. Let's keep it simple tonight.",
              translation: "很好，今晚就简单点。",
              tts: "Perfect. Let's keep it simple tonight.",
              chunks: ["keep it simple"],
              chunkDetails: [
                buildChunkDetail(
                  "Perfect. Let's keep it simple tonight.",
                  "keep it simple",
                  "保持简单，别复杂化",
                  "疲惫场景下很常见的收口表达。",
                  [
                    ex("Let's keep it simple.", "我们就简单点。"),
                    ex("Keep it simple and move on.", "简单处理然后继续推进。"),
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
          translation: "我一直在刷视频而不是学英语，所以最近状态不太好。",
          tts: "I kept watching videos instead of studying English. I haven't been in a good state lately.",
          sentences: [
            {
              id: "m-1",
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
              id: "m-2",
              speaker: "A",
              text: "I haven't been in a good state lately.",
              translation: "我最近状态不太好。",
              tts: "I haven't been in a good state lately.",
              chunks: ["in a good state", "lately"],
              chunkDetails: [
                buildChunkDetail(
                  "I haven't been in a good state lately.",
                  "in a good state",
                  "状态不错",
                  "常用于学习/工作状态描述。",
                  [
                    ex("I'm not in a good state today.", "我今天状态不太好。"),
                    ex("She is finally in a good state again.", "她终于又回到好状态了。"),
                  ],
                ),
                buildChunkDetail(
                  "I haven't been in a good state lately.",
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
          translation: "但我可以从今天开始，慢慢回到正轨。",
          tts: "But I can slowly get back on track starting today.",
          sentences: [
            {
              id: "m-3",
              speaker: "A",
              text: "But I can slowly get back on track starting today.",
              translation: "但我可以从今天开始慢慢回到正轨。",
              tts: "But I can slowly get back on track starting today.",
              chunks: ["get back on track"],
              chunkDetails: [
                buildChunkDetail(
                  "But I can slowly get back on track starting today.",
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
  normalizeLessonStructure(dialogueScene),
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
