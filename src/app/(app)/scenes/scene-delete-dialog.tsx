"use client";

import { SceneListItemResponse } from "@/lib/utils/scenes-api";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

const sceneDeleteDialogClassName =
  "w-full max-w-[clamp(280px,82vw,320px)] overflow-hidden rounded-[var(--mobile-adapt-overlay-card-radius)] bg-[rgba(255,255,255,0.88)] shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition-transform duration-200";
const sceneDeleteDialogButtonClassName =
  "h-[var(--mobile-adapt-overlay-footer-button-height)] cursor-pointer bg-transparent text-[length:var(--mobile-adapt-font-sheet-body)] font-bold";

export function SceneDeleteDialog({
  pendingDeleteScene,
  deletingSceneId,
  onCancel,
  onConfirm,
}: {
  pendingDeleteScene: SceneListItemResponse | null;
  deletingSceneId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      data-delete-modal="true"
      className={`fixed inset-0 z-30 flex items-center justify-center bg-black/20 px-6 backdrop-blur-[10px] transition-opacity duration-200 ${pendingDeleteScene ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className={`${sceneDeleteDialogClassName} ${pendingDeleteScene ? "translate-y-0 scale-100" : "translate-y-[10px] scale-[0.96]"}`}>
        <div className="px-[var(--mobile-adapt-space-sheet)] pb-[var(--mobile-adapt-space-lg)] pt-[calc(var(--mobile-adapt-space-lg)+var(--mobile-adapt-space-2xs))] text-center">
          <div className="mb-[var(--mobile-adapt-space-sm)] text-[length:clamp(1rem,4.6vw,1.15rem)] font-extrabold tracking-[-0.02em] text-[#1D1D1F]">
            删除场景？
          </div>
          <div className={`text-[length:var(--mobile-adapt-font-body-sm)] leading-[1.45] ${APPLE_META_TEXT}`}>
            这个场景会从列表中移除，删除后无法恢复。
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-[rgba(60,60,67,0.12)] bg-[rgba(255,255,255,0.6)]">
          <button
            type="button"
            className={`${sceneDeleteDialogButtonClassName} text-[#007AFF]`}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className={`${sceneDeleteDialogButtonClassName} border-l border-[rgba(60,60,67,0.12)] text-[#FF3B30] disabled:opacity-60`}
            disabled={!pendingDeleteScene || deletingSceneId === pendingDeleteScene.id}
            onClick={onConfirm}
          >
            {deletingSceneId === pendingDeleteScene?.id ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
    </div>
  );
}
