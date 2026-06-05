import { getLessonSentences } from "@/lib/shared/lesson-content";
import { PRACTICE_MODE_LABELS, SCENE_PRACTICE_STAGE_TITLE } from "@/lib/shared/scene-training-copy";
import type { Lesson, LessonSentence } from "@/lib/types";
import type { PracticeModule, PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import type { PracticeExercise } from "@/lib/types/scene-parser";

const TRIAL_FIXED_CREATED_AT = "2026-01-01T00:00:00.000Z";

const toKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";

const getTrialSceneId = (lesson: Lesson) => `trial-scene-${toKey(lesson.slug || lesson.id)}`;

const getSentenceChunk = (sentence: LessonSentence) => {
  const explicitChunk = sentence.chunks.find((chunk) => chunk.trim());
  if (explicitChunk) return explicitChunk.trim();
  return sentence.text.split(/\s+/).filter(Boolean).slice(0, 3).join(" ").trim();
};

const buildClozeText = (sentenceText: string, chunk: string) => {
  const source = sentenceText.trim();
  const target = chunk.trim();
  if (!source || !target) return "____";
  const index = source.toLowerCase().indexOf(target.toLowerCase());
  if (index < 0) return `${source} ____`;
  return `${source.slice(0, index)}____${source.slice(index + target.length)}`;
};

const buildTrialClozeExercises = (lesson: Lesson): PracticeExercise[] => {
  const trialSceneId = getTrialSceneId(lesson);
  return getLessonSentences(lesson)
    .map((sentence, index) => {
      const chunk = getSentenceChunk(sentence);
      if (!chunk) return null;
      const chunkKey = toKey(chunk);
      return {
        id: `trial-cloze-${toKey(sentence.id || `${index + 1}`)}-${chunkKey}`,
        type: "chunk_cloze",
        inputMode: "typing",
        sceneId: trialSceneId,
        sentenceId: sentence.id || `trial-sentence-${index + 1}`,
        chunkId: `trial-chunk-${chunkKey}`,
        prompt: "补全句子中的表达",
        hint: sentence.translation,
        answer: {
          text: chunk,
          acceptedAnswers: [chunk],
        },
        cloze: {
          displayText: buildClozeText(sentence.text, chunk),
        },
        metadata: {
          chunkText: chunk,
          referenceSentence: sentence.text,
          practiceMode: "cloze",
        },
      } satisfies PracticeExercise;
    })
    .filter((exercise): exercise is PracticeExercise => Boolean(exercise))
    .slice(0, 8);
};

const buildTrialSentenceRecallModule = (lesson: Lesson): PracticeModule | null => {
  const trialSceneId = getTrialSceneId(lesson);
  const exercises = getLessonSentences(lesson)
    .map((sentence, index) => {
      const text = sentence.text.trim();
      if (!text) return null;
      return {
        id: `trial-sentence-recall-${toKey(sentence.id || `${index + 1}`)}`,
        type: "translation_prompt",
        inputMode: "typing",
        sceneId: trialSceneId,
        sentenceId: sentence.id || `trial-sentence-${index + 1}`,
        prompt: "看中文提示，完整复现这句",
        hint: text.split(/\s+/).slice(0, 3).join(" "),
        answer: {
          text,
          acceptedAnswers: [text],
        },
        cloze: {
          displayText: sentence.translation || "请完整复现这一句",
        },
        metadata: {
          practiceMode: "sentence_recall",
          fullSentenceText: text,
          translation: sentence.translation,
        },
      } satisfies PracticeExercise;
    })
    .filter((exercise): exercise is PracticeExercise => Boolean(exercise))
    .slice(0, 4);

  if (exercises.length === 0) return null;
  return {
    mode: "sentence_recall",
    modeLabel: PRACTICE_MODE_LABELS.sentence_recall,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "试用固定题组：看中文提示，主动复现场景句子。",
    completionRequirement: "完成填空后，再复现这些核心句子。",
    exercises,
  };
};

export const buildTrialPracticeSet = (lesson: Lesson): PracticeSet => {
  const clozeExercises = buildTrialClozeExercises(lesson);
  const sentenceRecallModule = buildTrialSentenceRecallModule(lesson);
  const modules: PracticeModule[] = [
    {
      mode: "cloze",
      modeLabel: PRACTICE_MODE_LABELS.cloze,
      title: SCENE_PRACTICE_STAGE_TITLE,
      description: "试用固定题组：先把场景里的关键表达补出来。",
      completionRequirement: "完成本轮全部填空题后，可以进入句子复现。",
      exercises: clozeExercises,
    },
    ...(sentenceRecallModule ? [sentenceRecallModule] : []),
  ];

  return {
    id: `trial-practice-${toKey(lesson.slug || lesson.id)}`,
    sourceSceneId: getTrialSceneId(lesson),
    sourceSceneTitle: lesson.title,
    sourceType: "original",
    generationSource: "system",
    stageKey: "scene_practice",
    mode: "cloze",
    modeLabel: PRACTICE_MODE_LABELS.cloze,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "试用页使用固定练习题组，不调用 AI 生成，也不写入学习进度。",
    completionRequirement: "本地作答只用于体验；提交、保存和复习需要注册。",
    modules,
    exercises: clozeExercises,
    status: "generated",
    createdAt: TRIAL_FIXED_CREATED_AT,
  };
};

const buildVariantSentences = ({
  chunks,
  tone,
}: {
  chunks: string[];
  tone: "friendly" | "workplace" | "polite";
}): LessonSentence[] => {
  const fallbackChunks = chunks.length > 0 ? chunks : ["the key phrase"];
  return fallbackChunks.slice(0, 4).map((chunk, index) => {
    const speaker = index % 2 === 0 ? "A" : "B";
    const prefix =
      tone === "friendly"
        ? "In a casual chat, I can say"
        : tone === "workplace"
          ? "At work, I might say"
          : "To sound more polite, I can say";
    return {
      id: `trial-variant-${tone}-sentence-${index + 1}`,
      speaker,
      text: `${prefix}: ${chunk}`,
      translation:
        tone === "friendly"
          ? `在轻松聊天里，可以用：${chunk}`
          : tone === "workplace"
            ? `在工作沟通里，可以用：${chunk}`
            : `想更礼貌时，可以用：${chunk}`,
      chunks: [chunk],
      chunkDetails: [],
    };
  });
};

const buildTrialVariantLesson = ({
  lesson,
  key,
  title,
  summary,
  tone,
  chunks,
}: {
  lesson: Lesson;
  key: string;
  title: string;
  summary: string;
  tone: "friendly" | "workplace" | "polite";
  chunks: string[];
}): Lesson => ({
  ...lesson,
  id: `trial-variant-${toKey(lesson.slug || lesson.id)}-${key}`,
  slug: `${lesson.slug}-${key}-trial-variant`,
  title,
  subtitle: summary,
  description: summary,
  sourceType: "variant",
  sections: [
    {
      id: `trial-variant-section-${key}`,
      title: "固定变体",
      summary,
      blocks: [
        {
          id: `trial-variant-block-${key}`,
          speaker: "A",
          kind: lesson.sceneType === "monologue" ? "monologue" : "dialogue",
          sentences: buildVariantSentences({ chunks, tone }),
        },
      ],
    },
  ],
});

export const buildTrialVariantSet = (lesson: Lesson): VariantSet => {
  const reusedChunks = Array.from(
    new Set(getLessonSentences(lesson).flatMap((sentence) => sentence.chunks.map((chunk) => chunk.trim()))),
  ).filter(Boolean);
  const variants = [
    buildTrialVariantLesson({
      lesson,
      key: "friendly",
      title: `${lesson.title} · 朋友聊天版`,
      summary: "把同一批核心表达放进更轻松的聊天语气里。",
      tone: "friendly",
      chunks: reusedChunks,
    }),
    buildTrialVariantLesson({
      lesson,
      key: "workplace",
      title: `${lesson.title} · 工作沟通版`,
      summary: "把同一批核心表达迁移到工作沟通语境。",
      tone: "workplace",
      chunks: reusedChunks,
    }),
    buildTrialVariantLesson({
      lesson,
      key: "polite",
      title: `${lesson.title} · 更礼貌版`,
      summary: "用更稳妥的语气复用这些表达。",
      tone: "polite",
      chunks: reusedChunks,
    }),
  ];

  return {
    id: `trial-variant-${toKey(lesson.slug || lesson.id)}`,
    sourceSceneId: getTrialSceneId(lesson),
    sourceSceneTitle: lesson.title,
    reusedChunks,
    variants: variants.map((variant, index) => ({
      id: `trial-variant-item-${toKey(lesson.slug || lesson.id)}-${index + 1}`,
      lesson: variant,
      status: "unviewed",
    })),
    status: "generated",
    createdAt: TRIAL_FIXED_CREATED_AT,
  };
};
