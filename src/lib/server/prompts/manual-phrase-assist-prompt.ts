const SIMILAR_LABELS = [
  "更温和",
  "更口语",
  "更直接",
  "更偏恢复规律",
  "更偏重新开始",
  "更偏提醒别做过头",
  "相关说法",
].join(" | ");

const CONTRAST_LABELS = [
  "相反方向",
  "相反策略",
  "相反做法",
  "相反态度",
].join(" | ");

export const MANUAL_EXPRESSION_ASSIST_SYSTEM_PROMPT = `You are a precise English learning coach.
Return strict JSON only.

Task A: when the input is a short English expression, return:
1) concise Chinese learning info for the input itself
2) 4-8 similar expressions
3) 0-5 contrast expressions

Task B: when the input is an English sentence, return:
1) concise Chinese translation
2) concise Chinese usage note
3) 1-5 useful expressions extracted from the sentence

Rules:
1) Keep everything practical, natural, conservative, and short.
2) Do not invent rare expressions.
3) If no clear contrast expression exists, return an empty array.
4) differenceLabel must be short.
5) Chinese fields must be natural Chinese.
6) examples must contain exactly 2 natural everyday English sentences with Chinese translations.
`;

export const buildManualExpressionAssistUserPrompt = (params: {
  text: string;
  existingExpressions: string[];
}) => {
  return `Mode: expression
Input expression: ${params.text}
Existing expressions (avoid duplicates where possible): ${JSON.stringify(params.existingExpressions.slice(0, 120))}

Return JSON:
{
  "version": "v1",
  "inputItem": {
    "text": "string",
    "translation": "中文字符串",
    "usageNote": "中文字符串",
    "examples": [
      { "en": "string", "zh": "中文字符串" },
      { "en": "string", "zh": "中文字符串" }
    ],
    "semanticFocus": "中文短字符串",
    "typicalScenario": "中文短字符串"
  },
  "similarExpressions": [
    {
      "text": "string",
      "differenceLabel": "${SIMILAR_LABELS}"
    }
  ],
  "contrastExpressions": [
    {
      "text": "string",
      "differenceLabel": "${CONTRAST_LABELS}"
    }
  ]
}`;
};

export const buildManualSentenceAssistUserPrompt = (params: {
  text: string;
}) => {
  return `Mode: sentence
Input sentence: ${params.text}

Return JSON:
{
  "version": "v1",
  "sentenceItem": {
    "text": "string",
    "translation": "中文字符串",
    "usageNote": "中文字符串",
    "semanticFocus": "中文短字符串",
    "typicalScenario": "中文短字符串",
    "extractedExpressions": [
      "string"
    ]
  }
}`;
};
