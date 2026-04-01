import { requireCurrentProfile } from "@/lib/server/auth";
import { deleteUserPhraseForUser } from "@/lib/server/phrases/service";
import { handleDeleteUserPhrase } from "../handlers";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userPhraseId: string }> },
) {
  return handleDeleteUserPhrase(request, context, {
    requireCurrentProfile,
    deleteUserPhraseForUser,
  });
}
