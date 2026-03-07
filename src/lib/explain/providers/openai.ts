import { ExplainSelectionRequest, SelectionExplainResponse } from "@/lib/types";

const OPENAI_URL = "https://api.openai.com/v1/responses";

export async function explainWithOpenAI(
  payload: ExplainSelectionRequest,
): Promise<SelectionExplainResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未配置");
  }

  const prompt = `
你是面向中文学习者的英语学习助手。请严格输出 JSON（不要 Markdown，不要解释）：
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
1) sentence.translation 是“整句翻译”，自然中文。
2) chunk.translation 是“短语中文释义”。
3) chunk.meaningInSentence 是“当前句中含义”，必须结合 sourceSentence。
4) chunk.usageNote 是“常见用法”，不要空泛。
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

  const response = await fetch(OPENAI_URL, {
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
  });

  if (!response.ok) {
    throw new Error(`OpenAI 请求失败: ${response.status}`);
  }

  const data = (await response.json()) as { output_text?: string };
  const raw = data.output_text?.trim() ?? "";
  if (!raw) throw new Error("OpenAI 返回空内容");

  const parsed = JSON.parse(raw) as SelectionExplainResponse;
  return parsed;
}
