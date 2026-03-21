import { requireCurrentProfile } from "@/lib/server/auth";
import { ensureExpressionClusterForPhrase } from "@/lib/server/expression-clusters/service";
import { handleEnsureExpressionClusterPost } from "@/app/api/expression-clusters/handlers";

export async function POST(request: Request) {
  return handleEnsureExpressionClusterPost(request, {
    requireCurrentProfile,
    ensureExpressionClusterForPhrase,
  });
}
