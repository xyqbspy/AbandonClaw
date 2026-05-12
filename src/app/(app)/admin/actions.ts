"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendAdminNotice, normalizeAdminReturnTo } from "@/app/(app)/admin/admin-page-state";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteAdminUserPhraseById,
  enrichAdminUserPhraseById,
  enrichAdminUserPhrasesByIds,
  createAdminInviteCodes,
  deleteSceneById,
  regenerateSceneVariants,
  updateAdminHighCostCapabilityDisabled,
  updateAdminRegistrationMode,
  updateAdminInviteCode,
  updateAdminUserAccessStatus,
  updateSceneSentencesById,
  updateSceneVisibility,
} from "@/lib/server/admin/service";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import { runSeedScenesSync } from "@/lib/server/scene/service";
import {
  parseBooleanFromForm,
  parseRequiredIdFromForm,
  parseRetainChunkRatio,
  parseUserAccessStatus,
  parseVariantCount,
} from "@/lib/server/validation";

const ADMIN_NOTICE = {
  sceneDeleted: "场景已删除。",
  scenePublic: "场景已设为公开。",
  scenePrivate: "场景已设为私有。",
  variantsRegenerated: "已重新生成变体。",
  variantsForceRegenerated: "已强制重新生成变体。",
  seedSynced: "Seed 场景同步完成。",
  phraseDeleted: "表达已删除。",
  phraseEnrichSubmitted: "表达补全已提交。",
  phraseEnrichFailed: "表达补全失败，请稍后重试。",
  batchSelectFirst: "请先选择需要补全的项。",
  batchEnrichFailed: "批量补全失败，请稍后重试。",
  invitesUpdated: "邀请码已更新。",
  registrationModeUpdated: "注册模式已更新。",
  registrationModeInvalid: "注册模式无效，请重试。",
  highCostControlUpdated: "高成本紧急开关已更新。",
  highCostControlInvalid: "高成本能力无效，请重试。",
  inviteNotFound: "未找到邀请码。",
  inviteInvalid: "邀请码参数无效，请重试。",
} as const;

const USER_ACCESS_STATUS_NOTICE = {
  updated: "账号状态已更新。",
  invalid: "账号状态无效，请重试。",
  notFound: "未找到该用户资料。",
} as const;

const refreshAdminPages = (sceneId?: string) => {
  revalidatePath("/admin");
  revalidatePath("/admin/invites");
  revalidatePath("/admin/users");
  revalidatePath("/admin/scenes");
  revalidatePath("/admin/phrases");
  revalidatePath("/admin/imported");
  revalidatePath("/admin/variants");
  revalidatePath("/admin/cache");
  if (sceneId) {
    revalidatePath(`/admin/scenes/${sceneId}`);
  }
};

interface UpdateAdminUserAccessStatusActionDependencies {
  requireAdmin: typeof requireAdmin;
  updateAdminUserAccessStatus: typeof updateAdminUserAccessStatus;
  redirect: typeof redirect;
  revalidatePath: typeof revalidatePath;
}

interface CreateAdminInviteCodesActionDependencies {
  requireAdmin: typeof requireAdmin;
  createAdminInviteCodes: typeof createAdminInviteCodes;
  revalidatePath: typeof revalidatePath;
}

interface UpdateAdminInviteCodeActionDependencies {
  requireAdmin: typeof requireAdmin;
  updateAdminInviteCode: typeof updateAdminInviteCode;
  redirect: typeof redirect;
  revalidatePath: typeof revalidatePath;
}

interface UpdateAdminRegistrationModeActionDependencies {
  requireAdmin: typeof requireAdmin;
  updateAdminRegistrationMode: typeof updateAdminRegistrationMode;
  redirect: typeof redirect;
  revalidatePath: typeof revalidatePath;
}

interface UpdateAdminHighCostControlActionDependencies {
  requireAdmin: typeof requireAdmin;
  updateAdminHighCostCapabilityDisabled: typeof updateAdminHighCostCapabilityDisabled;
  redirect: typeof redirect;
  revalidatePath: typeof revalidatePath;
}

const updateAdminUserAccessStatusActionDependencies: UpdateAdminUserAccessStatusActionDependencies = {
  requireAdmin,
  updateAdminUserAccessStatus,
  redirect,
  revalidatePath,
};

const createAdminInviteCodesActionDependencies: CreateAdminInviteCodesActionDependencies = {
  requireAdmin,
  createAdminInviteCodes,
  revalidatePath,
};

const updateAdminInviteCodeActionDependencies: UpdateAdminInviteCodeActionDependencies = {
  requireAdmin,
  updateAdminInviteCode,
  redirect,
  revalidatePath,
};

const updateAdminRegistrationModeActionDependencies: UpdateAdminRegistrationModeActionDependencies = {
  requireAdmin,
  updateAdminRegistrationMode,
  redirect,
  revalidatePath,
};

const updateAdminHighCostControlActionDependencies: UpdateAdminHighCostControlActionDependencies = {
  requireAdmin,
  updateAdminHighCostCapabilityDisabled,
  redirect,
  revalidatePath,
};

export async function deleteSceneAction(formData: FormData) {
  await requireAdmin();
  const sceneId = parseRequiredIdFromForm(formData.get("sceneId"), "sceneId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/scenes");
  await deleteSceneById(sceneId);
  refreshAdminPages(sceneId);
  redirect(appendAdminNotice(returnTo, ADMIN_NOTICE.sceneDeleted));
}

export async function updateSceneSentencesAction(input: {
  sceneId: string;
  sentences: Array<{
    sentenceId: string;
    text: string;
    translation: string;
    tts: string;
    chunks: string[];
  }>;
}) {
  await requireAdmin();
  const sceneId = parseRequiredIdFromForm(input.sceneId, "sceneId");
  const sentences = Array.isArray(input.sentences)
    ? input.sentences
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          sentenceId: parseRequiredIdFromForm(item.sentenceId, "sentenceId"),
          text: String(item.text ?? ""),
          translation: String(item.translation ?? ""),
          tts: String(item.tts ?? ""),
          chunks: Array.isArray(item.chunks) ? item.chunks.map((chunk) => String(chunk ?? "")) : [],
        }))
    : [];

  const result = await updateSceneSentencesById({
    sceneId,
    sentences,
  });
  refreshAdminPages(sceneId);
  revalidatePath("/scenes");
  revalidatePath(`/scene/${result.slug}`);
  return result;
}

export async function toggleSceneVisibilityAction(formData: FormData) {
  await requireAdmin();
  const sceneId = parseRequiredIdFromForm(formData.get("sceneId"), "sceneId");
  const nextPublic = parseBooleanFromForm(formData.get("nextPublic"));
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), `/admin/scenes/${sceneId}`);
  await updateSceneVisibility({ sceneId, isPublic: nextPublic });
  refreshAdminPages(sceneId);
  redirect(
    appendAdminNotice(
      returnTo,
      nextPublic ? ADMIN_NOTICE.scenePublic : ADMIN_NOTICE.scenePrivate,
    ),
  );
}

export async function regenerateSceneVariantsAction(formData: FormData) {
  const adminUser = await requireAdmin();
  const sceneId = parseRequiredIdFromForm(formData.get("sceneId"), "sceneId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), `/admin/scenes/${sceneId}`);
  const variantCount = parseVariantCount(
    formData.get("variantCount") == null ? null : Number(formData.get("variantCount")),
    3,
  );
  const retainChunkRatio = parseRetainChunkRatio(
    formData.get("retainChunkRatio") == null ? null : Number(formData.get("retainChunkRatio")),
    0.6,
  );
  const force = parseBooleanFromForm(formData.get("force"), false);

  await regenerateSceneVariants({
    sceneId,
    variantCount,
    retainChunkRatio,
    force,
    createdBy: adminUser.id,
  });
  refreshAdminPages(sceneId);
  redirect(
    appendAdminNotice(
      returnTo,
      force ? ADMIN_NOTICE.variantsForceRegenerated : ADMIN_NOTICE.variantsRegenerated,
    ),
  );
}

export async function syncSeedScenesAction() {
  await requireAdmin();
  await runSeedScenesSync();
  refreshAdminPages();
  redirect(appendAdminNotice("/admin", ADMIN_NOTICE.seedSynced));
}

export async function handleUpdateAdminUserAccessStatusAction(
  formData: FormData,
  dependencies: UpdateAdminUserAccessStatusActionDependencies = updateAdminUserAccessStatusActionDependencies,
) {
  await dependencies.requireAdmin();

  const userId = parseRequiredIdFromForm(formData.get("userId"), "userId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/users");

  try {
    const accessStatus = parseUserAccessStatus(formData.get("accessStatus"));
    await dependencies.updateAdminUserAccessStatus({
      userId,
      accessStatus,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, USER_ACCESS_STATUS_NOTICE.invalid, "danger"),
      );
    }
    if (error instanceof NotFoundError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, USER_ACCESS_STATUS_NOTICE.notFound, "danger"),
      );
    }
    throw error;
  }

  dependencies.revalidatePath("/admin");
  dependencies.revalidatePath("/admin/users");
  return dependencies.redirect(
    appendAdminNotice(returnTo, USER_ACCESS_STATUS_NOTICE.updated, "success"),
  );
}

export async function updateAdminUserAccessStatusAction(formData: FormData) {
  return handleUpdateAdminUserAccessStatusAction(formData);
}

export type CreateAdminInviteCodesActionState = {
  notice: string | null;
  tone: "success" | "danger";
  codes: Array<{
    id: string;
    code: string;
    maxUses: number;
    expiresAt: string | null;
  }>;
};

const parseOptionalNumberFromForm = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new ValidationError("number value is invalid.");
  }
  return parsed;
};

export async function handleCreateAdminInviteCodesAction(
  _previousState: CreateAdminInviteCodesActionState,
  formData: FormData,
  dependencies: CreateAdminInviteCodesActionDependencies = createAdminInviteCodesActionDependencies,
): Promise<CreateAdminInviteCodesActionState> {
  await dependencies.requireAdmin();

  try {
    const modeValue = String(formData.get("mode") ?? "auto");
    const mode = modeValue === "manual" ? "manual" : "auto";
    const codes = await dependencies.createAdminInviteCodes({
      mode,
      code: String(formData.get("code") ?? ""),
      count: parseOptionalNumberFromForm(formData.get("count")),
      maxUses: parseOptionalNumberFromForm(formData.get("maxUses")),
      expiresInDays: parseOptionalNumberFromForm(formData.get("expiresInDays")),
    });

    dependencies.revalidatePath("/admin");
    dependencies.revalidatePath("/admin/invites");

    return {
      notice: `已生成 ${codes.length} 个邀请码。请现在复制，刷新后不会再显示明文。`,
      tone: "success",
      codes,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        notice: ADMIN_NOTICE.inviteInvalid,
        tone: "danger",
        codes: [],
      };
    }
    throw error;
  }
}

export async function createAdminInviteCodesAction(
  previousState: CreateAdminInviteCodesActionState,
  formData: FormData,
) {
  return handleCreateAdminInviteCodesAction(previousState, formData);
}

export async function handleUpdateAdminInviteCodeAction(
  formData: FormData,
  dependencies: UpdateAdminInviteCodeActionDependencies = updateAdminInviteCodeActionDependencies,
) {
  await dependencies.requireAdmin();

  const inviteCodeId = parseRequiredIdFromForm(formData.get("inviteCodeId"), "inviteCodeId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/invites");
  const action = String(formData.get("inviteAction") ?? "update");

  try {
    await dependencies.updateAdminInviteCode({
      inviteCodeId,
      isActive: action === "deactivate" ? false : action === "activate" ? true : undefined,
      maxUses: action === "update" ? parseOptionalNumberFromForm(formData.get("maxUses")) : undefined,
      expiresInDays:
        action === "update" ? parseOptionalNumberFromForm(formData.get("expiresInDays")) : undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, ADMIN_NOTICE.inviteInvalid, "danger"),
      );
    }
    if (error instanceof NotFoundError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, ADMIN_NOTICE.inviteNotFound, "danger"),
      );
    }
    throw error;
  }

  dependencies.revalidatePath("/admin");
  dependencies.revalidatePath("/admin/invites");
  return dependencies.redirect(
    appendAdminNotice(returnTo, ADMIN_NOTICE.invitesUpdated, "success"),
  );
}

export async function updateAdminInviteCodeAction(formData: FormData) {
  return handleUpdateAdminInviteCodeAction(formData);
}

export async function handleUpdateAdminRegistrationModeAction(
  formData: FormData,
  dependencies: UpdateAdminRegistrationModeActionDependencies = updateAdminRegistrationModeActionDependencies,
) {
  const adminUser = await dependencies.requireAdmin();
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/invites");
  const mode = String(formData.get("registrationMode") ?? "");

  try {
    await dependencies.updateAdminRegistrationMode({
      mode: mode as never,
      updatedBy: adminUser.id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, ADMIN_NOTICE.registrationModeInvalid, "danger"),
      );
    }
    throw error;
  }

  dependencies.revalidatePath("/admin");
  dependencies.revalidatePath("/admin/invites");
  dependencies.revalidatePath("/signup");
  return dependencies.redirect(
    appendAdminNotice(returnTo, ADMIN_NOTICE.registrationModeUpdated, "success"),
  );
}

export async function updateAdminRegistrationModeAction(formData: FormData) {
  return handleUpdateAdminRegistrationModeAction(formData);
}

export async function handleUpdateAdminHighCostControlAction(
  formData: FormData,
  dependencies: UpdateAdminHighCostControlActionDependencies = updateAdminHighCostControlActionDependencies,
) {
  const adminUser = await dependencies.requireAdmin();
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin");
  const capability = String(formData.get("capability") ?? "");
  const disabled = parseBooleanFromForm(formData.get("disabled"), false);

  try {
    await dependencies.updateAdminHighCostCapabilityDisabled({
      capability: capability as never,
      disabled,
      updatedBy: adminUser.id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return dependencies.redirect(
        appendAdminNotice(returnTo, ADMIN_NOTICE.highCostControlInvalid, "danger"),
      );
    }
    throw error;
  }

  dependencies.revalidatePath("/admin");
  return dependencies.redirect(
    appendAdminNotice(returnTo, ADMIN_NOTICE.highCostControlUpdated, "success"),
  );
}

export async function updateAdminHighCostControlAction(formData: FormData) {
  return handleUpdateAdminHighCostControlAction(formData);
}

export async function deleteAdminPhraseAction(formData: FormData) {
  await requireAdmin();
  const userPhraseId = parseRequiredIdFromForm(formData.get("userPhraseId"), "userPhraseId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/phrases");
  await deleteAdminUserPhraseById(userPhraseId);
  revalidatePath("/admin/phrases");
  redirect(appendAdminNotice(returnTo, ADMIN_NOTICE.phraseDeleted));
}

export async function enrichAdminPhraseAction(formData: FormData) {
  await requireAdmin();
  const userPhraseId = parseRequiredIdFromForm(formData.get("userPhraseId"), "userPhraseId");
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/phrases");
  let notice: string = ADMIN_NOTICE.phraseEnrichSubmitted;
  let tone: "success" | "danger" = "success";

  try {
    await enrichAdminUserPhraseById(userPhraseId);
  } catch (error) {
    console.warn("[admin][phrases] enrich failed", {
      userPhraseId,
      error: error instanceof Error ? error.message : "unknown",
    });
    notice = ADMIN_NOTICE.phraseEnrichFailed;
    tone = "danger";
  }

  revalidatePath("/admin/phrases");
  redirect(appendAdminNotice(returnTo, notice, tone));
}

export async function enrichAdminPhrasesBatchAction(formData: FormData) {
  await requireAdmin();
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/phrases");
  const userPhraseIds = formData
    .getAll("userPhraseIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (userPhraseIds.length === 0) {
    revalidatePath("/admin/phrases");
    redirect(appendAdminNotice(returnTo, ADMIN_NOTICE.batchSelectFirst, "info"));
  }

  let notice: string = `已批量补全 ${userPhraseIds.length} 条表达。`;
  let tone: "success" | "danger" = "success";

  try {
    await enrichAdminUserPhrasesByIds(userPhraseIds);
  } catch (error) {
    console.warn("[admin][phrases] batch enrich failed", {
      total: userPhraseIds.length,
      error: error instanceof Error ? error.message : "unknown",
    });
    notice = ADMIN_NOTICE.batchEnrichFailed;
    tone = "danger";
  }

  revalidatePath("/admin/phrases");
  redirect(appendAdminNotice(returnTo, notice, tone));
}
