import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { parseRequiredTrimmedString } from "@/lib/server/validation";

type RequireCurrentProfile = () => Promise<{ user: { id: string } }>;

type DeleteUserPhraseForUser = (userId: string, userPhraseId: string) => Promise<unknown>;

export const handleDeleteUserPhrase = async (
  _request: Request,
  context: { params: Promise<{ userPhraseId: string }> },
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    deleteUserPhraseForUser: DeleteUserPhraseForUser;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
    const { userPhraseId } = await context.params;
    const normalizedUserPhraseId = parseRequiredTrimmedString(
      userPhraseId,
      "userPhraseId",
      120,
    );

    const result = await deps.deleteUserPhraseForUser(user.id, normalizedUserPhraseId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to delete user phrase.");
  }
};
