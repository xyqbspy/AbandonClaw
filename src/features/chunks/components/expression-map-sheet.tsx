"use client";

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
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-2">
          {loading ? <p className="text-sm text-muted-foreground">{labels.loading}</p> : null}
          {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && data?.clusters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : null}

          {!loading && !error && data?.clusters.length ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.clusters.map((cluster) => (
                  <Button
                    key={cluster.id}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${appleButtonClassName} ${
                      activeClusterId === cluster.id
                        ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                        : ""
                    }`}
                    onClick={() => onSelectCluster(cluster.id)}
                  >
                    {cluster.anchor}
                  </Button>
                ))}
              </div>

              {activeCluster ? (
                <div className="space-y-3 rounded-xl bg-[rgb(246,246,246)] p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{labels.centerExpression}</p>
                    <p className="text-sm font-medium">{centerExpressionText || activeCluster.anchor}</p>
                    <p className="text-xs text-muted-foreground">
                      {labels.clusterMeaning}：{activeCluster.meaning}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">{labels.relatedExpressions}</p>
                  <div className="space-y-2">
                    {displayedClusterExpressions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{labels.clusterEmpty}</p>
                    ) : (
                      displayedClusterExpressions.map((text) => {
                        const normalized = text.trim().toLowerCase();
                        const status = expressionStatusByNormalized.get(normalized);
                        const statusText = status ?? labels.statusUnknown;
                        const note = buildDifferenceNote(centerExpressionText || activeCluster.anchor, text);
                        return (
                          <div key={text} className="rounded-lg bg-[rgb(246,246,246)] p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{text}</p>
                              <Badge variant={status ? "secondary" : "outline"}>{statusText}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {activeCluster.expressions.length > displayedClusterExpressions.length ? (
                    <p className="text-xs text-muted-foreground">
                      {labels.mapLimitedPrefix} {displayedClusterExpressions.length} {labels.mapLimitedSuffix}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <SheetFooter>
          <div className="grid grid-cols-3 gap-2 pb-safe">
            <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => onOpenChange(false)}>
              {labels.close}
            </Button>
            <Button type="button" variant="ghost" className={appleButtonClassName} onClick={onPracticeCluster}>
              {labels.practiceCluster}
            </Button>
            <Button type="button" variant="ghost" className={appleButtonClassName} disabled={addingCluster} onClick={onAddCluster}>
              {addingCluster ? `${labels.addCluster}...` : labels.addCluster}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
