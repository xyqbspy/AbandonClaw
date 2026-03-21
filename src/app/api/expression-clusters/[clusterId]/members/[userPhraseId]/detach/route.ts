import { requireCurrentProfile } from "@/lib/server/auth";
import { detachExpressionClusterMember } from "@/lib/server/expression-clusters/service";
import { handleDetachExpressionClusterMemberPost } from "@/app/api/expression-clusters/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ clusterId: string; userPhraseId: string }> },
) {
  return handleDetachExpressionClusterMemberPost(request, context, {
    requireCurrentProfile,
    detachExpressionClusterMember,
  });
}
