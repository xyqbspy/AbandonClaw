import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  enrichSimilarExpressionFromApi,
  savePhraseFromApi,
} from "@/lib/utils/phrases-api";
import { normalizePhraseText } from "@/lib/shared/phrases";
import type {
  PhraseReviewStatus,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import type {
  FocusDetailRelatedItem,
  buildFocusDetailViewModel,
} from "@/features/chunks/components/focus-detail-selectors";

import { buildQuickAddRelatedPayload } from "./chunks-save-contract";
import {
  notifyChunksFocusDetailCopyTargetFailed,
  notifyChunksFocusDetailCopyTargetSuccess,
  notifyChunksFocusDetailMissingExpression,
  notifyChunksFocusDetailQuickAddFailed,
  notifyChunksFocusDetailQuickAddSucceeded,
  notifyChunksFocusDetailQuickAddValidation,
} from "./chunks-focus-detail-notify";
import { chunksPageMessages } from "./chunks-page-messages";

type QuickAddRelationType = "similar" | "contrast";

type FocusDetailLite = {
  savedItem: { expressionClusterId?: string | null } | null;
} | null;

type UseQuickAddRelatedArgs = {
  // open state 由 page 持有（因为早于本 hook 的 callback 引用 setOpen），
  // 本 hook 通过 controlled props 接收当前 open 与 setter。
  open: boolean;
  onOpenChange: (next: boolean) => void;
  focusExpression: UserPhraseItemResponse | null;
  focusDetail: FocusDetailLite;
  focusDetailViewModel: ReturnType<typeof buildFocusDetailViewModel>;
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
  loadPhrases: (
    query: string,
    reviewFilter: PhraseReviewStatus | "all",
    contentFilter: "expression" | "sentence",
    expressionClusterFilterId: string,
    options?: { preferCache?: boolean },
  ) => Promise<unknown> | unknown;
  invalidateSavedRelations: (userPhraseIds: string[]) => void;
  setFocusRelationTab: (tab: QuickAddRelationType) => void;
  setFocusDetailTab: (tab: QuickAddRelationType) => void;
  setFocusDetailActionsOpen: (open: boolean) => void;
  query: string;
  reviewFilter: PhraseReviewStatus | "all";
  contentFilter: "expression" | "sentence";
  expressionClusterFilterId: string;
};

export type UseQuickAddRelatedReturn = {
  text: string;
  relationType: QuickAddRelationType;
  saving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  validationMessage: string | null;
  libraryHint: string | null;
  setText: (next: string) => void;
  setRelationType: (next: QuickAddRelationType) => void;
  reset: () => void;
  handleOpenChange: (next: boolean) => void;
  save: () => Promise<void>;
  copyTarget: () => Promise<void>;
};

export function useQuickAddRelated({
  open,
  onOpenChange,
  focusExpression,
  focusDetail,
  focusDetailViewModel,
  phraseByNormalized,
  loadPhrases,
  invalidateSavedRelations,
  setFocusRelationTab,
  setFocusDetailTab,
  setFocusDetailActionsOpen,
  query,
  reviewFilter,
  contentFilter,
  expressionClusterFilterId,
}: UseQuickAddRelatedArgs): UseQuickAddRelatedReturn {
  const zh = chunksPageMessages;
  const [text, setText] = useState("");
  const [relationType, setRelationType] = useState<QuickAddRelationType>("similar");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  const reset = useCallback(() => {
    setText("");
    setRelationType("similar");
  }, []);

  const validationMessage = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed || !focusExpression) return null;

    const normalizedText = normalizePhraseText(trimmed);
    const normalizedFocusText = normalizePhraseText(focusExpression.text);
    if (normalizedText === normalizedFocusText) {
      return zh.quickAddDuplicateCurrent;
    }

    const matchRow = (row: FocusDetailRelatedItem) =>
      normalizePhraseText(row.text) === normalizedText;
    const duplicateExists =
      relationType === "similar"
        ? focusDetailViewModel.similarRows.some(matchRow)
        : focusDetailViewModel.contrastRows.some(matchRow);

    if (!duplicateExists) return null;
    return relationType === "similar"
      ? zh.quickAddDuplicateSimilar
      : zh.quickAddDuplicateContrast;
  }, [
    focusDetailViewModel.contrastRows,
    focusDetailViewModel.similarRows,
    focusExpression,
    relationType,
    text,
    zh,
  ]);

  const libraryHint = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed || !focusExpression || validationMessage) return null;

    const existingItem = phraseByNormalized.get(normalizePhraseText(trimmed));
    if (!existingItem || existingItem.learningItemType !== "expression") return null;
    return zh.quickAddExistingLibraryHint;
  }, [focusExpression, phraseByNormalized, text, validationMessage, zh]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next && !saving) {
        reset();
      }
    },
    [onOpenChange, reset, saving],
  );

  const save = useCallback(async () => {
    if (!focusExpression || !focusDetail?.savedItem) return;

    const trimmed = text.trim();
    if (!trimmed) {
      notifyChunksFocusDetailMissingExpression();
      return;
    }
    if (saving) return;
    if (validationMessage) {
      notifyChunksFocusDetailQuickAddValidation(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const response = await savePhraseFromApi(
        buildQuickAddRelatedPayload({
          focusExpression,
          text: trimmed,
          kind: relationType,
        }),
      );
      await enrichSimilarExpressionFromApi({
        userPhraseId: response.userPhrase.id,
        baseExpression: focusExpression.text,
      });
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      invalidateSavedRelations([focusExpression.userPhraseId, response.userPhrase.id]);
      setFocusRelationTab(relationType);
      setFocusDetailTab(relationType);
      setFocusDetailActionsOpen(false);
      onOpenChange(false);
      reset();
      notifyChunksFocusDetailQuickAddSucceeded(
        relationType === "similar"
          ? zh.quickAddSuccessSimilar
          : zh.quickAddSuccessContrast,
      );
    } catch (error) {
      notifyChunksFocusDetailQuickAddFailed(error instanceof Error ? error.message : null);
    } finally {
      setSaving(false);
    }
  }, [
    contentFilter,
    expressionClusterFilterId,
    focusDetail,
    focusExpression,
    invalidateSavedRelations,
    loadPhrases,
    onOpenChange,
    query,
    relationType,
    reset,
    reviewFilter,
    saving,
    setFocusDetailActionsOpen,
    setFocusDetailTab,
    setFocusRelationTab,
    text,
    validationMessage,
    zh,
  ]);

  const copyTarget = useCallback(async () => {
    const trimmed = focusExpression?.text?.trim() ?? "";
    if (!trimmed) return;

    try {
      await navigator.clipboard.writeText(trimmed);
      notifyChunksFocusDetailCopyTargetSuccess();
    } catch {
      notifyChunksFocusDetailCopyTargetFailed();
    }
  }, [focusExpression]);

  return {
    text,
    relationType,
    saving,
    inputRef,
    validationMessage,
    libraryHint,
    setText,
    setRelationType,
    reset,
    handleOpenChange,
    save,
    copyTarget,
  };
}
