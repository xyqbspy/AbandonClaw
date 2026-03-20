"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { runSeedScenesSync } from "@/lib/server/services/scene-service";
import {
  parseBooleanFromForm,
  parseRequiredIdFromForm,
  parseRetainChunkRatio,
  parseVariantCount,
} from "@/lib/server/validation";

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
  await deleteSceneById(sceneId);
  refreshAdminPages(sceneId);
  redirect("/admin/scenes");
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
  await updateSceneVisibility({ sceneId, isPublic: nextPublic });
  refreshAdminPages(sceneId);
}

export async function regenerateSceneVariantsAction(formData: FormData) {
  const adminUser = await requireAdmin();
  const sceneId = parseRequiredIdFromForm(formData.get("sceneId"), "sceneId");
  const variantCount = parseVariantCount(
    formData.get("variantCount") == null
      ? null
      : Number(formData.get("variantCount")),
    3,
  );
  const retainChunkRatio = parseRetainChunkRatio(
    formData.get("retainChunkRatio") == null
      ? null
      : Number(formData.get("retainChunkRatio")),
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
}

export async function syncSeedScenesAction() {
  await requireAdmin();
  await runSeedScenesSync();
  refreshAdminPages();
}

export async function deleteAdminPhraseAction(formData: FormData) {
  await requireAdmin();
  const userPhraseId = parseRequiredIdFromForm(formData.get("userPhraseId"), "userPhraseId");
  await deleteAdminUserPhraseById(userPhraseId);
  revalidatePath("/admin/phrases");
}

export async function enrichAdminPhraseAction(formData: FormData) {
  await requireAdmin();
  const userPhraseId = parseRequiredIdFromForm(formData.get("userPhraseId"), "userPhraseId");
  try {
    await enrichAdminUserPhraseById(userPhraseId);
  } catch (error) {
    console.warn("[admin][phrases] enrich failed", {
      userPhraseId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  revalidatePath("/admin/phrases");
}

export async function enrichAdminPhrasesBatchAction(formData: FormData) {
  await requireAdmin();
  const userPhraseIds = formData
    .getAll("userPhraseIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (userPhraseIds.length === 0) {
    revalidatePath("/admin/phrases");
    return;
  }
  try {
    await enrichAdminUserPhrasesByIds(userPhraseIds);
  } catch (error) {
    console.warn("[admin][phrases] batch enrich failed", {
      total: userPhraseIds.length,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  revalidatePath("/admin/phrases");
}
