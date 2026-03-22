import { requireCurrentProfile } from "@/lib/server/auth";
import { setExpressionClusterMain } from "@/lib/server/expression-clusters/service";
import { handleSetExpressionClusterMainPost } from "@/app/api/expression-clusters/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ clusterId: string }> },
) {
  return handleSetExpressionClusterMainPost(request, context, {
    requireCurrentProfile,
    setExpressionClusterMain,
  });
}
