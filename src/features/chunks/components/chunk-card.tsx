import { Chunk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ChunkCard({ chunk }: { chunk: Chunk }) {
  const difficultyLabel =
    chunk.difficulty === "Easy" ? "难度 低" : chunk.difficulty === "Medium" ? "难度 中" : "难度 高";

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{chunk.text}</CardTitle>
        <p className="text-sm text-muted-foreground">{chunk.translation}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{chunk.note}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{difficultyLabel}</Badge>
          {chunk.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="secondary">
          加入复习
        </Button>
        <Button size="sm" variant="ghost">
          查看来源课程
        </Button>
      </CardFooter>
    </Card>
  );
}
