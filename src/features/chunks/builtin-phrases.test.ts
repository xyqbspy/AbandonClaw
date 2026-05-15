import assert from "node:assert/strict";
import test from "node:test";
import {
  filterBuiltinPhrases,
  getPhraseCategoryLabel,
  getPhraseLevelLabel,
  getRecommendedBuiltinPhrases,
  groupBuiltinPhrasesByCategory,
  isPhraseSaved,
} from "./builtin-phrases";
import type { BuiltinPhraseItemResponse } from "@/lib/utils/phrases-api";

const makePhrase = (
  overrides: Partial<BuiltinPhraseItemResponse>,
): BuiltinPhraseItemResponse => ({
  id: overrides.id ?? "phrase-1",
  text: overrides.text ?? "Could you say that again?",
  normalizedText: overrides.normalizedText ?? "could you say that again?",
  translation: overrides.translation ?? "你可以再说一遍吗？",
  usageNote: overrides.usageNote ?? "听不清时礼貌请求重复。",
  level: overrides.level ?? "L0",
  category: overrides.category ?? "clarification",
  phraseType: overrides.phraseType ?? "request",
  isCore: overrides.isCore ?? true,
  frequencyRank: overrides.frequencyRank ?? 1,
  tags: overrides.tags ?? ["builtin", "core_phrase"],
  sourceScene: overrides.sourceScene ?? {
    slug: "asking-someone-to-repeat",
    title: "Asking Someone to Repeat",
  },
  isSaved: overrides.isSaved ?? false,
});

test("filterBuiltinPhrases 支持 level/category/search", () => {
  const phrases = [
    makePhrase({ id: "1", level: "L0", category: "clarification" }),
    makePhrase({ id: "2", text: "Could you help me with this?", category: "help" }),
    makePhrase({ id: "3", text: "Does that work for you?", level: "L1", category: "scheduling" }),
  ];

  assert.equal(filterBuiltinPhrases(phrases, { activeFilter: "L0" }).length, 2);
  assert.equal(filterBuiltinPhrases(phrases, { activeFilter: "help" }).length, 1);
  assert.equal(filterBuiltinPhrases(phrases, { search: "work for you" }).length, 1);
});

test("groupBuiltinPhrasesByCategory 按分类分组且保留条目", () => {
  const grouped = groupBuiltinPhrasesByCategory([
    makePhrase({ id: "1", category: "help" }),
    makePhrase({ id: "2", category: "help", text: "I need some help." }),
    makePhrase({ id: "3", category: "social", text: "Nice to meet you." }),
  ]);

  assert.equal(grouped.get("help")?.length, 2);
  assert.equal(grouped.get("social")?.length, 1);
});

test("isPhraseSaved 和 getRecommendedBuiltinPhrases 使用保存状态过滤", () => {
  const saved = makePhrase({ id: "1", isSaved: true, frequencyRank: 1 });
  const unsaved = makePhrase({ id: "2", isSaved: false, frequencyRank: 2, text: "I appreciate it." });

  assert.equal(isPhraseSaved(saved), true);
  assert.deepEqual(
    getRecommendedBuiltinPhrases([saved, unsaved]).map((item) => item.id),
    ["2"],
  );
});

test("标签文案在缺字段时也有稳定兜底", () => {
  assert.equal(getPhraseLevelLabel("L0"), "L0 入门");
  assert.equal(getPhraseLevelLabel(null), "通用");
  assert.equal(getPhraseCategoryLabel("social"), "社交交流");
  assert.equal(getPhraseCategoryLabel(undefined), "高频表达");
});
