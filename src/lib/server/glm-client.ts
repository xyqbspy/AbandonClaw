const GLM_BASE_URL = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";

type GlmRole = "system" | "user" | "assistant";

interface GlmMessage {
  role: GlmRole;
  content: string;
}

interface GlmChatCompletionRequest {
  model: string;
  messages: GlmMessage[];
  temperature?: number;
  stream?: boolean;
  response_format?: {
    type: "text" | "json_object";
  };
}

const readMessageContent = (value: unknown): string => {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const texts = value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const record = item as { text?: unknown; type?: unknown; content?: unknown };
        if (typeof record.text === "string") return record.text;
        if (record.type === "text" && typeof record.content === "string") {
          return record.content;
        }
        return "";
      })
      .filter(Boolean);
    return texts.join("\n").trim();
  }

  return "";
};

export async function callGlmChatCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
}) {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error("GLM_API_KEY is not configured.");
  }

  const requestBody: GlmChatCompletionRequest = {
    model: params.model ?? process.env.GLM_MODEL ?? "glm-5",
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    temperature: params.temperature ?? 0.2,
    stream: false,
    response_format: { type: "json_object" },
  };

  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`GLM request failed: ${response.status} ${bodyText.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };

  const rawText = readMessageContent(data.choices?.[0]?.message?.content).trim();
  if (!rawText) {
    throw new Error("GLM response content is empty.");
  }

  return rawText;
}
