"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
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

const reviewStatusLabel: Record<PhraseReviewStatus, string> = {
  saved: "已收藏",
  reviewing: "复习中",
  mastered: "已掌握",
  archived: "已归档",
};

export default function ChunksPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">("all");

  const loadPhrases = async (nextQuery: string, nextFilter: PhraseReviewStatus | "all") => {
    setLoading(true);
    try {
      const result = await getMyPhrasesFromApi({
        query: nextQuery.trim(),
        limit: 100,
        page: 1,
        status: "saved",
        reviewStatus: nextFilter,
      });
      setPhrases(result.rows);
      setTotal(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载收藏短语失败。");
      setPhrases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhrases(query, reviewFilter);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, reviewFilter]);

  const summary = useMemo(() => {
    if (loading) return "加载中...";
    return `共 ${total} 条`;
  }, [loading, total]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="短语库"
        title="已收藏短语"
        description="按真实复习状态管理你的短语：收藏、复习中、已掌握。"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索已收藏短语"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "全部" },
          { key: "saved", label: "已收藏" },
          { key: "reviewing", label: "复习中" },
          { key: "mastered", label: "已掌握" },
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
        <p className="text-sm text-muted-foreground">短语加载中...</p>
      ) : phrases.length === 0 ? (
        <EmptyState title="暂无短语" description="先收藏一些短语，系统会自动加入复习池。" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {phrases.map((item) => (
            <Card key={item.userPhraseId} className="h-full">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">{item.text}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.translation ?? "暂无翻译"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {item.usageNote ?? item.sourceSentenceText ?? "暂无用法说明"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
                  <Badge variant="outline">
                    复习 {item.reviewCount} 次 / 正确 {item.correctCount}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  下次复习：{item.nextReviewAt ? new Date(item.nextReviewAt).toLocaleString() : "—"}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Link
                  href="/review"
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                >
                  去复习
                </Link>
                {item.sourceSceneSlug ? (
                  <Link
                    href={`/scene/${item.sourceSceneSlug}`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    来源场景
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
