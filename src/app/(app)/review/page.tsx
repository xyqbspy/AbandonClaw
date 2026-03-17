"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DueReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
  submitPhraseReviewFromApi,
} from "@/lib/utils/review-api";

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<DueReviewItemResponse[]>([]);
  const [summary, setSummary] = useState<{
    dueReviewCount: number;
    reviewedTodayCount: number;
    reviewAccuracy: number | null;
    masteredPhraseCount: number;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [due, nextSummary] = await Promise.all([
        getDueReviewItemsFromApi(20),
        getReviewSummaryFromApi(),
      ]);
      setItems(due.rows);
      setSummary(nextSummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载复习数据失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const current = items[0] ?? null;

  const submit = async (result: "again" | "hard" | "good") => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const response = await submitPhraseReviewFromApi({
        userPhraseId: current.userPhraseId,
        reviewResult: result,
        source: "review_page",
      });
      setItems((prev) => prev.filter((item) => item.userPhraseId !== current.userPhraseId));
      setSummary(response.summary);
      toast.success("已记录复习结果。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交复习失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="复习"
        title="巩固已收藏短语"
        description="把收藏短语真正跑进复习闭环，持续转化为稳定可输出表达。"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">当前待复习</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "..." : summary?.dueReviewCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">今日已复习</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "..." : summary?.reviewedTodayCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">复习正确率</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading
              ? "..."
              : summary?.reviewAccuracy == null
                ? "—"
                : `${summary.reviewAccuracy}%`}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">复习队列加载中...</p>
      ) : !current ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            当前没有到期待复习项，稍后再来巩固。
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{current.text}</CardTitle>
            <p className="text-sm text-muted-foreground">{current.translation ?? "暂无翻译"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {current.usageNote ? (
              <p className="rounded-lg bg-muted p-3 text-sm">{current.usageNote}</p>
            ) : null}
            {current.sourceSentenceText ? (
              <p className="text-sm text-muted-foreground">
                来源句子：{current.sourceSentenceText}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              复习次数 {current.reviewCount}，正确 {current.correctCount}，错误 {current.incorrectCount}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => void submit("again")}
              >
                Again
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => void submit("hard")}
              >
                Hard
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submit("good")}
              >
                Good
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
