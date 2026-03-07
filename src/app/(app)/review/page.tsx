import { reviewItems } from "@/lib/data/mock-review";
import { ReviewCard } from "@/features/review/components/review-card";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="复习"
        title="巩固已收藏短语"
        description="用短时高频回顾保持熟悉度，把理解过的表达真正变成可输出内容。"
      />
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">今日待复习</TabsTrigger>
          <TabsTrigger value="saved">已收藏</TabsTrigger>
          <TabsTrigger value="mastered">已掌握</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="grid gap-4 md:grid-cols-2">
          {reviewItems.filter((item) => item.due === "today").map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </TabsContent>
        <TabsContent value="saved" className="grid gap-4 md:grid-cols-2">
          {reviewItems.filter((item) => item.due === "saved").map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </TabsContent>
        <TabsContent value="mastered" className="grid gap-4 md:grid-cols-2">
          {reviewItems.filter((item) => item.due === "mastered").map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
