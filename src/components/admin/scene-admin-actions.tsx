"use client";

import { useState } from "react";
import { Eye, EyeOff, GitBranch, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteSceneAction,
  regenerateSceneVariantsAction,
  toggleSceneVisibilityAction,
} from "@/app/(app)/admin/actions";
import { AdminActionButton, AdminConfirmActionButton } from "@/components/admin/admin-action-button";
import { LoadingContent } from "@/components/shared/action-loading";

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

  const toggleLabel = isPublic ? "设为私有" : "设为公开";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={toggleSceneVisibilityAction} onSubmit={() => setLoadingToggle(true)}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="nextPublic" value={String(!isPublic)} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <AdminActionButton
          type="submit"
          disabled={loadingToggle}
        >
          <LoadingContent loading={loadingToggle} loadingText="更新中...">
            {isPublic ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {toggleLabel}
          </LoadingContent>
        </AdminActionButton>
      </form>

      <form action={regenerateSceneVariantsAction} onSubmit={() => setLoadingGenerate(true)}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <AdminActionButton
          type="submit"
          disabled={loadingGenerate}
        >
          <LoadingContent loading={loadingGenerate} loadingText="生成中...">
            <GitBranch className="size-3.5" />
            重新生成变体
          </LoadingContent>
        </AdminActionButton>
      </form>

      <form action={regenerateSceneVariantsAction}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="variantCount" value="3" />
        <input type="hidden" name="retainChunkRatio" value="0.6" />
        <input type="hidden" name="force" value="true" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <AdminConfirmActionButton
          type="submit"
          disabled={loadingForceGenerate}
          confirmText="强制重新生成会跳过缓存并再次调用模型，会增加成本，是否继续？"
          pendingText="强制生成中..."
          onClick={() => setLoadingForceGenerate(true)}
        >
          <LoadingContent loading={loadingForceGenerate} loadingText="强制生成中...">
            <RefreshCw className="size-3.5" />
            强制重新生成
          </LoadingContent>
        </AdminConfirmActionButton>
      </form>

      <form action={deleteSceneAction}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <AdminConfirmActionButton
          type="submit"
          tone="danger"
          disabled={loadingDelete}
          confirmText={`确认删除场景 ${sceneId}？该操作会永久删除场景、关联变体和场景音频。`}
          finalConfirmText="最终确认：该操作不可撤销，是否继续删除？"
          pendingText="删除中..."
          onClick={() => setLoadingDelete(true)}
        >
          <LoadingContent loading={loadingDelete} loadingText="删除中...">
            <Trash2 className="size-3.5" />
            删除场景
          </LoadingContent>
        </AdminConfirmActionButton>
      </form>
    </div>
  );
}
