import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import { handleSceneMutatePost } from "./route";

const sampleScene = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  type: "monologue",
  sections: [
    {
      id: "sec-1",
      blocks: [
        {
          id: "blk-1",
          type: "monologue",
          sentences: [{ id: "s1", text: "Hello.", chunks: [] }],
        },
      ],
    },
  ],
} as const;

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/scene/mutate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("scene mutate handler 会拒绝未登录请求", async () => {
  const response = await handleSceneMutatePost(createJsonRequest({ scene: sampleScene }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    callGlmChatCompletion: async () => "",
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Unauthorized",
    code: "AUTH_UNAUTHORIZED",
    details: null,
  });
});

test("scene mutate handler 会返回模型解析后的 variants", async () => {
  const response = await handleSceneMutatePost(
    createJsonRequest({ scene: sampleScene }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () =>
        JSON.stringify({
          version: "v1",
          variants: [sampleScene],
        }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    variants: [sampleScene],
  });
});
