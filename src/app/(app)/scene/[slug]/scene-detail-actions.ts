import { Lesson } from "@/lib/types";
import { PracticeExercise } from "@/lib/types/scene-parser";
import { PracticeModule, PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import { PRACTICE_MODE_LABELS, SCENE_PRACTICE_STAGE_TITLE } from "@/lib/shared/scene-training-copy";

export const createGeneratedId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const splitSentenceForGuidedRecall = (sentenceText: string) => {
  const normalizedText = sentenceText.trim().replace(/\s+/g, " ");
  const words = normalizedText.split(" ").filter(Boolean);
  if (words.length < 5) return null;

  const prefixLength = Math.max(3, Math.ceil(words.length / 2));
  const prefixWords = words.slice(0, prefixLength);
  const suffixWords = words.slice(prefixLength);
  if (prefixWords.length === 0 || suffixWords.length === 0) return null;

  return {
    promptText: `${prefixWords.join(" ")} ____`,
    answerText: suffixWords.join(" "),
  };
};

const buildGuidedRecallModule = ({
  sourceLesson,
  baseSceneId,
}: {
  sourceLesson: Lesson;
  baseSceneId: string;
}): PracticeModule => {
  const guidedExercises: PracticeExercise[] = sourceLesson.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.sentences)
    .flatMap((sentence, index) => {
      const split = splitSentenceForGuidedRecall(sentence.text);
      if (!split) return [];

      return [{
        id: `guided-recall-${sentence.id || index + 1}`,
        type: "typing" as const,
        inputMode: "typing" as const,
        sceneId: baseSceneId,
        sentenceId: sentence.id,
        prompt: "看到前半句，补出后半句",
        hint: sentence.translation,
        answer: {
          text: split.answerText,
          acceptedAnswers: [split.answerText],
        },
        cloze: {
          displayText: split.promptText,
        },
        metadata: {
          practiceMode: "guided_recall",
          fullSentenceText: sentence.text,
          prefixText: split.promptText,
          answerKind: "sentence_suffix",
        },
      }];
    })
    .slice(0, 5);

  return {
    mode: "guided_recall",
    modeLabel: PRACTICE_MODE_LABELS.guided_recall,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "先看到前半句，再把后半句主动提取出来，训练句子骨架和表达衔接。",
    completionRequirement: "先完成填空，再完成本轮半句复现。",
    exercises: guidedExercises,
  };
};

const buildSentenceRecallModule = ({
  sourceLesson,
  baseSceneId,
}: {
  sourceLesson: Lesson;
  baseSceneId: string;
}): PracticeModule => {
  const sentenceExercises: PracticeExercise[] = sourceLesson.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.sentences)
    .flatMap((sentence, index) => {
      const normalizedText = sentence.text.trim();
      if (!normalizedText) return [];

      return [{
        id: `sentence-recall-${sentence.id || index + 1}`,
        type: "translation_prompt" as const,
        inputMode: "typing" as const,
        sceneId: baseSceneId,
        sentenceId: sentence.id,
        prompt: "看中文提示，完整复现这句",
        hint: normalizedText.split(" ").slice(0, 3).join(" "),
        answer: {
          text: normalizedText,
          acceptedAnswers: [normalizedText],
        },
        cloze: {
          displayText: sentence.translation?.trim() || `请完整复现：${normalizedText}`,
        },
        metadata: {
          practiceMode: "sentence_recall",
          fullSentenceText: normalizedText,
          translation: sentence.translation,
        },
      }];
    })
    .slice(0, 3);

  return {
    mode: "sentence_recall",
    modeLabel: PRACTICE_MODE_LABELS.sentence_recall,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "只给你中文提示，整句完整复现，训练句子从理解到主动输出的闭环。",
    completionRequirement: "先完成半句复现，再完成本轮整句复现。",
    exercises: sentenceExercises,
  };
};

const buildFullDictationModule = ({
  sourceLesson,
  baseSceneId,
}: {
  sourceLesson: Lesson;
  baseSceneId: string;
}): PracticeModule => {
  const sentences = sourceLesson.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.sentences)
    .map((sentence) => ({
      id: sentence.id,
      text: sentence.text.trim(),
      translation: sentence.translation?.trim() || "",
    }))
    .filter((sentence) => sentence.text.length > 0);

  if (sentences.length === 0) {
    return {
      mode: "full_dictation",
      modeLabel: PRACTICE_MODE_LABELS.full_dictation,
      title: SCENE_PRACTICE_STAGE_TITLE,
      description: "按整段回忆全文，训练整段场景的连续输出。",
      completionRequirement: "先完成整句复现，再完成全文默写。",
      exercises: [],
    };
  }

  return {
    mode: "full_dictation",
    modeLabel: PRACTICE_MODE_LABELS.full_dictation,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "最后一层直接默写整段，把场景从局部提取推进到连续复现。",
    completionRequirement: "完成整句复现后，再完成本轮全文默写。",
    exercises: [
      {
        id: `full-dictation-${baseSceneId}`,
        type: "typing" as const,
        inputMode: "typing" as const,
        sceneId: baseSceneId,
        sentenceId: sentences[0]?.id ?? "scene-full-dictation",
        prompt: "根据整段中文提示，默写全文",
        hint: "允许先回忆骨架，再补齐细节。",
        answer: {
          text: sentences.map((sentence) => sentence.text).join("\n"),
          acceptedAnswers: [sentences.map((sentence) => sentence.text).join(" ")],
        },
        cloze: {
          displayText: sentences
            .map((sentence, index) => `${index + 1}. ${sentence.translation || "请复现这一句"}`)
            .join("\n"),
        },
        metadata: {
          practiceMode: "full_dictation",
          fullSentenceTexts: sentences.map((sentence) => sentence.text),
        },
      },
    ],
  };
};

export const buildPracticeSet = ({
  baseLesson,
  sourceLesson,
  exercises,
  nowIso,
  createId = createGeneratedId,
}: {
  baseLesson: Lesson;
  sourceLesson: Lesson;
  exercises: PracticeExercise[];
  nowIso: string;
  createId?: (prefix: string) => string;
}): PracticeSet => {
  const isVariantSource = sourceLesson.sourceType === "variant";
  const guidedRecallModule = buildGuidedRecallModule({
    sourceLesson,
    baseSceneId: baseLesson.id,
  });
  const sentenceRecallModule = buildSentenceRecallModule({
    sourceLesson,
    baseSceneId: baseLesson.id,
  });
  const fullDictationModule = buildFullDictationModule({
    sourceLesson,
    baseSceneId: baseLesson.id,
  });
  const modules: PracticeModule[] = [
    {
      mode: "cloze",
      modeLabel: PRACTICE_MODE_LABELS.cloze,
      title: SCENE_PRACTICE_STAGE_TITLE,
      description: "首发题型先从填空开始，帮助你抓住场景里的关键表达。",
      completionRequirement: "先完成本轮全部填空题，才能进入下一步的半句复现。",
      exercises,
    },
    ...(guidedRecallModule.exercises.length > 0 ? [guidedRecallModule] : []),
    ...(sentenceRecallModule.exercises.length > 0 ? [sentenceRecallModule] : []),
    ...(fullDictationModule.exercises.length > 0 ? [fullDictationModule] : []),
  ];

  return {
    id: createId("practice"),
    sourceSceneId: baseLesson.id,
    sourceSceneTitle: baseLesson.title,
    sourceType: isVariantSource ? "variant" : "original",
    sourceVariantId: isVariantSource ? sourceLesson.id : undefined,
    sourceVariantTitle: isVariantSource ? sourceLesson.title : undefined,
    stageKey: "scene_practice",
    mode: "cloze",
    modeLabel: PRACTICE_MODE_LABELS.cloze,
    title: SCENE_PRACTICE_STAGE_TITLE,
    description: "首发练习会按填空、半句复现、整句复现、全文默写四层逐步推进。",
    completionRequirement: "完成首发练习模块：依次完成填空、半句复现、整句复现和全文默写，最后点击“完成本轮练习”。",
    modules,
    exercises,
    status: "generated",
    createdAt: nowIso,
  };
};

export const buildVariantSet = ({
  baseLesson,
  variants,
  reusedChunks,
  nowIso,
  createId = createGeneratedId,
}: {
  baseLesson: Lesson;
  variants: Lesson[];
  reusedChunks: string[];
  nowIso: string;
  createId?: (prefix: string) => string;
}): VariantSet => ({
  id: createId("variant"),
  sourceSceneId: baseLesson.id,
  sourceSceneTitle: baseLesson.title,
  reusedChunks,
  variants: variants.map((lesson, index) => ({
    id: `${lesson.id}-${index + 1}`,
    lesson,
    status: "unviewed",
  })),
  status: "generated",
  createdAt: nowIso,
});
