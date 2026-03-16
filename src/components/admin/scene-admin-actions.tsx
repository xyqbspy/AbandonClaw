"use client";

import { useState } from "react";
import {
  deleteSceneAction,
  regenerateSceneVariantsAction,
  toggleSceneVisibilityAction,
} from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";

export function SceneAdminActions({
  sceneId,
  isPublic,
}: {
  sceneId: string;
  isPublic: boolean;
}) {
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingForceGenerate, setLoadingForceGenerate] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={toggleSceneVisibilityAction}
        onSubmit={() => setLoadingToggle(true)}
      >
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="nextPublic" value={String(!isPublic)} />
        <Button type="submit" variant="outline" size="sm" disabled={loadingToggle}>
          {loadingToggle
            ? "Updating..."
            : isPublic
              ? "Set Private"
              : "Set Public"}
        </Button>
      </form>

      <form
        action={regenerateSceneVariantsAction}
        onSubmit={() => setLoadingGenerate(true)}
      >
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <Button type="submit" variant="secondary" size="sm" disabled={loadingGenerate}>
          {loadingGenerate ? "Regenerating..." : "Regenerate Variants"}
        </Button>
      </form>

      <form
        action={regenerateSceneVariantsAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "Force regenerate bypasses cache and will call the model again (cost increase). Continue?",
          );
          if (!confirmed) {
            event.preventDefault();
            return;
          }
          setLoadingForceGenerate(true);
        }}
      >
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <input type="hidden" name="force" value="true" />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={loadingForceGenerate}
        >
          {loadingForceGenerate ? "Forcing..." : "Force Regenerate"}
        </Button>
      </form>

      <form
        action={deleteSceneAction}
        onSubmit={(event) => {
          const warning = `Delete scene ${sceneId}? This permanently removes scene, variants, and progress rows.`;
          const firstConfirmed = window.confirm(warning);
          if (!firstConfirmed) {
            event.preventDefault();
            return;
          }
          const finalConfirmed = window.confirm(
            "Final confirmation: this action cannot be undone. Continue deleting?",
          );
          if (!finalConfirmed) {
            event.preventDefault();
            return;
          }
          setLoadingDelete(true);
        }}
      >
        <input type="hidden" name="sceneId" value={sceneId} />
        <Button type="submit" variant="destructive" size="sm" disabled={loadingDelete}>
          {loadingDelete ? "Deleting..." : "Delete Scene"}
        </Button>
      </form>
    </div>
  );
}
