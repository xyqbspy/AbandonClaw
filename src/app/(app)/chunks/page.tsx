import { Search } from "lucide-react";
import { chunkLibrary } from "@/lib/data/mock-chunks";
import { ChunkCard } from "@/features/chunks/components/chunk-card";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";

export default function ChunksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="短语库"
        title="已收藏短语"
        description="把值得反复接触的表达沉淀下来，优先保留你愿意在真实场景使用的短语。"
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="搜索已收藏短语（示例）" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {chunkLibrary.map((chunk) => (
          <ChunkCard key={chunk.id} chunk={chunk} />
        ))}
      </div>
    </div>
  );
}
