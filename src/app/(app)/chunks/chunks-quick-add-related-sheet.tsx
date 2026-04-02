"use client";

import { RefObject } from "react";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { formatLoadingText, LoadingButton } from "@/components/shared/action-loading";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ChunksQuickAddRelatedSheet({
  open,
  saving,
  text,
  relationType,
  targetText,
  inputRef,
  validationMessage,
  libraryHint,
  labels,
  applePanelClassName,
  appleButtonStrongClassName,
  appleInputPanelClassName,
  appleMetaTextClassName,
  appleBannerDangerClassName,
  appleBannerInfoClassName,
  appleListItemClassName,
  onOpenChange,
  onCopyTarget,
  onTextChange,
  onRelationTypeChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  text: string;
  relationType: "similar" | "contrast";
  targetText: string;
  inputRef: RefObject<HTMLInputElement | null>;
  validationMessage: string | null;
  libraryHint: string | null;
  labels: {
    title: string;
    description: string;
    targetLabel: string;
    copyTarget: string;
    textLabel: string;
    textPlaceholder: string;
    relationTypeLabel: string;
    similar: string;
    contrast: string;
    submit: string;
  };
  applePanelClassName: string;
  appleButtonStrongClassName: string;
  appleInputPanelClassName: string;
  appleMetaTextClassName: string;
  appleBannerDangerClassName: string;
  appleBannerInfoClassName: string;
  appleListItemClassName: string;
  onOpenChange: (open: boolean) => void;
  onCopyTarget: () => void;
  onTextChange: (value: string) => void;
  onRelationTypeChange: (value: "similar" | "contrast") => void;
  onSubmit: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        overlayClassName="z-[80]"
        className={`z-[81] max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${applePanelClassName}`}
      >
        <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <button
            type="button"
            className={`w-full p-3 text-left transition ${appleListItemClassName}`}
            onClick={onCopyTarget}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className={appleMetaTextClassName}>{labels.targetLabel}</p>
                <p className={appleMetaTextClassName}>{labels.copyTarget}</p>
              </div>
              <p className="text-sm font-medium">{targetText}</p>
            </div>
          </button>

          <div className="space-y-1">
            <p className={appleMetaTextClassName}>{labels.textLabel}</p>
            <Input
              className={appleInputPanelClassName}
              ref={inputRef}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={labels.textPlaceholder}
            />
            {validationMessage ? (
              <p className={appleBannerDangerClassName}>{validationMessage}</p>
            ) : libraryHint ? (
              <p className={appleBannerInfoClassName}>{libraryHint}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className={appleMetaTextClassName}>{labels.relationTypeLabel}</p>
            <SegmentedControl
              ariaLabel={labels.relationTypeLabel}
              value={relationType}
              onChange={(value) => onRelationTypeChange(value === "contrast" ? "contrast" : "similar")}
              options={[
                { value: "similar", label: labels.similar },
                { value: "contrast", label: labels.contrast },
              ]}
            />
          </div>
        </div>

        <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="grid gap-2 pb-safe">
            <LoadingButton
              type="button"
              variant="ghost"
              className={appleButtonStrongClassName}
              disabled={!text.trim() || Boolean(validationMessage)}
              loading={saving}
              loadingText={formatLoadingText(labels.submit)}
              onClick={onSubmit}
            >
              {labels.submit}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
