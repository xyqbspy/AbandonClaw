"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteSceneById,
  regenerateSceneVariants,
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
