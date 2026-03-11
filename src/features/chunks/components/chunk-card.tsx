"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Chunk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <Button
          size="sm"
          variant="secondary"
          className="cursor-pointer"
          onClick={() => toast.success("已加入复习（示例）")}
        >
          加入复习
        </Button>
        <Link
          href="/scenes"
          className={cn(
            buttonVariants({ size: "sm", variant: "ghost" }),
            "cursor-pointer",
          )}
        >
          查看来源课程
        </Link>
      </CardFooter>
    </Card>
  );
}
