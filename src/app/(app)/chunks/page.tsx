"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getMyPhrasesFromApi,
  PhraseReviewStatus,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";

const zh = {
  loadFailed: "\u52a0\u8f7d\u6536\u85cf\u77ed\u8bed\u5931\u8d25\u3002",
  loading: "\u52a0\u8f7d\u4e2d...",
  total: "\u5171",
  items: "\u6761",
  eyebrow: "\u77ed\u8bed\u5e93",
  title: "\u5df2\u6536\u85cf\u77ed\u8bed",
  desc: "\u6309\u771f\u5b9e\u590d\u4e60\u72b6\u6001\u7ba1\u7406\u4f60\u7684\u77ed\u8bed\uff1a\u6536\u85cf\u3001\u590d\u4e60\u4e2d\u3001\u5df2\u638c\u63e1\u3002",
  searchPlaceholder: "\u641c\u7d22\u5df2\u6536\u85cf\u77ed\u8bed",
  tabs: {
    all: "\u5168\u90e8",
    saved: "\u5df2\u6536\u85cf",
    reviewing: "\u590d\u4e60\u4e2d",
    mastered: "\u5df2\u638c\u63e1",
  },
  listLoading: "\u77ed\u8bed\u52a0\u8f7d\u4e2d...",
  emptyTitle: "\u6682\u65e0\u77ed\u8bed",
  emptyDesc: "\u5148\u6536\u85cf\u4e00\u4e9b\u77ed\u8bed\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u52a0\u5165\u590d\u4e60\u6c60\u3002",
  noTranslation: "\u6682\u65e0\u7ffb\u8bd1",
  noUsage: "\u6682\u65e0\u7528\u6cd5\u8bf4\u660e",
  reviewTimes: "\u590d\u4e60",
  correct: "\u6b63\u786e",
  times: "\u6b21",
  nextReview: "\u4e0b\u6b21\u590d\u4e60\uff1a",
  dash: "\u2014",
  goReview: "\u53bb\u590d\u4e60",
  sourceScene: "\u6765\u6e90\u573a\u666f",
};

const reviewStatusLabel: Record<PhraseReviewStatus, string> = {
  saved: zh.tabs.saved,
  reviewing: zh.tabs.reviewing,
  mastered: zh.tabs.mastered,
  archived: "\u5df2\u5f52\u6863",
};

export default function ChunksPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">("all");
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");
  const activeLoadTokenRef = useRef(0);

  const loadPhrases = async (
    nextQuery: string,
    nextFilter: PhraseReviewStatus | "all",
    options?: { preferCache?: boolean },
  ) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;
    if (!preferCache) setListDataSource("none");
    setLoading(true);

    let networkApplied = false;
    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;

    const requestParams = {
      query: nextQuery.trim(),
      limit: 100,
      page: 1,
      status: "saved" as const,
      reviewStatus: nextFilter,
    };

    const networkPromise = getMyPhrasesFromApi(requestParams);

    const cacheTask = (async () => {
      if (!preferCache) return;
      try {
        const cache = await getPhraseListCache({
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
          page: requestParams.page,
          limit: requestParams.limit,
        });
        if (!canApply() || networkApplied) return;
        if (cache.found && cache.record) {
          hasCacheFallback = true;
          setPhrases(cache.record.data.rows);
          setTotal(cache.record.data.total);
          setListDataSource("cache");
          setLoading(false);
        }
      } catch {
        // Ignore cache failure.
      }
    })();

    const networkTask = (async () => {
      try {
        const result = await networkPromise;
        if (!canApply()) return;
        networkApplied = true;
        setPhrases(result.rows);
        setTotal(result.total);
        setListDataSource("network");
        setLoading(false);
        void setPhraseListCache(
          {
            query: requestParams.query,
            status: requestParams.status,
            reviewStatus: requestParams.reviewStatus,
            page: requestParams.page,
            limit: requestParams.limit,
          },
          result,
        ).catch(() => {
          // Non-blocking.
        });
      } catch (error) {
        if (!canApply()) return;
        if (!hasCacheFallback) {
          toast.error(error instanceof Error ? error.message : zh.loadFailed);
          setPhrases([]);
          setTotal(0);
          setLoading(false);
        }
      }
    })();

    await Promise.allSettled([cacheTask, networkTask]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhrases(query, reviewFilter, { preferCache: true });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, reviewFilter]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[phrase-list-cache][debug]", {
      source: listDataSource,
      count: phrases.length,
      filter: reviewFilter,
    });
  }, [listDataSource, phrases.length, reviewFilter]);

  const summary = useMemo(() => {
    if (loading) return zh.loading;
    return `${zh.total} ${total} ${zh.items}`;
  }, [loading, total]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={zh.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: zh.tabs.all },
          { key: "saved", label: zh.tabs.saved },
          { key: "reviewing", label: zh.tabs.reviewing },
          { key: "mastered", label: zh.tabs.mastered },
        ].map((tab) => (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            variant={reviewFilter === tab.key ? "default" : "outline"}
            onClick={() => setReviewFilter(tab.key as PhraseReviewStatus | "all")}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{zh.listLoading}</p>
      ) : phrases.length === 0 ? (
        <EmptyState title={zh.emptyTitle} description={zh.emptyDesc} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {phrases.map((item) => (
            <Card key={item.userPhraseId} className="h-full">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">{item.text}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {item.translation ?? zh.noTranslation}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {item.usageNote ?? item.sourceSentenceText ?? zh.noUsage}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
                  <Badge variant="outline">
                    {zh.reviewTimes} {item.reviewCount} {zh.times} / {zh.correct} {item.correctCount}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {zh.nextReview}
                  {item.nextReviewAt ? new Date(item.nextReviewAt).toLocaleString() : zh.dash}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Link
                  href="/review"
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                >
                  {zh.goReview}
                </Link>
                {item.sourceSceneSlug ? (
                  <Link
                    href={`/scene/${item.sourceSceneSlug}`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    {zh.sourceScene}
                  </Link>
                ) : null}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
