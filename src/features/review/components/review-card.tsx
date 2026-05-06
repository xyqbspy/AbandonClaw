"use client";

import { toast } from "sonner";
import { ReviewItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  APPLE_BODY_TEXT,
  APPLE_CARD_INTERACTIVE,
  APPLE_META_TEXT,
  APPLE_PANEL,
} from "@/lib/ui/apple-style";

function ReviewCardContextBlock({ sentence }: { sentence: string }) {
  return <p className={`p-3 ${APPLE_PANEL} ${APPLE_BODY_TEXT}`}>&quot;{sentence}&quot;</p>;
}

function ReviewCardMasteryBlock({ mastery }: { mastery: number }) {
  return (
    <div className="space-y-2">
      <p className={APPLE_META_TEXT}>掌握度</p>
      <Progress value={mastery} className="h-2" />
    </div>
  );
}

export function ReviewCard({ item }: { item: ReviewItem }) {
  const dueLabel =
    item.due === "today" ? "今日待复习" : item.due === "saved" ? "已收藏" : "已掌握";

  return (
    <Card className={APPLE_CARD_INTERACTIVE}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{item.chunk}</CardTitle>
          <Badge variant="secondary">{dueLabel}</Badge>
        </div>
        <p className={APPLE_META_TEXT}>{item.meaning}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReviewCardContextBlock sentence={item.contextSentence} />
        <ReviewCardMasteryBlock mastery={item.mastery} />
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={() => toast.message("请从复习页开始正式回忆训练。")}
        >
          开始复习
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => toast.success("已标记稍后再学。")}
        >
          稍后再学
        </Button>
      </CardFooter>
    </Card>
  );
}
