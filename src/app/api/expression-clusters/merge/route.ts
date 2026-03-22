import { requireCurrentProfile } from "@/lib/server/auth";
import { mergeExpressionClusters } from "@/lib/server/expression-clusters/service";
import { handleMergeExpressionClustersPost } from "@/app/api/expression-clusters/handlers";

export async function POST(request: Request) {
  return handleMergeExpressionClustersPost(request, {
    requireCurrentProfile,
    mergeExpressionClusters,
  });
}
