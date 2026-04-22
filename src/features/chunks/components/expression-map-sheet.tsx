"use client";

import { formatLoadingText, LoadingButton } from "@/components/shared/action-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  APPLE_BANNER_DANGER,
  APPLE_BADGE_SUBTLE,
  APPLE_BADGE_SUCCESS,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_SM,
  APPLE_BODY_TEXT,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";

type ExpressionMapSheetLabels = {
  title: string;
  description: string;
  loading: string;
  empty: string;
  centerExpression: string;
  clusterMeaning: string;
  relatedExpressions: string;
  clusterEmpty: string;
  mapLimitedPrefix: string;
  mapLimitedSuffix: string;
  statusUnknown: string;
  close: string;
  practiceCluster: string;
  addCluster: string;
};

type ExpressionMapSheetProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ExpressionMapResponse | null;
  activeClusterId: string | null;
  activeCluster: ExpressionCluster | null;
  centerExpressionText: string;
  displayedClusterExpressions: string[];
  expressionStatusByNormalized: Map<string, string | undefined>;
  addingCluster: boolean;
  appleButtonClassName: string;
  labels: ExpressionMapSheetLabels;
  buildDifferenceNote: (centerExpression: string, targetExpression: string) => string;
  onOpenChange: (open: boolean) => void;
  onSelectCluster: (clusterId: string) => void;
  onPracticeCluster: () => void;
  onAddCluster: () => void;
};

const APPLE_STATUS_BADGE = APPLE_BADGE_SUCCESS;
const APPLE_UNKNOWN_BADGE = APPLE_BADGE_SUBTLE;
export function ExpressionMapSheet({
  open,
  loading,
  error,
  data,
  activeClusterId,
  activeCluster,
  centerExpressionText,
  displayedClusterExpressions,
  expressionStatusByNormalized,
  addingCluster,
  appleButtonClassName,
  labels,
  buildDifferenceNote,
  onOpenChange,
  onSelectCluster,
  onPracticeCluster,
  onAddCluster,
}: ExpressionMapSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={`max-h-[var(--mobile-adapt-overlay-sheet-height)] overflow-y-auto rounded-t-[var(--mobile-adapt-overlay-radius)] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${APPLE_PANEL}`}
      >
        <SheetHeader className="space-y-[var(--mobile-adapt-space-2xs)] px-[var(--mobile-adapt-space-overlay)] pb-[var(--mobile-adapt-space-md)] pt-[var(--mobile-adapt-space-overlay)]">
          <SheetTitle className={APPLE_TITLE_MD}>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-[var(--mobile-adapt-space-xl)] px-[var(--mobile-adapt-space-overlay)] pb-[var(--mobile-adapt-space-overlay)]">
          {loading ? <p className={APPLE_BODY_TEXT}>{labels.loading}</p> : null}
          {!loading && error ? <p className={APPLE_BANNER_DANGER}>{error}</p> : null}
          {!loading && !error && data?.clusters.length === 0 ? (
            <p className={APPLE_BODY_TEXT}>{labels.empty}</p>
          ) : null}

          {!loading && !error && data?.clusters.length ? (
            <div className="space-y-[var(--mobile-adapt-space-xl)]">
              <div className="flex flex-wrap gap-[var(--mobile-adapt-space-sm)]">
                {data.clusters.map((cluster) => {
                  const active = activeClusterId === cluster.id;
                  return (
                    <Button
                      key={cluster.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "secondary"}
                      className={active ? `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_SM}` : appleButtonClassName}
                      onClick={() => onSelectCluster(cluster.id)}
                    >
                      {cluster.anchor}
                    </Button>
                  );
                })}
              </div>

              {activeCluster ? (
                <div className={`space-y-[var(--mobile-adapt-space-md)] rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[var(--mobile-adapt-space-md)] shadow-[var(--app-shadow-soft)]`}>
                  <div className="space-y-[var(--mobile-adapt-space-2xs)]">
                    <p className={APPLE_META_TEXT}>{labels.centerExpression}</p>
                    <p className="text-[length:var(--mobile-adapt-overlay-body)] font-medium text-[var(--app-chunks-sheet-title)]">
                      {centerExpressionText || activeCluster.anchor}
                    </p>
                    <p className={APPLE_META_TEXT}>
                      {labels.clusterMeaning}：{activeCluster.meaning}
                    </p>
                  </div>

                  <p className={APPLE_META_TEXT}>{labels.relatedExpressions}</p>
                  <div className="space-y-[var(--mobile-adapt-space-sm)]">
                    {displayedClusterExpressions.length === 0 ? (
                      <p className={APPLE_BODY_TEXT}>{labels.clusterEmpty}</p>
                    ) : (
                      displayedClusterExpressions.map((text) => {
                        const normalized = text.trim().toLowerCase();
                        const status = expressionStatusByNormalized.get(normalized);
                        const statusText = status ?? labels.statusUnknown;
                        const note = buildDifferenceNote(
                          centerExpressionText || activeCluster.anchor,
                          text,
                        );
                        return (
                          <div key={text} className={`rounded-[var(--mobile-adapt-overlay-card-radius)] p-[var(--mobile-adapt-space-md)] ${APPLE_LIST_ITEM}`}>
                            <div className="flex items-center justify-between gap-[var(--mobile-adapt-space-sm)]">
                              <p className="text-[length:var(--mobile-adapt-overlay-body)] font-medium text-[var(--app-chunks-sheet-body)]">{text}</p>
                              <Badge
                                variant={status ? "secondary" : "outline"}
                                className={status ? APPLE_STATUS_BADGE : APPLE_UNKNOWN_BADGE}
                              >
                                {statusText}
                              </Badge>
                            </div>
                            <p className={`mt-1 ${APPLE_META_TEXT}`}>{note}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {activeCluster.expressions.length > displayedClusterExpressions.length ? (
                    <p className={APPLE_META_TEXT}>
                      {labels.mapLimitedPrefix} {displayedClusterExpressions.length}{" "}
                      {labels.mapLimitedSuffix}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <SheetFooter className="px-[var(--mobile-adapt-space-overlay)] pt-[var(--mobile-adapt-space-md)] pb-[calc(env(safe-area-inset-bottom)+var(--mobile-adapt-space-md))]">
          <div className="grid grid-cols-3 gap-[var(--mobile-adapt-space-sm)] pb-safe">
            <Button
              type="button"
              variant="ghost"
              className={appleButtonClassName}
              onClick={() => onOpenChange(false)}
            >
              {labels.close}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={appleButtonClassName}
              onClick={onPracticeCluster}
            >
              {labels.practiceCluster}
            </Button>
            <LoadingButton
              type="button"
              variant="ghost"
              className={appleButtonClassName}
              disabled={addingCluster}
              loading={addingCluster}
              loadingText={formatLoadingText(labels.addCluster)}
              onClick={onAddCluster}
            >
              {labels.addCluster}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
