import { fetchWithTimeout, getUpstreamTimeoutMs, isAbortLikeError } from "@/lib/server/upstream";
import { ExplainSelectionRequest, SelectionExplainResponse } from "@/lib/types";

const OPENAI_URL = "https://api.openai.com/v1/responses";

interface OpenAIDependencies {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export async function explainWithOpenAI(
  payload: ExplainSelectionRequest,
  dependencies: OpenAIDependencies = {},
): Promise<SelectionExplainResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = `
你是面向中文学习者的英语学习助手。请严格输出 JSON，不要输出 Markdown，也不要补充解释。
{
  "sentence": {
    "text": string,
    "translation": string,
    "ttsText": string
  },
  "chunk": {
    "text": string,
    "translation": string,
    "pronunciation": string,
    "meaningInSentence": string,
    "usageNote": string,
    "examples": string[],
    "notes": string[]
  },
  "relatedChunks": string[]
}

要求：
1) sentence.translation 是整句翻译，使用自然中文。
2) chunk.translation 是短语中文释义。
3) chunk.meaningInSentence 是当前句中的含义，必须结合 sourceSentence。
4) chunk.usageNote 是常见用法，不要空泛。
5) examples 返回 1-2 条自然英文例句。
6) relatedChunks 从 sourceChunks 中挑选 2-4 个与当前短语相关且不重复的项。
7) user language: zh-CN。

selectedText: ${payload.selectedText}
sourceSentence: ${payload.sourceSentence}
sourceTranslation: ${payload.sourceTranslation ?? ""}
sourceChunks: ${(payload.sourceChunks ?? []).join(", ")}
lessonTitle: ${payload.lessonTitle}
lessonDifficulty: ${payload.lessonDifficulty}
  `.trim();

  let response: Response;
  try {
    response = await fetchWithTimeout(
      OPENAI_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_EXPLAIN_MODEL ?? "gpt-4.1-mini",
          input: prompt,
          temperature: 0.2,
        }),
      },
      getUpstreamTimeoutMs(dependencies.timeoutMs),
      dependencies.fetch,
    );
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new Error("OpenAI request timed out.");
    }
    throw new Error("OpenAI request failed before receiving a response.");
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { output_text?: string };
  const raw = data.output_text?.trim() ?? "";
  if (!raw) throw new Error("OpenAI response content is empty.");

  const parsed = JSON.parse(raw) as SelectionExplainResponse;
  return parsed;
}
