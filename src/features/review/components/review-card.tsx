import { ReviewItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function ReviewCard({ item }: { item: ReviewItem }) {
  const dueLabel = item.due === "today" ? "今日待复习" : item.due === "saved" ? "已收藏" : "已掌握";

  return (
    <Card className="bg-card/90">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{item.chunk}</CardTitle>
          <Badge variant="secondary">{dueLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.meaning}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-lg bg-muted p-3 text-sm">&quot;{item.contextSentence}&quot;</p>
        <div className="space-y-2">
          <p className="text-xs tracking-[0.08em] text-muted-foreground">掌握度</p>
          <Progress value={item.mastery} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">开始复习</Button>
        <Button size="sm" variant="outline">
          稍后再学
        </Button>
      </CardFooter>
    </Card>
  );
}
