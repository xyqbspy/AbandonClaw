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
            ? "更新中..."
            : isPublic
              ? "设为私有"
              : "设为公开"}
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
          {loadingGenerate ? "重新生成中..." : "重新生成变体"}
        </Button>
      </form>

      <form
        action={regenerateSceneVariantsAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "强制重新生成会跳过缓存并再次调用模型（会增加成本），是否继续？",
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
          {loadingForceGenerate ? "强制生成中..." : "强制重新生成"}
        </Button>
      </form>

      <form
        action={deleteSceneAction}
        onSubmit={(event) => {
          const warning = `确认删除场景 ${sceneId}？该操作会永久删除场景、变体和学习进度。`;
          const firstConfirmed = window.confirm(warning);
          if (!firstConfirmed) {
            event.preventDefault();
            return;
          }
          const finalConfirmed = window.confirm(
            "最终确认：该操作不可撤销，是否继续删除？",
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
          {loadingDelete ? "删除中..." : "删除场景"}
        </Button>
      </form>
    </div>
  );
}
