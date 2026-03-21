"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import {
  ManualExpressionAssistResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";

type FocusDetailTabValue = "info" | "similar" | "contrast";

type FocusDetailContentState = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
};

type FocusDetailContentLabels = {
  speakSentence: string;
  candidateBadge: string;
  noTranslation: string;
  loading: string;
  tabInfo: string;
  tabSimilar: string;
  tabContrast: string;
  commonUsage: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewStage: string;
  usageHintFallback: string;
  typicalScenarioPending: string;
  semanticFocusPending: string;
  reviewHintFallback: string;
  sourceSentence: string;
  noSourceSentence: string;
  similarHint: string;
  emptySimilar: string;
  contrastHint: string;
  emptyContrast: string;
};

type FocusDetailContentProps = {
  detail: FocusDetailContentState;
  activeAssistItem: ManualExpressionAssistResponse["inputItem"] | null;
  focusDetailTab: FocusDetailTabValue;
  focusDetailLoading: boolean;
  isDetailSpeaking: boolean;
  detailSpeakText: string;
  similarRows: UserPhraseItemResponse[];
  contrastRows: UserPhraseItemResponse[];
  isSavedRelatedLoading: boolean;
  usageHint: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewHint: string;
  exampleCards: ReactNode;
  labels: FocusDetailContentLabels;
  onSpeak: (text: string) => void;
  onTabChange: (tab: FocusDetailTabValue) => void;
  onOpenSimilarRow: (row: UserPhraseItemResponse) => void;
  onOpenContrastRow: (row: UserPhraseItemResponse) => void;
};

export function FocusDetailContent({
  detail,
  activeAssistItem,
  focusDetailTab,
  focusDetailLoading,
  isDetailSpeaking,
  detailSpeakText,
  similarRows,
  contrastRows,
  isSavedRelatedLoading,
  usageHint,
  typicalScenario,
  semanticFocus,
  reviewHint,
  exampleCards,
  labels,
  onSpeak,
  onTabChange,
  onOpenSimilarRow,
  onOpenContrastRow,
}: FocusDetailContentProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4">
      <div className="shrink-0 rounded-2xl bg-[linear-gradient(135deg,rgb(245,247,250),rgb(234,239,244))] p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-lg font-semibold">{detail.text}</p>
            <div className="flex shrink-0 items-center gap-2">
              {detail.savedItem || activeAssistItem ? (
                <TtsActionButton
                  active={isDetailSpeaking}
                  onClick={() => onSpeak(detailSpeakText)}
                  className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                  iconClassName="size-4"
                  label={labels.speakSentence}
                />
              ) : null}
              {!detail.savedItem ? (
                <Badge variant="outline">{labels.candidateBadge}</Badge>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {detail.savedItem?.translation ?? activeAssistItem?.translation ?? labels.noTranslation}
          </p>
        </div>
        {detail.differenceLabel ? (
          <p className="mt-2 text-xs text-muted-foreground">{detail.differenceLabel}</p>
        ) : null}
      </div>

      {focusDetailLoading ? (
        <p className="text-sm text-muted-foreground">{labels.loading}</p>
      ) : null}

      <Tabs
        value={focusDetailTab}
        onValueChange={(value) => onTabChange(value as FocusDetailTabValue)}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mb-3 w-full min-w-0 shrink-0 justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="info">{labels.tabInfo}</TabsTrigger>
          <TabsTrigger value="similar">{labels.tabSimilar}</TabsTrigger>
          <TabsTrigger value="contrast">{labels.tabContrast}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="info"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-4 pb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-xl bg-[rgb(246,246,246)] p-3">
                <p className="text-xs text-muted-foreground">{labels.commonUsage}</p>
                <p className="text-sm text-foreground/90">{usageHint || labels.usageHintFallback}</p>
              </div>
              <div className="space-y-1 rounded-xl bg-[rgb(246,246,246)] p-3">
                <p className="text-xs text-muted-foreground">{labels.typicalScenario}</p>
                <p className="text-sm text-foreground/90">{typicalScenario || labels.typicalScenarioPending}</p>
              </div>
              <div className="space-y-1 rounded-xl bg-[rgb(246,246,246)] p-3">
                <p className="text-xs text-muted-foreground">{labels.semanticFocus}</p>
                <p className="text-sm text-foreground/90">{semanticFocus || labels.semanticFocusPending}</p>
              </div>
              <div className="space-y-1 rounded-xl bg-[rgb(246,246,246)] p-3">
                <p className="text-xs text-muted-foreground">{labels.reviewStage}</p>
                <p className="text-sm text-foreground/90">{reviewHint || labels.reviewHintFallback}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{labels.sourceSentence}</p>
              {exampleCards ?? <p className="text-sm text-muted-foreground">{labels.noSourceSentence}</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="similar"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-2 pb-6">
            <p className="text-xs text-muted-foreground">{labels.similarHint}</p>
            {similarRows.length > 0 ? (
              similarRows.slice(0, 12).map((row) => (
                <button
                  key={row.userPhraseId}
                  type="button"
                  className="w-full rounded-xl bg-[rgb(246,246,246)] p-3 text-left transition hover:bg-[rgb(238,238,238)]"
                  onClick={() => onOpenSimilarRow(row)}
                >
                  <p className="text-sm font-medium">{row.text}</p>
                  {row.translation ? (
                    <p className="mt-1 text-xs text-muted-foreground">（同类）{row.translation}</p>
                  ) : null}
                </button>
              ))
            ) : isSavedRelatedLoading ? (
              <p className="text-sm text-muted-foreground">{labels.loading}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.emptySimilar}</p>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="contrast"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-2 pb-6">
            <p className="text-xs text-muted-foreground">{labels.contrastHint}</p>
            {contrastRows.length > 0 ? (
              contrastRows.slice(0, 12).map((row) => (
                <button
                  key={row.userPhraseId}
                  type="button"
                  className="w-full rounded-xl bg-[rgb(246,246,246)] p-3 text-left transition hover:bg-[rgb(238,238,238)]"
                  onClick={() => onOpenContrastRow(row)}
                >
                  <p className="text-sm font-medium">{row.text}</p>
                  {row.translation ? (
                    <p className="mt-1 text-xs text-muted-foreground">（对照）{row.translation}</p>
                  ) : null}
                </button>
              ))
            ) : isSavedRelatedLoading ? (
              <p className="text-sm text-muted-foreground">{labels.loading}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.emptyContrast}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
