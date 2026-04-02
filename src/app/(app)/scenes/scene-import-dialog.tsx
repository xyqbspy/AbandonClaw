"use client";

import { LoadingButton } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { APPLE_BANNER_DANGER, APPLE_META_TEXT, APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";

const placeholderExample = `A: Are we still on for dinner?
B: I was just about to text you. Something came up at work.
A: Again?
B: Yeah, I'm stuck at the office.`;
const sheetPanelClassName = `${APPLE_PANEL_RAISED} rounded-[var(--mobile-adapt-overlay-card-radius)] p-[var(--mobile-adapt-space-md)]`;
const sheetLabelClassName =
  "mb-[var(--mobile-adapt-space-sm)] block pl-0.5 text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-[#1d1d1f]";
const sceneSheetClassName =
  "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[var(--mobile-adapt-overlay-radius)] bg-[#F2F2F7] sm:rounded-[var(--mobile-adapt-overlay-radius)]";
const sceneSheetTitleClassName =
  "mb-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-sheet-title)] font-bold text-[#1d1d1f]";
const sceneSheetDescClassName =
  `text-[length:var(--mobile-adapt-font-body-sm)] ${APPLE_META_TEXT}`;
const sceneSheetButtonClassName =
  "h-[var(--mobile-adapt-overlay-footer-button-height)] text-[length:var(--mobile-adapt-font-sheet-body)]";

export function SceneImportDialog({
  open,
  input,
  error,
  importing,
  onClose,
  onInputChange,
  onSubmit,
}: {
  open: boolean;
  input: string;
  error: string;
  importing: boolean;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[10px] animate-in fade-in-0 duration-200">
      <button
        type="button"
        aria-label="关闭导入弹窗"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 z-10 animate-in slide-in-from-bottom-6 fade-in-0 duration-300 sm:inset-auto sm:bottom-6 sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:zoom-in-95">
        <div data-import-dialog="true" className={sceneSheetClassName}>
          <div className="mx-auto my-[var(--mobile-adapt-space-sm)] h-[clamp(4px,1vw,5px)] w-[clamp(32px,9vw,36px)] rounded-full bg-[var(--app-scene-panel-pending-border)]" />
          <div className="px-[var(--mobile-adapt-space-sheet)] pb-[var(--mobile-adapt-space-md)]">
            <h2 className={sceneSheetTitleClassName}>导入自定义场景</h2>
            <p className={sceneSheetDescClassName}>
              粘贴英文对话内容，系统会自动解析成当前场景结构。
            </p>
          </div>

          <div className="flex-1 space-y-[var(--mobile-adapt-space-lg)] overflow-y-auto px-[var(--mobile-adapt-space-md)] pb-[var(--mobile-adapt-space-lg)]">
            <div className={sheetPanelClassName}>
              <label htmlFor="scene-import-input" className={sheetLabelClassName}>
                场景文本
              </label>
              <Textarea
                id="scene-import-input"
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder={placeholderExample}
                className="min-h-44 border-0 bg-transparent px-0 py-0 text-[length:var(--mobile-adapt-font-sheet-body)] leading-[1.5] text-[#1d1d1f] shadow-none focus-visible:ring-0"
                disabled={importing}
              />
              <p className={`mt-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-meta)] leading-[1.4] ${APPLE_META_TEXT}`}>
                建议按对话格式粘贴，例如每行一条，包含说话人和内容。
              </p>
            </div>

            {error ? <div className={APPLE_BANNER_DANGER}>{error}</div> : null}
          </div>

          <div className="bg-[var(--app-surface-subtle)] px-[var(--mobile-adapt-space-md)] pb-[calc(env(safe-area-inset-bottom)+var(--mobile-adapt-space-lg))] pt-[var(--mobile-adapt-space-sm)]">
            <div className="grid grid-cols-2 gap-[var(--mobile-adapt-space-sm)]">
              <Button
                type="button"
                variant="secondary"
                radius="lg"
                className={sceneSheetButtonClassName}
                onClick={onClose}
                disabled={importing}
              >
                取消
              </Button>
              <LoadingButton
                type="button"
                variant="default"
                radius="lg"
                className={`${sceneSheetButtonClassName} w-full`}
                onClick={onSubmit}
                loading={importing}
                loadingText="导入中..."
              >
                导入场景
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
