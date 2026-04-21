"use client";

import { ComponentProps, ReactNode } from "react";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatLoadingText, LoadingButton } from "@/components/shared/action-loading";
import { SegmentedControl } from "@/components/shared/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FocusDetailSheet } from "@/features/chunks/components/focus-detail-sheet";
import { MoveIntoClusterSheet } from "@/features/chunks/components/move-into-cluster-sheet";
import { ExpressionMapSheet } from "@/features/chunks/components/expression-map-sheet";
import { cn } from "@/lib/utils";
import { ChunksQuickAddRelatedSheet } from "./chunks-quick-add-related-sheet";

type ManualAssistCandidate = {
  text: string;
  differenceLabel?: string | null;
};

type ManualAssistInputItem = {
  text: string;
  translation?: string | null;
  usageNote?: string | null;
  examples: Array<{ en: string; zh: string }>;
};

type ManualExpressionAssistState = {
  inputItem: ManualAssistInputItem;
  similarExpressions: ManualAssistCandidate[];
  contrastExpressions: ManualAssistCandidate[];
} | null;

type ManualSheetState = {
  title: string;
  description: string;
  itemTypeLabel: string;
  footerGridClassName: string;
  isSaving: boolean;
  isPrimarySaving: boolean;
  isSecondarySaving: boolean;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  showSecondaryAction: boolean;
};

type GeneratedSimilarSheetState = {
  title: string;
  description: string;
  showSeedExpression: boolean;
  centerExpressionLabel: string;
  showGenerating: boolean;
  generatingLabel: string;
  showEmpty: boolean;
  emptyLabel: string;
  showCandidates: boolean;
  closeLabel: string;
  submitLabel: string;
};

type ChunksPageSheetsProps = {
  manual: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemType: "expression" | "sentence";
    onItemTypeChange: (value: "expression" | "sentence") => void;
    text: string;
    onTextChange: (value: string) => void;
    sentence: string;
    onSentenceChange: (value: string) => void;
    saving: boolean;
    state: ManualSheetState;
    assistLoading: boolean;
    assist: ManualExpressionAssistState;
    selectedMap: Record<string, boolean>;
    onLoadAssist: () => void;
    onToggleSelected: (text: string) => void;
    onSave: (mode: "save" | "save_and_review") => void;
    onReset: () => void;
    clearAssist: () => void;
    normalizeSimilarLabel: (label: string | null | undefined) => string;
    renderExampleSentenceCards: (
      examples: Array<{ en: string; zh: string }>,
      expression: string,
      options?: {
        onSpeak?: (text: string) => void;
        isSpeakingText?: (text: string) => boolean;
        isLoadingText?: (text: string) => boolean;
      },
    ) => ReactNode;
    handlePronounceSentence: (text: string | null | undefined) => void;
    speakingText: string | null;
    loadingText: string | null;
    labels: Record<string, string>;
  };
  quickAdd: ComponentProps<typeof ChunksQuickAddRelatedSheet>;
  generatedSimilar: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    savingSelected: boolean;
    generatingForId: string | null;
    seedExpressionText: string;
    candidates: Array<{ text: string; differenceLabel?: string | null }>;
    selectedMap: Record<string, boolean>;
    onToggleCandidate: (text: string) => void;
    onSaveSelected: () => void;
    onReset: () => void;
    state: GeneratedSimilarSheetState;
    normalizeSimilarLabel: (label: string | null | undefined) => string;
    close: () => void;
  };
  focusDetail: ComponentProps<typeof FocusDetailSheet>;
  moveIntoCluster: ComponentProps<typeof MoveIntoClusterSheet>;
  expressionMap: ComponentProps<typeof ExpressionMapSheet>;
  apple: {
    panel: string;
    button: string;
    buttonStrong: string;
    inputPanel: string;
    metaText: string;
    bannerDanger: string;
    bannerInfo: string;
    listItem: string;
  };
};

export function ChunksPageSheets({
  manual,
  quickAdd,
  generatedSimilar,
  focusDetail,
  moveIntoCluster,
  expressionMap,
  apple,
}: ChunksPageSheetsProps) {
  const overlayPrimaryButtonClassName = cn(
    "app-button app-button-primary",
    "h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] border px-[var(--mobile-space-sheet)] text-[length:var(--mobile-font-sheet-body)] font-semibold [@media(max-height:760px)]:h-[var(--mobile-control-height)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]",
  );

  const overlaySecondaryButtonClassName = cn(
    "app-button app-button-secondary",
    "h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] border px-[var(--mobile-space-sheet)] text-[length:var(--mobile-font-sheet-body)] font-semibold shadow-none [@media(max-height:760px)]:h-[var(--mobile-control-height)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]",
  );

  return (
    <>
      <Sheet
        open={manual.open}
        onOpenChange={(open) => {
          manual.onOpenChange(open);
          if (!open && !manual.saving) manual.onReset();
        }}
      >
        <SheetContent
          side="bottom"
          className={`max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${apple.panel}`}
        >
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>{manual.state.title}</SheetTitle>
            <SheetDescription>{manual.state.description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-1">
              <p className={apple.metaText}>{manual.state.itemTypeLabel}</p>
              <SegmentedControl
                ariaLabel={manual.state.itemTypeLabel}
                value={manual.itemType}
                onChange={(value) =>
                  manual.onItemTypeChange(value === "sentence" ? "sentence" : "expression")
                }
                options={[
                  { value: "expression", label: manual.labels.itemTypeExpression },
                  { value: "sentence", label: manual.labels.itemTypeSentence },
                ]}
              />
            </div>

            {manual.itemType === "expression" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className={apple.metaText}>{manual.labels.expressionTextLabel}</p>
                  <Input
                    className={apple.inputPanel}
                    value={manual.text}
                    onChange={(event) => {
                      manual.onTextChange(event.target.value);
                      manual.clearAssist();
                    }}
                    placeholder={manual.labels.expressionTextPlaceholder}
                  />
                </div>
                <LoadingButton
                  type="button"
                  variant="ghost"
                  className={apple.button}
                  disabled={!manual.text.trim()}
                  loading={manual.assistLoading}
                  loadingText={formatLoadingText(manual.labels.generatingSuggestions)}
                  onClick={() => manual.onLoadAssist()}
                >
                  {manual.labels.findMoreRelated}
                </LoadingButton>
                {manual.assist ? (
                  <div className={`space-y-3 p-3 ${apple.panel}`}>
                    <div className={`space-y-1 p-3 ${apple.listItem}`}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={Boolean(
                            manual.selectedMap[
                              normalizePhraseText(manual.assist.inputItem.text)
                            ],
                          )}
                          onChange={() => manual.onToggleSelected(manual.assist!.inputItem.text)}
                        />
                        <div className="space-y-1">
                          <p className={apple.metaText}>{manual.labels.currentInputCard}</p>
                          <p className="text-sm font-medium">{manual.assist.inputItem.text}</p>
                          {manual.assist.inputItem.translation ? (
                            <p className={apple.metaText}>{manual.assist.inputItem.translation}</p>
                          ) : null}
                          {manual.assist.inputItem.usageNote ? (
                            <p className={apple.metaText}>{manual.assist.inputItem.usageNote}</p>
                          ) : null}
                          {manual.renderExampleSentenceCards(
                            manual.assist.inputItem.examples,
                            manual.assist.inputItem.text,
                            {
                              onSpeak: manual.handlePronounceSentence,
                              isSpeakingText: (text) =>
                                Boolean(text) && manual.speakingText === text.trim(),
                              isLoadingText: (text) =>
                                Boolean(text) && manual.loadingText === text.trim(),
                            },
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className={apple.metaText}>{manual.labels.similarExpressionsAuto}</p>
                      {manual.assist.similarExpressions.length > 0 ? (
                        manual.assist.similarExpressions.map((candidate) => (
                          <label
                            key={`similar-${candidate.text}`}
                            className={`flex cursor-pointer items-start gap-2 p-3 ${apple.listItem}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(
                                manual.selectedMap[normalizePhraseText(candidate.text)],
                              )}
                              onChange={() => manual.onToggleSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className={apple.metaText}>
                                {manual.normalizeSimilarLabel(candidate.differenceLabel)}
                              </p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className={apple.metaText}>{manual.labels.similarEmpty}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className={apple.metaText}>{manual.labels.contrastExpressionsAuto}</p>
                      {manual.assist.contrastExpressions.length > 0 ? (
                        manual.assist.contrastExpressions.map((candidate) => (
                          <label
                            key={`contrast-${candidate.text}`}
                            className={`flex cursor-pointer items-start gap-2 p-3 ${apple.listItem}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(
                                manual.selectedMap[normalizePhraseText(candidate.text)],
                              )}
                              onChange={() => manual.onToggleSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className={apple.metaText}>{candidate.differenceLabel}</p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className={apple.metaText}>{manual.labels.noContrastExpressions}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className={apple.metaText}>{manual.labels.sentenceMainLabel}</p>
                  <Textarea
                    className={apple.inputPanel}
                    value={manual.sentence}
                    onChange={(event) => manual.onSentenceChange(event.target.value)}
                    rows={4}
                    placeholder={manual.labels.sentenceMainPlaceholder}
                  />
                  <p className={apple.metaText}>{manual.labels.sentenceAutoHint}</p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className={`grid gap-2 pb-safe ${manual.state.footerGridClassName}`}>
              <LoadingButton
                type="button"
                variant="secondary"
                className={overlaySecondaryButtonClassName}
                disabled={manual.state.isSaving}
                loading={manual.state.isPrimarySaving}
                loadingText={formatLoadingText(manual.state.primaryActionLabel)}
                onClick={() => manual.onSave("save")}
              >
                {manual.state.primaryActionLabel}
              </LoadingButton>
              {manual.state.showSecondaryAction ? (
                <LoadingButton
                  type="button"
                  variant="default"
                  className={overlayPrimaryButtonClassName}
                  disabled={manual.state.isSaving}
                  loading={manual.state.isSecondarySaving}
                  loadingText={formatLoadingText(manual.state.secondaryActionLabel)}
                  onClick={() => manual.onSave("save_and_review")}
                >
                  {manual.state.secondaryActionLabel}
                </LoadingButton>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ChunksQuickAddRelatedSheet {...quickAdd} />

      <Sheet
        open={generatedSimilar.open}
        onOpenChange={(open) => {
          generatedSimilar.onOpenChange(open);
          if (!open && !generatedSimilar.savingSelected) {
            generatedSimilar.onReset();
          }
        }}
      >
        <SheetContent
          side="bottom"
          className={`max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${apple.panel}`}
        >
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>{generatedSimilar.state.title}</SheetTitle>
            <SheetDescription>{generatedSimilar.state.description}</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-4">
            {generatedSimilar.state.showSeedExpression ? (
              <div className={`p-2.5 ${apple.panel}`}>
                <p className={apple.metaText}>{generatedSimilar.state.centerExpressionLabel}</p>
                <p className="text-sm font-medium">{generatedSimilar.seedExpressionText}</p>
              </div>
            ) : null}
            {generatedSimilar.state.showGenerating ? (
              <p className={`text-sm ${apple.metaText}`}>{generatedSimilar.state.generatingLabel}</p>
            ) : null}
            {generatedSimilar.state.showEmpty ? (
              <p className={`text-sm ${apple.metaText}`}>{generatedSimilar.state.emptyLabel}</p>
            ) : null}
            {generatedSimilar.state.showCandidates ? (
              <div className="space-y-2">
                {generatedSimilar.candidates.map((candidate) => {
                  const normalized = normalizePhraseText(candidate.text);
                  const checked = Boolean(generatedSimilar.selectedMap[normalized]);
                  return (
                    <label
                      key={normalized}
                      className={`flex cursor-pointer items-start gap-2 p-2.5 ${apple.listItem}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => generatedSimilar.onToggleCandidate(candidate.text)}
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{candidate.text}</p>
                        <p className={apple.metaText}>
                          {generatedSimilar.normalizeSimilarLabel(candidate.differenceLabel)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="grid grid-cols-2 gap-2 pb-safe">
              <Button
                type="button"
                variant="ghost"
                className={apple.button}
                onClick={generatedSimilar.close}
              >
                {generatedSimilar.state.closeLabel}
              </Button>
              <LoadingButton
                type="button"
                variant="ghost"
                className={apple.buttonStrong}
                disabled={generatedSimilar.generatingForId !== null}
                loading={generatedSimilar.savingSelected}
                loadingText={formatLoadingText(generatedSimilar.state.submitLabel)}
                onClick={() => generatedSimilar.onSaveSelected()}
              >
                {generatedSimilar.state.submitLabel}
              </LoadingButton>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FocusDetailSheet {...focusDetail} />
      <MoveIntoClusterSheet {...moveIntoCluster} />
      <ExpressionMapSheet {...expressionMap} />
    </>
  );
}
