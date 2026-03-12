import { Lesson } from "@/lib/types";

const CUSTOM_SCENARIOS_STORAGE_KEY = "custom-scenarios";
const EMPTY_SCENARIOS: Lesson[] = [];

let cachedRaw: string | null = null;
let cachedScenarios: Lesson[] = EMPTY_SCENARIOS;

const isLessonShape = (value: unknown): value is Lesson => {
  if (!value || typeof value !== "object") return false;
  const maybeLesson = value as Lesson;
  return (
    typeof maybeLesson.id === "string" &&
    typeof maybeLesson.slug === "string" &&
    typeof maybeLesson.title === "string" &&
    Array.isArray(maybeLesson.sections)
  );
};

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const parseScenarios = (raw: string): Lesson[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_SCENARIOS;
    return parsed.filter(isLessonShape).map((lesson) => ({
      ...lesson,
      sourceType:
        lesson.sourceType === "custom"
          ? ("imported" as const)
          : (lesson.sourceType ?? "imported"),
    }));
  } catch {
    return EMPTY_SCENARIOS;
  }
};

export function loadCustomScenariosFromStorage() {
  if (!canUseStorage()) return EMPTY_SCENARIOS;
  const raw = window.localStorage.getItem(CUSTOM_SCENARIOS_STORAGE_KEY) ?? "[]";
  return parseScenarios(raw);
}

export function getCustomScenariosSnapshot() {
  if (!canUseStorage()) return EMPTY_SCENARIOS;
  const raw = window.localStorage.getItem(CUSTOM_SCENARIOS_STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedScenarios;
  cachedRaw = raw;
  cachedScenarios = parseScenarios(raw);
  return cachedScenarios;
}

export function saveCustomScenarioToStorage(lesson: Lesson) {
  if (!canUseStorage()) return;
  const scenarios = [...getCustomScenariosSnapshot()];
  const nextLesson = {
    ...lesson,
    sourceType:
      lesson.sourceType === "custom"
        ? ("imported" as const)
        : (lesson.sourceType ?? "imported"),
  };
  const existingIndex = scenarios.findIndex((item) => item.id === lesson.id);
  if (existingIndex >= 0) {
    scenarios[existingIndex] = nextLesson;
  } else {
    scenarios.unshift(nextLesson);
  }
  const nextRaw = JSON.stringify(scenarios);
  window.localStorage.setItem(CUSTOM_SCENARIOS_STORAGE_KEY, nextRaw);
  cachedRaw = nextRaw;
  cachedScenarios = scenarios;
}

export function removeCustomScenarioFromStorage(id: string) {
  if (!canUseStorage()) return;
  const scenarios = getCustomScenariosSnapshot().filter(
    (lesson) => lesson.id !== id,
  );
  const nextRaw = JSON.stringify(scenarios);
  window.localStorage.setItem(CUSTOM_SCENARIOS_STORAGE_KEY, nextRaw);
  cachedRaw = nextRaw;
  cachedScenarios = scenarios;
}

export function getCustomScenarioBySlug(slug: string) {
  return getCustomScenariosSnapshot().find((item) => item.slug === slug);
}
