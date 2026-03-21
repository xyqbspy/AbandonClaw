export type ExpressionSourceType = "original" | "variant";

export interface ExpressionNode {
  id: string;
  text: string;
  sourceSceneId: string;
  sourceType: ExpressionSourceType;
}

export interface ExpressionCluster {
  id: string;
  anchor: string;
  meaning: string;
  expressions: string[];
  sourceSceneIds: string[];
  nodes: ExpressionNode[];
}

export interface ExpressionMapGenerateRequest {
  sourceSceneId: string;
  sourceSceneTitle?: string;
  baseExpressions: string[];
  variantExpressionSources?: Array<{
    sourceSceneId: string;
    expressions: string[];
  }>;
}

export interface ExpressionMapResponse {
  version: "v1";
  sourceSceneId: string;
  clusters: ExpressionCluster[];
}
