import { Progress } from "@/components/ui/progress";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

export function LessonProgress({ value }: { value: number }) {
  return (
    <div className="space-y-[var(--mobile-space-sm)]">
      <div className={`flex items-center justify-between text-[length:var(--mobile-font-meta)] ${APPLE_META_TEXT}`}>
        <span>课程进度</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-[clamp(6px,1.8vw,8px)]" />
    </div>
  );
}
