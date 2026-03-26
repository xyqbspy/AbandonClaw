"use client";

import { ChevronDown } from "lucide-react";
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
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import {
  APPLE_BUTTON_STRONG,
  APPLE_BODY_TEXT,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";
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
  const appleOutlineBadgeClassName =
    "border-[var(--app-border-soft)] bg-[var(--app-surface)] text-[var(--muted-foreground)]";
  const appleSelectedBadgeClassName =
    "border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        overlayClassName="z-[80]"
        className={`z-[81] flex h-[85vh] max-h-[85vh] flex-col rounded-t-2xl border border-[var(--app-border-soft)] bg-background ${APPLE_PANEL}`}
      >
        <SheetHeader className="shrink-0 border-b border-[var(--app-border-soft)] bg-[var(--app-surface)] px-4 pb-4 pt-4">
          <SheetTitle className={APPLE_TITLE_MD}>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b border-[var(--app-border-soft)] bg-[var(--app-surface)] px-4 py-4">
          {focusExpression ? (
            <div className={`p-4 ${APPLE_PANEL}`}>
              <p className={APPLE_TITLE_MD}>
                {labels.currentMain}
                {focusExpression.text}
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-3">
          {groups.length === 0 ? (
            <p className={`text-sm ${APPLE_META_TEXT}`}>{labels.empty}</p>
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
                    <div key={group.key} className={`p-3 ${APPLE_PANEL}`}>
                      <div className="flex items-start justify-between gap-3 px-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onToggleGroupExpand(group.key)}
                        >
                          <p className={APPLE_TITLE_MD}>{group.title}</p>
                          {mainCandidate?.row.translation ? (
                            <p className={`mt-1 ${APPLE_META_TEXT}`}>
                              {mainCandidate.row.translation}
                            </p>
                          ) : null}
                          {groupSelected ? (
                            <p className={`mt-1 ${APPLE_META_TEXT}`}>
                              {labels.coveredByMain}
                            </p>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className={`inline-flex items-center rounded-full border border-[var(--app-border-soft)] p-2 ${APPLE_META_TEXT} transition hover:bg-[var(--app-surface-hover)]`}
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
                                ? APPLE_BUTTON_STRONG
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
                                className={`w-full text-left transition ${APPLE_LIST_ITEM} ${
                                  isCoveredByMainSelected
                                    ? APPLE_META_TEXT
                                    : "hover:bg-[var(--app-surface-hover)]"
                                }`}
                                disabled={isCoveredByMainSelected}
                                onClick={() => onToggleCandidate(group, candidate, selected)}
                              >
                                <div className="flex items-start justify-between gap-3 px-3">
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-medium ${APPLE_BODY_TEXT}`}>{candidate.row.text}</p>
                                    {candidate.row.translation ? (
                                      <p className={`mt-1 ${APPLE_META_TEXT}`}>
                                        {candidate.row.translation}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Badge variant="outline" className={appleOutlineBadgeClassName}>
                                      {candidate.isSourceMain ? labels.mainExpression : labels.subExpression}
                                    </Badge>
                                    <Badge
                                      variant={
                                        isCoveredByMainSelected ? "outline" : selected ? "default" : "secondary"
                                      }
                                      className={
                                        isCoveredByMainSelected
                                          ? appleOutlineBadgeClassName
                                          : selected
                                            ? APPLE_BUTTON_STRONG
                                            : appleSelectedBadgeClassName
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
                  <div key={group.key} className={`p-3 ${APPLE_PANEL}`}>
                    <button
                      type="button"
                      className={`w-full text-left transition ${APPLE_LIST_ITEM} hover:bg-[var(--app-surface-hover)]`}
                      onClick={() => onToggleCandidate(group, candidate, selected)}
                    >
                      <div className="flex items-start justify-between gap-3 px-3">
                        <div className="min-w-0 flex-1">
                          <p className={APPLE_TITLE_MD}>{candidate.row.text}</p>
                          {candidate.row.translation ? (
                            <p className={`mt-1 ${APPLE_META_TEXT}`}>
                              {candidate.row.translation}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant={selected ? "default" : "secondary"}
                          className={selected ? APPLE_BUTTON_STRONG : appleSelectedBadgeClassName}
                        >
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

        <SheetFooter className="shrink-0 border-t border-[var(--app-border-soft)] bg-[var(--app-surface)] px-4 pb-safe pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => onOpenChange(false)}>
              {labels.close}
            </Button>
            <LoadingButton
              type="button"
              variant="ghost"
              className={APPLE_BUTTON_STRONG}
              loading={submitting}
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
