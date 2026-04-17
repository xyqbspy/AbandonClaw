import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSceneParseUserPrompt,
  SCENE_PARSE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-parse-prompt";

describe("scene parse prompt", () => {
  it("keeps dialogue block and chunk rules aligned with the parser schema", () => {
    const prompt = buildSceneParseUserPrompt({
      rawText: "A: Hey, sorry I'm late.\nB: No worries.",
    });

    assert.match(SCENE_PARSE_SYSTEM_PROMPT, /no more than 2 sentences/i);
    assert.match(SCENE_PARSE_SYSTEM_PROMPT, /chunks may be an empty array/i);
    assert.match(prompt, /each line should usually become one dialogue block/i);
    assert.match(prompt, /chunks may be \[\]/i);
    assert.match(prompt, /Never put more than 2 sentences in one block/i);
  });
});
