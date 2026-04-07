import assert from "node:assert/strict";
import test from "node:test";

import { buildPracticeGenerateUserPrompt } from "./practice-generate-prompt";

test("buildPracticeGenerateUserPrompt 会明确提高 chunk_cloze 覆盖优先级", () => {
  const prompt = buildPracticeGenerateUserPrompt({
    sceneJson: '{"id":"scene-1"}',
    expressionFamilies: "[]",
    exerciseCount: 8,
  });

  assert.match(prompt, /At least 60% of the exercises should be chunk_cloze/);
  assert.match(prompt, /prefer one chunk_cloze per different sentence before repeating/);
  assert.match(prompt, /Only use non-chunk_cloze types when chunk_cloze coverage is already strong/);
});
