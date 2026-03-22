"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendAdminNotice, normalizeAdminReturnTo } from "@/app/(app)/admin/admin-page-state";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteAdminUserPhraseById,
  enrichAdminUserPhraseById,
  enrichAdminUserPhrasesByIds,
  deleteSceneById,
  regenerateSceneVariants,
  updateSceneSentencesById,
  updateSceneVisibility,
} from "@/lib/server/admin/service";
import { runSeedScenesSync } from "@/lib/server/scene/service";
import {
  parseBooleanFromForm,
  parseRequiredIdFromForm,
  parseRetainChunkRatio,
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
} as const;

const refreshAdminPages = (sceneId?: string) => {
  revalidatePath("/admin");
  revalidatePath("/admin/scenes");
  revalidatePath("/admin/phrases");
  revalidatePath("/admin/imported");
  revalidatePath("/admin/variants");
  revalidatePath("/admin/cache");
  if (sceneId) {
    revalidatePath(`/admin/scenes/${sceneId}`);
  }
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
  let notice = ADMIN_NOTICE.phraseEnrichSubmitted;
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

  let notice = `已批量补全 ${userPhraseIds.length} 条表达。`;
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
