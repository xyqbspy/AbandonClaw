"use client";

import { ChevronDown } from "lucide-react";
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
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { MoveIntoClusterCandidate, MoveIntoClusterGroup } from "./types";

type MoveIntoClusterSheetLabels = {
  close: string;
  title: string;
  description: string;
  currentMain: string;
  empty: string;
  selectGroup: string;
  selectedGroup: string;
  coveredByMain: string;
  submit: string;
  mainExpression: string;
  subExpression: string;
  selected: string;
  unselected: string;
  covered: string;
};

type MoveIntoClusterSheetProps = {
  open: boolean;
  focusExpression: Pick<UserPhraseItemResponse, "text"> | null;
  groups: MoveIntoClusterGroup[];
  expandedGroups: Record<string, boolean>;
  selectedMap: Record<string, boolean>;
  submitting: boolean;
  appleButtonClassName: string;
  labels: MoveIntoClusterSheetLabels;
  onOpenChange: (open: boolean) => void;
  onToggleGroupExpand: (groupKey: string) => void;
  onToggleGroupSelect: (group: MoveIntoClusterGroup, selected: boolean) => void;
  onToggleCandidate: (
    group: MoveIntoClusterGroup,
    candidate: MoveIntoClusterCandidate,
    selected: boolean,
  ) => void;
  onSubmit: () => void;
};

export function MoveIntoClusterSheet({
  open,
  focusExpression,
  groups,
  expandedGroups,
  selectedMap,
  submitting,
  appleButtonClassName,
  labels,
  onOpenChange,
  onToggleGroupExpand,
  onToggleGroupSelect,
  onToggleCandidate,
  onSubmit,
}: MoveIntoClusterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[85vh] max-h-[85vh] flex-col rounded-t-2xl border-0 bg-white">
        <SheetHeader className="shrink-0 border-b border-[rgb(236,238,240)] bg-[rgb(250,250,250)] px-4 pb-4 pt-4">
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b border-[rgb(236,238,240)] bg-[rgb(250,250,250)] px-4 py-4">
          {focusExpression ? (
            <div className="rounded-xl bg-[rgb(246,246,246)] p-4">
              <p className="text-xl font-semibold tracking-tight">
                {labels.currentMain}：{focusExpression.text}
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                if (group.isCluster) {
                  const mainCandidate = group.candidates.find((candidate) => candidate.isSourceMain) ?? null;
                  const groupSelected = group.candidates.every((candidate) => {
                    if (selectedMap[candidate.row.userPhraseId]) return true;
                    return Boolean(
                      !candidate.isSourceMain &&
                        mainCandidate &&
                        selectedMap[mainCandidate.row.userPhraseId],
                    );
                  });

                  return (
                    <div key={group.key} className="rounded-2xl bg-[rgb(246,246,246)] p-3">
                      <div className="flex items-start justify-between gap-3 px-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onToggleGroupExpand(group.key)}
                        >
                          <p className="text-base font-semibold">{group.title}</p>
                          {mainCandidate?.row.translation ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {mainCandidate.row.translation}
                            </p>
                          ) : null}
                          {groupSelected ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {labels.coveredByMain}
                            </p>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-[rgb(220,224,228)] p-2 text-xs text-muted-foreground transition hover:bg-[rgb(240,240,240)]"
                            onClick={() => onToggleGroupExpand(group.key)}
                          >
                            <ChevronDown
                              className={`size-4 transition-transform ${
                                expandedGroups[group.key] ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            className={`h-auto px-2 py-1 text-xs ${
                              groupSelected
                                ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                                : ""
                            }`}
                            onClick={() => onToggleGroupSelect(group, groupSelected)}
                          >
                            {groupSelected ? labels.selectedGroup : labels.selectGroup}
                          </Button>
                        </div>
                      </div>

                      {expandedGroups[group.key] ? (
                        <div className="mt-3 space-y-2">
                          {group.candidates.map((candidate) => {
                            const selected = Boolean(selectedMap[candidate.row.userPhraseId]);
                            const isCoveredByMainSelected = Boolean(
                              candidate.sourceClusterId &&
                                !candidate.isSourceMain &&
                                mainCandidate &&
                                selectedMap[mainCandidate.row.userPhraseId],
                            );
                            return (
                              <button
                                key={candidate.row.userPhraseId}
                                type="button"
                                className={`w-full rounded-xl border border-transparent bg-[rgb(246,246,246)] text-left transition ${
                                  isCoveredByMainSelected
                                    ? "text-muted-foreground"
                                    : "hover:bg-[rgb(240,240,240)]"
                                }`}
                                disabled={isCoveredByMainSelected}
                                onClick={() => onToggleCandidate(group, candidate, selected)}
                              >
                                <div className="flex items-start justify-between gap-3 px-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{candidate.row.text}</p>
                                    {candidate.row.translation ? (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {candidate.row.translation}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Badge variant="outline">
                                      {candidate.isSourceMain ? labels.mainExpression : labels.subExpression}
                                    </Badge>
                                    <Badge
                                      variant={
                                        isCoveredByMainSelected ? "outline" : selected ? "default" : "secondary"
                                      }
                                    >
                                      {isCoveredByMainSelected
                                        ? labels.covered
                                        : selected
                                          ? labels.selected
                                          : labels.unselected}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const candidate = group.candidates[0];
                const selected = candidate ? Boolean(selectedMap[candidate.row.userPhraseId]) : false;
                if (!candidate) return null;

                return (
                  <div key={group.key} className="rounded-2xl bg-[rgb(246,246,246)] p-3">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-transparent bg-[rgb(246,246,246)] text-left transition hover:bg-[rgb(240,240,240)]"
                      onClick={() => onToggleCandidate(group, candidate, selected)}
                    >
                      <div className="flex items-start justify-between gap-3 px-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold">{candidate.row.text}</p>
                          {candidate.row.translation ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {candidate.row.translation}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={selected ? "default" : "secondary"}>
                          {selected ? labels.selected : labels.unselected}
                        </Badge>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-[rgb(236,238,240)] bg-[rgb(250,250,250)] px-4 pb-safe pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => onOpenChange(false)}>
              {labels.close}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={appleButtonClassName}
              disabled={submitting}
              onClick={onSubmit}
            >
              {submitting ? `${labels.submit}...` : labels.submit}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
