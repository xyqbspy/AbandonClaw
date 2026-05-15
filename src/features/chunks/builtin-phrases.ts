import { BuiltinPhraseItemResponse } from "@/lib/utils/phrases-api";

export type BuiltinPhraseFilterKey =
  | "all"
  | "L0"
  | "L1"
  | "daily_life"
  | "help"
  | "social"
  | "scheduling";

const levelPriority = (level: string | null) => {
  if (level === "L0") return 0;
  if (level === "L1") return 1;
  if (level === "L2") return 2;
  return 3;
};

const categoryPriority = (category: string | null) => {
  if (category === "greeting") return 0;
  if (category === "clarification") return 1;
  if (category === "help") return 2;
  if (category === "ordering") return 3;
  if (category === "scheduling") return 4;
  if (category === "social") return 5;
  if (category === "polite_response") return 6;
  if (category === "opinion") return 7;
  if (category === "travel") return 8;
  if (category === "daily_life") return 9;
  return 10;
};

export const getPhraseLevelLabel = (level: string | null | undefined) => {
  if (level === "L0") return "L0 入门";
  if (level === "L1") return "L1 基础";
  if (level === "L2") return "L2 进阶";
  return "通用";
};

export const getPhraseCategoryLabel = (category: string | null | undefined) => {
  if (category === "greeting") return "日常问候";
  if (category === "help") return "请求帮助";
  if (category === "clarification") return "听懂确认";
  if (category === "ordering") return "点单购物";
  if (category === "scheduling") return "时间安排";
  if (category === "social") return "社交交流";
  if (category === "polite_response") return "礼貌回应";
  if (category === "opinion") return "表达观点";
  if (category === "travel") return "出行移动";
  if (category === "daily_life") return "日常生活";
  return "高频表达";
};

export const isPhraseSaved = (phrase: Pick<BuiltinPhraseItemResponse, "isSaved">) => phrase.isSaved;

export const sortBuiltinPhrases = (phrases: BuiltinPhraseItemResponse[]) =>
  [...phrases].sort((left, right) => {
    const savedDelta = Number(left.isSaved) - Number(right.isSaved);
    if (savedDelta !== 0) return savedDelta;
    const levelDelta = levelPriority(left.level) - levelPriority(right.level);
    if (levelDelta !== 0) return levelDelta;
    const categoryDelta = categoryPriority(left.category) - categoryPriority(right.category);
    if (categoryDelta !== 0) return categoryDelta;
    const frequencyDelta =
      (left.frequencyRank ?? Number.MAX_SAFE_INTEGER) -
      (right.frequencyRank ?? Number.MAX_SAFE_INTEGER);
    if (frequencyDelta !== 0) return frequencyDelta;
    return left.text.localeCompare(right.text);
  });

export const filterBuiltinPhrases = (
  phrases: BuiltinPhraseItemResponse[],
  options: {
    activeFilter?: BuiltinPhraseFilterKey;
    search?: string;
  },
) => {
  const search = options.search?.trim().toLowerCase() ?? "";
  return phrases.filter((phrase) => {
    if (options.activeFilter && options.activeFilter !== "all") {
      if (options.activeFilter === "L0" || options.activeFilter === "L1") {
        if (phrase.level !== options.activeFilter) return false;
      } else if (phrase.category !== options.activeFilter) {
        return false;
      }
    }

    if (!search) return true;
    return [
      phrase.text,
      phrase.translation ?? "",
      phrase.usageNote ?? "",
      phrase.sourceScene?.title ?? "",
      getPhraseCategoryLabel(phrase.category),
    ].some((value) => value.toLowerCase().includes(search));
  });
};

export const groupBuiltinPhrasesByCategory = (phrases: BuiltinPhraseItemResponse[]) => {
  const grouped = new Map<string, BuiltinPhraseItemResponse[]>();
  for (const phrase of sortBuiltinPhrases(phrases)) {
    const key = phrase.category ?? "uncategorized";
    const bucket = grouped.get(key) ?? [];
    bucket.push(phrase);
    grouped.set(key, bucket);
  }
  return grouped;
};

export const getRecommendedBuiltinPhrases = (
  phrases: BuiltinPhraseItemResponse[],
  limit = 6,
) => sortBuiltinPhrases(phrases.filter((phrase) => !phrase.isSaved)).slice(0, limit);
