export const SIMILAR_EXPRESSION_ENRICH_SYSTEM_PROMPT = `You are an English learning assistant.
Return strict JSON only.
Task: generate minimal but useful learning info for a short English expression.

Rules:
1) Keep Chinese translation natural and concise.
2) usageNote must be short and practical (1-2 short sentences).
3) exampleSentence should be a natural, everyday English sentence using the expression.
4) semanticFocus should be very short (<= 12 Chinese chars), e.g. "更偏直接预测".
5) typicalScenario should be short (<= 20 Chinese chars), e.g. "健康状态恶化担忧".
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
  "usageNote": "string",
  "exampleSentence": "string",
  "semanticFocus": "string",
  "typicalScenario": "string"
}`;
};
