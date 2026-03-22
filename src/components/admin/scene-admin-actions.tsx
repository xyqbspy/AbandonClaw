"use client";

import { useState } from "react";
import {
  deleteSceneAction,
  regenerateSceneVariantsAction,
  toggleSceneVisibilityAction,
} from "@/app/(app)/admin/actions";
import { ConfirmButton } from "@/components/shared/confirm-action";
import { Button } from "@/components/ui/button";

export function SceneAdminActions({
  sceneId,
  isPublic,
  returnTo,
}: {
  sceneId: string;
  isPublic: boolean;
  returnTo: string;
}) {
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingForceGenerate, setLoadingForceGenerate] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={toggleSceneVisibilityAction} onSubmit={() => setLoadingToggle(true)}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="nextPublic" value={String(!isPublic)} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" variant="outline" size="sm" disabled={loadingToggle}>
          {loadingToggle ? "更新中..." : isPublic ? "设为私有" : "设为公开"}
        </Button>
      </form>

      <form action={regenerateSceneVariantsAction} onSubmit={() => setLoadingGenerate(true)}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" variant="secondary" size="sm" disabled={loadingGenerate}>
          {loadingGenerate ? "生成中..." : "重新生成变体"}
        </Button>
      </form>

      <form action={regenerateSceneVariantsAction}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <input type="hidden" name="force" value="true" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <ConfirmButton
          type="submit"
          variant="outline"
          size="sm"
          disabled={loadingForceGenerate}
          confirmText="强制重新生成会跳过缓存并再次调用模型，会增加成本，是否继续？"
          pendingText="强制生成中..."
          onClick={() => setLoadingForceGenerate(true)}
        >
          {loadingForceGenerate ? "强制生成中..." : "强制重新生成"}
        </ConfirmButton>
      </form>

      <form action={deleteSceneAction}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <ConfirmButton
          type="submit"
          variant="destructive"
          size="sm"
          disabled={loadingDelete}
          confirmText={`确认删除场景 ${sceneId}？该操作会永久删除场景、关联变体和场景音频。`}
          finalConfirmText="最终确认：该操作不可撤销，是否继续删除？"
          pendingText="删除中..."
          onClick={() => setLoadingDelete(true)}
        >
          {loadingDelete ? "删除中..." : "删除场景"}
        </ConfirmButton>
      </form>
    </div>
  );
}
