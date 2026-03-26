import { Progress } from "@/components/ui/progress";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

export function LessonProgress({ value }: { value: number }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between text-xs ${APPLE_META_TEXT}`}>
        <span>课程进度</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
