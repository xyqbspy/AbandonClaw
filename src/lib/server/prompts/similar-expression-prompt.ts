export const SIMILAR_EXPRESSION_GENERATE_SYSTEM_PROMPT = `You are a precise English learning coach.
Return strict JSON only.
Task: generate similar English expressions for contrast learning.
Rules:
1) Keep expressions practical, common, and short.
2) Do NOT return identical text to the base expression.
3) Keep differenceLabel very short and conservative.
4) differenceLabel must be one of:
   - 更口语
   - 更强烈
   - 更偏直接预测
   - 更偏有迹象
   - 更常用于疲惫状态
   - 相关说法
5) Avoid over-claiming. If unsure, use "相关说法".
6) Return 5-8 candidates.
`;

export const buildSimilarExpressionGenerateUserPrompt = (params: {
  baseExpression: string;
  existingExpressions: string[];
}) => {
  const existing = JSON.stringify(params.existingExpressions.slice(0, 120));
  return `Base expression: ${params.baseExpression}
Existing expressions (avoid duplicates): ${existing}

Return JSON with shape:
{
  "version": "v1",
  "candidates": [
    {
      "text": "string",
      "differenceLabel": "更口语|更强烈|更偏直接预测|更偏有迹象|更常用于疲惫状态|相关说法"
    }
  ]
}`;
};
