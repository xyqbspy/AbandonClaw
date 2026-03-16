"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyPhrasesFromApi, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";

export default function ChunksPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const activeLoadTokenRef = useRef(0);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");
  const [total, setTotal] = useState(0);

  const loadPhrases = useCallback(async (nextQuery: string) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const normalizedQuery = nextQuery.trim();
    let networkApplied = false;
    let hasCacheFallback = false;

    const canApply = () => activeLoadTokenRef.current === token;
    setLoading(true);
    setListDataSource("none");

    const networkPromise = getMyPhrasesFromApi({
      query: normalizedQuery,
      limit: 100,
      page: 1,
      status: "saved",
    });

    const cacheTask = (async () => {
      try {
        const cache = await getPhraseListCache({
          query: normalizedQuery,
          limit: 100,
          page: 1,
          status: "saved",
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
        // Non-blocking cache read.
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
            query: normalizedQuery,
            limit: 100,
            page: 1,
            status: "saved",
          },
          result,
        ).catch(() => {
          // Non-blocking cache write.
        });
      } catch (error) {
        if (!canApply()) return;
        if (!hasCacheFallback) {
          toast.error(error instanceof Error ? error.message : "加载收藏短语失败。");
          setPhrases([]);
          setTotal(0);
          setLoading(false);
        }
      }
    })();

    await Promise.allSettled([cacheTask, networkTask]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhrases(query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadPhrases, query]);

  const hasRows = phrases.length > 0;
  const summary = useMemo(() => {
    if (loading) return "加载中...";
    return `共 ${total} 条收藏短语`;
  }, [loading, total]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[phrase-list-cache][debug]", {
      source: listDataSource,
      count: phrases.length,
      total,
    });
  }, [listDataSource, phrases.length, total]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="短语库"
        title="已收藏短语"
        description="把值得反复接触的表达沉淀下来，优先保留你愿意在真实场景使用的短语。"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索已收藏短语"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">短语加载中...</p>
      ) : !hasRows ? (
        <EmptyState
          title="还没有收藏短语"
          description="在场景学习页点击“收藏短语”后，这里会显示真实收藏记录。"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {phrases.map((item) => (
            <Card key={item.userPhraseId} className="h-full">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">{item.text}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {item.translation ?? "暂无翻译"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {item.usageNote ?? item.sourceSentenceText ?? "暂无用法说明"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {item.difficulty ? `难度 ${item.difficulty}` : "难度 未标注"}
                  </Badge>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  收藏时间：{new Date(item.savedAt).toLocaleString()}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" variant="secondary" disabled>
                  加入复习
                </Button>
                {item.sourceSceneSlug ? (
                  <Link
                    href={`/scene/${item.sourceSceneSlug}`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    查看来源场景
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
