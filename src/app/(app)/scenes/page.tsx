import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scenes } from "@/lib/data/mock-lessons";

const difficultyLabel: Record<string, string> = {
  Beginner: "入门",
  Intermediate: "中级",
  Advanced: "进阶",
};

export default function ScenesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="场景学习"
        title="选择一个真实对话场景"
        description="从高频生活语境开始，逐句理解，再进入短语解析与复习。"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scenes.map((scene) => {
          const sentenceCount = scene.sections.reduce(
            (total, section) => total + section.sentences.length,
            0,
          );

          return (
            <Link key={scene.id} href={`/scene/${scene.slug}`} className="group block">
              <Card className="h-full cursor-pointer border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader className="space-y-2">
                  <CardTitle className="line-clamp-2 text-lg leading-7">{scene.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{scene.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{difficultyLabel[scene.difficulty] ?? "中级"}</Badge>
                    <Badge variant="outline">{sentenceCount} 句</Badge>
                    <Badge variant="outline">
                      <Clock3 className="mr-1 size-3" />
                      {scene.estimatedMinutes} 分钟
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{scene.description}</p>
                  <div className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    进入场景
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
