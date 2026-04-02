"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clearAllReviewPageCache,
  getReviewPageCache,
  setReviewPageCache,
} from "@/lib/cache/review-page-cache";
import { getMyPhrasesFromApi } from "@/lib/utils/phrases-api";
import { readReviewSession } from "@/lib/utils/review-session";
import {
  DueReviewItemResponse,
  DueScenePracticeReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
} from "@/lib/utils/review-api";
import { reviewPageLabels as zh } from "./review-page-labels";
import { notifyReviewLoadFailed } from "./review-page-notify";
import { mergePrioritizedReviewItems } from "./review-page-selectors";

const REVIEW_LIMIT = 20;

const normalizePathname = (pathname?: string | null) => {
  if (typeof pathname !== "string") return "/";
  return pathname.replace(/\/+$/, "") || "/";
};

export type ReviewSummary = {
  dueReviewCount: number;
  reviewedTodayCount: number;
  reviewAccuracy: number | null;
  masteredPhraseCount: number;
  confidentOutputCountToday: number;
  fullOutputCountToday: number;
};

export function useReviewPageData(params: {
  setLoading: (value: boolean) => void;
  setItems: React.Dispatch<React.SetStateAction<DueReviewItemResponse[]>>;
  setScenePracticeItems: React.Dispatch<React.SetStateAction<DueScenePracticeReviewItemResponse[]>>;
  setSummary: React.Dispatch<React.SetStateAction<ReviewSummary | null>>;
  setIsSessionReview: (value: boolean) => void;
  setSessionSource: (value: string | null) => void;
  onQueueHydrated?: () => void;
}) {
  const {
    setLoading,
    setItems,
    setScenePracticeItems,
    setSummary,
    setIsSessionReview,
    setSessionSource,
    onQueueHydrated,
  } = params;
  const activeLoadTokenRef = useRef(0);

  const loadData = useCallback(async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const canApply = () => activeLoadTokenRef.current === token;
    const preferCache = options?.preferCache ?? false;
    setLoading(true);

    try {
      const session = readReviewSession();
      const prioritizedIds = session?.expressionUserPhraseIds ?? [];
      if (canApply()) {
        setIsSessionReview(prioritizedIds.length > 0);
        setSessionSource(session?.source ?? null);
      }

      if (preferCache) {
        const cache = await getReviewPageCache(REVIEW_LIMIT);
        if (canApply() && cache.found && cache.record) {
          const cachedRows = cache.record.data.rows;
          const nextRows =
            prioritizedIds.length > 0
              ? mergePrioritizedReviewItems({
                  prioritizedIds,
                  dueRows: cachedRows,
                  phraseRows: [],
                })
              : cachedRows;
          setItems(nextRows);
          setScenePracticeItems([]);
          setSummary(cache.record.data.summary);
          onQueueHydrated?.();
          setLoading(false);
        }
      }

      const [due, nextSummary, phraseList] = await Promise.all([
        getDueReviewItemsFromApi(REVIEW_LIMIT),
        getReviewSummaryFromApi(),
        prioritizedIds.length > 0
          ? getMyPhrasesFromApi({
              page: 1,
              limit: 100,
              status: "saved",
              reviewStatus: "all",
            })
          : Promise.resolve(null),
      ]);
      if (!canApply()) return;

      const nextRows =
        prioritizedIds.length > 0
          ? mergePrioritizedReviewItems({
              prioritizedIds,
              dueRows: due.rows,
              phraseRows: phraseList?.rows ?? [],
            })
          : due.rows;

      setItems(nextRows);
      setScenePracticeItems(due.scenePracticeRows ?? []);
      setSummary(nextSummary);
      onQueueHydrated?.();
      void setReviewPageCache(
        {
          rows: due.rows,
          total: due.total,
          summary: nextSummary,
        },
        REVIEW_LIMIT,
      );
    } catch (error) {
      notifyReviewLoadFailed(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      if (canApply()) setLoading(false);
    }
  }, [onQueueHydrated, setIsSessionReview, setItems, setLoading, setScenePracticeItems, setSessionSource, setSummary]);

  useEffect(() => {
    void loadData({ preferCache: true });
  }, [loadData]);

  useEffect(() => {
    const handlePullRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      if (normalizePathname(customEvent.detail?.pathname) !== "/review") return;
      customEvent.detail.handled = true;
      try {
        await clearAllReviewPageCache();
        await loadData({ preferCache: false });
      } catch (error) {
        notifyReviewLoadFailed(error instanceof Error ? error.message : zh.loadFailed);
      }
    };

    window.addEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    return () => {
      window.removeEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    };
  }, [loadData]);

  return {
    loadData,
  };
}
