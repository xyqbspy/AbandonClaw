import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeModule,
  PracticeSet,
} from "@/lib/types/learning-flow";
import { getPracticeAssessmentRank } from "@/lib/shared/scene-practice-assessment";
import { PRACTICE_MODE_LABELS, SCENE_PRACTICE_STAGE_TITLE } from "@/lib/shared/scene-training-copy";

export const derivePracticeModules = (practiceSet: PracticeSet | null): PracticeModule[] => {
  if (practiceSet?.modules && practiceSet.modules.length > 0) {
    return practiceSet.modules;
  }

  if (!practiceSet) return [];

    return [
      {
        mode: practiceSet.mode ?? "cloze",
        modeLabel: practiceSet.modeLabel ?? PRACTICE_MODE_LABELS.cloze,
        title: practiceSet.title ?? SCENE_PRACTICE_STAGE_TITLE,
        description: practiceSet.description,
        completionRequirement: practiceSet.completionRequirement,
        exercises: practiceSet.exercises,
    },
  ];
};

export const derivePracticeModuleCompletionMap = (
  modules: PracticeModule[],
  resultMap: Record<string, "correct" | "incorrect" | null>,
) =>
  modules.reduce<Record<PracticeMode, boolean>>((acc, module) => {
    const typingExercises = module.exercises.filter((exercise) => exercise.inputMode === "typing");
    acc[module.mode] =
      typingExercises.length === 0 ||
      typingExercises.every((exercise) => resultMap[exercise.id] === "correct");
    return acc;
  }, {} as Record<PracticeMode, boolean>);

export const deriveUnlockedPracticeModes = (
  modules: PracticeModule[],
  moduleCompletionMap: Record<PracticeMode, boolean>,
) => {
  const unlocked = new Set<PracticeMode>();
  modules.forEach((module, index) => {
    if (index === 0) {
      unlocked.add(module.mode);
      return;
    }
    const previousModule = modules[index - 1];
    if (previousModule && moduleCompletionMap[previousModule.mode]) {
      unlocked.add(module.mode);
    }
  });
  return unlocked;
};

export const deriveSentenceMilestoneSummary = ({
  exercises,
  assessmentMap,
}: {
  exercises: Array<{ id: string; sentenceId?: string | null }>;
  assessmentMap: Record<string, PracticeAssessmentLevel | null | undefined>;
}) => {
  const bestBySentence = new Map<string, PracticeAssessmentLevel>();
  exercises.forEach((exercise) => {
    const sentenceKey = exercise.sentenceId ?? exercise.id;
    const assessment = assessmentMap[exercise.id];
    if (!assessment) return;
    const previous = bestBySentence.get(sentenceKey);
    if (!previous || getPracticeAssessmentRank(assessment) > getPracticeAssessmentRank(previous)) {
      bestBySentence.set(sentenceKey, assessment);
    }
  });

  let keywordCount = 0;
  let structureCount = 0;
  let completeCount = 0;

  for (const assessment of bestBySentence.values()) {
    if (assessment === "complete") completeCount += 1;
    else if (assessment === "structure") structureCount += 1;
    else if (assessment === "keyword") keywordCount += 1;
  }

  return {
    totalTracked: bestBySentence.size,
    keywordCount,
    structureCount,
    completeCount,
  };
};

export const deriveBestSentenceAssessment = ({
  exercises,
  assessmentMap,
  sentenceId,
  fallbackExerciseId,
}: {
  exercises: Array<{ id: string; sentenceId?: string | null }>;
  assessmentMap: Record<string, PracticeAssessmentLevel | null | undefined>;
  sentenceId?: string | null;
  fallbackExerciseId: string;
}) =>
  exercises
    .filter((exercise) => (exercise.sentenceId ?? exercise.id) === (sentenceId ?? fallbackExerciseId))
    .reduce<PracticeAssessmentLevel | null>((best, exercise) => {
      const current = assessmentMap[exercise.id];
      if (!current) return best;
      if (!best) return current;
      return getPracticeAssessmentRank(current) > getPracticeAssessmentRank(best) ? current : best;
    }, null);

export const didSentenceReachCompleteMilestone = ({
  previous,
  next,
}: {
  previous: PracticeAssessmentLevel | null | undefined;
  next: PracticeAssessmentLevel | null | undefined;
}) => previous !== "complete" && next === "complete";
