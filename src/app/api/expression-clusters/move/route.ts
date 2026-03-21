import { requireCurrentProfile } from "@/lib/server/auth";
import { moveExpressionClusterMember } from "@/lib/server/expression-clusters/service";
import { handleMoveExpressionClusterMemberPost } from "@/app/api/expression-clusters/handlers";

export async function POST(request: Request) {
  return handleMoveExpressionClusterMemberPost(request, {
    requireCurrentProfile,
    moveExpressionClusterMember,
  });
}
