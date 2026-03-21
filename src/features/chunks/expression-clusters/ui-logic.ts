import { MoveIntoClusterCandidate, MoveIntoClusterGroup } from "@/features/chunks/components/types";

type FocusExpressionLike = {
  userPhraseId: string;
  expressionClusterId: string | null;
  expressionClusterMainUserPhraseId: string | null;
  sourceNote?: string | null;
};

const isDerivedRelatedExpression = (sourceNote: string | null | undefined) => {
  const normalized = (sourceNote ?? "").trim().toLowerCase();
  return (
    normalized === "manual-similar-ai" ||
    normalized === "focus-similar-ai" ||
    normalized === "manual-contrast-ai" ||
    normalized === "focus-contrast-ai"
  );
};

export const getFocusMainExpressionRows = <T extends FocusExpressionLike>(
  rows: T[],
  focusExpressionId: string,
) => {
  return rows.filter((row) => {
    if (row.expressionClusterId) {
      const isFamilyMain = row.expressionClusterMainUserPhraseId === row.userPhraseId;
      if (!isFamilyMain) return false;
      if (isDerivedRelatedExpression(row.sourceNote)) return false;
      return true;
    }

    if (isDerivedRelatedExpression(row.sourceNote)) {
      return row.userPhraseId === focusExpressionId;
    }

    return true;
  });
};

export const resolveFocusMainExpressionId = <T extends FocusExpressionLike>(
  rows: T[],
  userPhraseId: string,
) => {
  const row = rows.find((item) => item.userPhraseId === userPhraseId);
  if (!row?.expressionClusterId) return row?.userPhraseId ?? userPhraseId;
  return row.expressionClusterMainUserPhraseId ?? row.userPhraseId;
};

export const getMoveIntoGroupSelected = (
  group: MoveIntoClusterGroup,
  selectedMap: Record<string, boolean>,
) => {
  const mainCandidate = group.candidates.find((candidate) => candidate.isSourceMain) ?? null;
  return group.candidates.every((candidate) => {
    if (selectedMap[candidate.row.userPhraseId]) return true;
    return Boolean(
      !candidate.isSourceMain &&
        mainCandidate &&
        selectedMap[mainCandidate.row.userPhraseId],
    );
  });
};

export const toggleMoveIntoClusterGroupSelection = (
  current: Record<string, boolean>,
  group: MoveIntoClusterGroup,
  groupSelected: boolean,
) => {
  const next = { ...current };
  if (groupSelected) {
    for (const candidate of group.candidates) {
      delete next[candidate.row.userPhraseId];
    }
  } else {
    for (const candidate of group.candidates) {
      next[candidate.row.userPhraseId] = true;
    }
  }
  return next;
};

export const toggleMoveIntoClusterCandidateSelection = (
  current: Record<string, boolean>,
  group: MoveIntoClusterGroup,
  candidate: MoveIntoClusterCandidate,
  selected: boolean,
) => {
  const next = { ...current };
  const nextSelected = !selected;
  next[candidate.row.userPhraseId] = nextSelected;

  if (group.isCluster && candidate.isSourceMain && nextSelected) {
    for (const item of group.candidates) {
      if (!item.isSourceMain) {
        delete next[item.row.userPhraseId];
      }
    }
  }

  return next;
};
