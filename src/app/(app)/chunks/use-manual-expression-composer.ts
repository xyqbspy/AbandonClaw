import { useCallback, useState } from "react";

import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  enrichSimilarExpressionFromApi,
  enrichSimilarExpressionsBatchFromApi,
  generateManualExpressionAssistFromApi,
  ManualExpressionAssistResponse,
  savePhrasesBatchFromApi,
  savePhraseFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import {
  buildManualAssistCandidatePayload,
  buildManualBaseExpressionSavePayload,
} from "./chunks-save-contract";

type UseManualExpressionComposerDeps = {
  generateManualExpressionAssistFromApi: typeof generateManualExpressionAssistFromApi;
  savePhraseFromApi: typeof savePhraseFromApi;
  enrichSimilarExpressionFromApi: typeof enrichSimilarExpressionFromApi;
  savePhrasesBatchFromApi: typeof savePhrasesBatchFromApi;
  enrichSimilarExpressionsBatchFromApi: typeof enrichSimilarExpressionsBatchFromApi;
};

const defaultDeps: UseManualExpressionComposerDeps = {
  generateManualExpressionAssistFromApi,
  savePhraseFromApi,
  enrichSimilarExpressionFromApi,
  savePhrasesBatchFromApi,
  enrichSimilarExpressionsBatchFromApi,
};

export const useManualExpressionComposer = ({
  expressionRows,
  onError,
  onPartialEnrichFailed,
  deps = defaultDeps,
}: {
  expressionRows: UserPhraseItemResponse[];
  onError?: (message: string) => void;
  onPartialEnrichFailed?: (message: string) => void;
  deps?: UseManualExpressionComposerDeps;
}) => {
  const [manualExpressionAssist, setManualExpressionAssist] = useState<ManualExpressionAssistResponse | null>(null);
  const [manualAssistLoading, setManualAssistLoading] = useState(false);
  const [manualSelectedMap, setManualSelectedMap] = useState<Record<string, boolean>>({});
  const [savingManualExpression, setSavingManualExpression] = useState(false);

  const resetManualExpressionComposer = useCallback(() => {
    setManualExpressionAssist(null);
    setManualSelectedMap({});
  }, []);

  const clearManualExpressionAssist = useCallback(() => {
    setManualExpressionAssist(null);
    setManualSelectedMap({});
  }, []);

  const toggleManualSelected = useCallback((text: string) => {
    const key = normalizePhraseText(text);
    if (!key) return;
    setManualSelectedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const loadManualExpressionAssist = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || manualAssistLoading) return false;

      setManualAssistLoading(true);
      try {
        const response = await deps.generateManualExpressionAssistFromApi({
          text: trimmed,
          existingExpressions: expressionRows.map((row) => row.text),
        });
        setManualExpressionAssist(response);
        setManualSelectedMap({
          [normalizePhraseText(response.inputItem.text)]: true,
        });
        return true;
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "加载失败");
        return false;
      } finally {
        setManualAssistLoading(false);
      }
    },
    [deps, expressionRows, manualAssistLoading, onError],
  );

  const saveManualExpression = useCallback(
    async ({
      text,
      mode,
    }: {
      text: string;
      mode: "save" | "save_and_review";
    }) => {
      const trimmed = text.trim();
      if (!trimmed || savingManualExpression) {
        return null;
      }

      setSavingManualExpression(true);
      try {
        const reviewSessionExpressions: Array<{ userPhraseId: string; text: string }> = [];

        if (!manualExpressionAssist) {
          const response = await deps.savePhraseFromApi({
            text: trimmed,
            learningItemType: "expression",
            sourceType: "manual",
            sourceChunkText: trimmed,
          });
          try {
            await deps.enrichSimilarExpressionFromApi({
              userPhraseId: response.userPhrase.id,
            });
          } catch {
            onPartialEnrichFailed?.("auto-enrich-failed");
          }
          reviewSessionExpressions.push({
            userPhraseId: response.userPhrase.id,
            text: trimmed,
          });
          return {
            reviewSessionExpressions,
            usedAssist: false,
            mode,
          };
        }

        const baseKey = normalizePhraseText(manualExpressionAssist.inputItem.text);
        const selectedBase = Boolean(manualSelectedMap[baseKey]);
        const selectedSimilar = manualExpressionAssist.similarExpressions.filter((candidate) =>
          Boolean(manualSelectedMap[normalizePhraseText(candidate.text)]),
        );
        const selectedContrast = manualExpressionAssist.contrastExpressions.filter((candidate) =>
          Boolean(manualSelectedMap[normalizePhraseText(candidate.text)]),
        );

        if (!selectedBase && selectedSimilar.length === 0 && selectedContrast.length === 0) {
          return {
            reviewSessionExpressions: [],
            usedAssist: true,
            mode,
            emptySelection: true,
          };
        }

        const savedForEnrich: Array<{ userPhraseId: string; differenceLabel?: string }> = [];
        let baseUserPhraseId: string | null = null;
        let familyId: string | null = null;

        if (selectedBase) {
          const baseResponse = await deps.savePhraseFromApi(
            buildManualBaseExpressionSavePayload({
              assist: manualExpressionAssist,
              createClusterForSimilar: selectedSimilar.length > 0,
              baseKey,
            }),
          );
          familyId = baseResponse.expressionClusterId;
          await deps.enrichSimilarExpressionFromApi({
            userPhraseId: baseResponse.userPhrase.id,
            baseExpression: manualExpressionAssist.inputItem.text,
          });
          baseUserPhraseId = baseResponse.userPhrase.id;
          reviewSessionExpressions.push({
            userPhraseId: baseResponse.userPhrase.id,
            text: manualExpressionAssist.inputItem.text,
          });
        }

        if (selectedSimilar.length > 0) {
          let remainingSimilar = selectedSimilar;
          if (!familyId) {
            const seedCandidate = selectedSimilar[0];
            const seedResponse = await deps.savePhraseFromApi(
              buildManualAssistCandidatePayload({
                assist: manualExpressionAssist,
                candidate: seedCandidate,
                kind: "similar",
              }),
            );
            familyId = seedResponse.expressionClusterId;
            savedForEnrich.push({
              userPhraseId: seedResponse.userPhrase.id,
              differenceLabel: seedCandidate.differenceLabel,
            });
            reviewSessionExpressions.push({
              userPhraseId: seedResponse.userPhrase.id,
              text: seedCandidate.text,
            });
            remainingSimilar = selectedSimilar.slice(1);
          }

          if (!familyId) {
            throw new Error("未能创建同类表达组。");
          }

          if (remainingSimilar.length > 0) {
            const batchResult = await deps.savePhrasesBatchFromApi({
              items: remainingSimilar.map((candidate) =>
                buildManualAssistCandidatePayload({
                  assist: manualExpressionAssist,
                  candidate,
                  kind: "similar",
                  expressionClusterId: familyId as string,
                  relationSourceUserPhraseId: baseUserPhraseId ?? undefined,
                }),
              ),
            });
            savedForEnrich.push(
              ...batchResult.items.map((response, index) => ({
                userPhraseId: response.userPhrase.id,
                differenceLabel: remainingSimilar[index].differenceLabel,
              })),
            );
            reviewSessionExpressions.push(
              ...batchResult.items.map((response, index) => ({
                userPhraseId: response.userPhrase.id,
                text: remainingSimilar[index].text,
              })),
            );
          }
        }

        if (selectedContrast.length > 0) {
          const batchResult = await deps.savePhrasesBatchFromApi({
            items: selectedContrast.map((candidate) =>
              buildManualAssistCandidatePayload({
                assist: manualExpressionAssist,
                candidate,
                kind: "contrast",
                relationSourceUserPhraseId: baseUserPhraseId ?? undefined,
              }),
            ),
          });
          savedForEnrich.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              differenceLabel: selectedContrast[index].differenceLabel,
            })),
          );
          reviewSessionExpressions.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              text: selectedContrast[index].text,
            })),
          );
        }

        if (savedForEnrich.length > 0) {
          await deps.enrichSimilarExpressionsBatchFromApi({
            items: savedForEnrich.map((item) => ({
              userPhraseId: item.userPhraseId,
              baseExpression: manualExpressionAssist.inputItem.text,
              differenceLabel: item.differenceLabel,
            })),
          });
        }

        return {
          reviewSessionExpressions,
          usedAssist: true,
          mode,
        };
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "加载失败");
        return null;
      } finally {
        setSavingManualExpression(false);
      }
    },
    [
      deps,
      manualExpressionAssist,
      manualSelectedMap,
      onError,
      onPartialEnrichFailed,
      savingManualExpression,
    ],
  );

  return {
    manualExpressionAssist,
    manualAssistLoading,
    manualSelectedMap,
    savingManualExpression,
    setManualExpressionAssist,
    clearManualExpressionAssist,
    resetManualExpressionComposer,
    toggleManualSelected,
    loadManualExpressionAssist,
    saveManualExpression,
  };
};
