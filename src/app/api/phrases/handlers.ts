import { NextResponse } from "next/server";
import { assertProfileCanWrite } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { parseRequiredTrimmedString } from "@/lib/server/validation";
import type { ProfileRow } from "@/lib/server/db/types";

type RequireCurrentProfile = () => Promise<{ user: { id: string }; profile: ProfileRow }>;

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
    const { user, profile } = await deps.requireCurrentProfile();
    assertProfileCanWrite(profile);
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
