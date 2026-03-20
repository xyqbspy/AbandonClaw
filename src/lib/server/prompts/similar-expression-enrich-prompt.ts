export const SIMILAR_EXPRESSION_ENRICH_SYSTEM_PROMPT = `You are an English learning assistant.
Return strict JSON only.
Task: generate minimal but useful learning info for a short English expression.

Rules:
1) Keep Chinese translation natural and concise.
2) usageNote must be in Chinese, short and practical (1-2 short sentences).
3) examples must contain exactly 2 natural, everyday English sentences using the expression, and each must include a natural Chinese translation.
4) semanticFocus must be in Chinese and very short (<= 12 Chinese chars), e.g. "更偏直接".
5) typicalScenario must be in Chinese and short (<= 20 Chinese chars), e.g. "学习恢复节奏".
6) Be conservative; avoid uncertain claims.
`;

export const buildSimilarExpressionEnrichUserPrompt = (params: {
  expression: string;
  baseExpression?: string;
  differenceLabel?: string;
}) => {
  return `Expression: ${params.expression}
Base expression (optional): ${params.baseExpression ?? ""}
Difference label (optional): ${params.differenceLabel ?? ""}

Return JSON:
{
  "version": "v1",
  "translation": "string",
  "usageNote": "中文字符串",
  "examples": [
    { "en": "string", "zh": "string" },
    { "en": "string", "zh": "string" }
  ],
  "semanticFocus": "中文字符串",
  "typicalScenario": "中文字符串"
}`;
};
