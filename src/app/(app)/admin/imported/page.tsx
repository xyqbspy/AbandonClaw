import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export default async function AdminImportedScenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );
  const pageSize = 20;

  const result = await listAdminScenes({
    origin: "imported",
    search: q,
    page,
    pageSize,
  });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="管理后台"
        title="导入场景"
        description="快速查看 imported 内容，便于 parse 质量排查和清理。"
      />

      <Card className="border-border/70">
        <CardContent className="pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input name="q" defaultValue={q} placeholder="搜索标题或 slug" />
            <Button type="submit" variant="outline">
              搜索
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">title</th>
              <th className="px-3 py-2">slug</th>
              <th className="px-3 py-2">origin</th>
              <th className="px-3 py-2">is_public</th>
              <th className="px-3 py-2">created_by</th>
              <th className="px-3 py-2">created_at</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="border-t border-border/50 align-top">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/scenes/${row.id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{row.origin}</Badge>
                </td>
                <td className="px-3 py-2">{row.is_public ? "true" : "false"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.created_by ?? "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.created_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  未找到导入场景。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          显示 {(result.page - 1) * result.pageSize + 1}-
          {Math.min(result.page * result.pageSize, result.total)} / 共 {result.total}
        </p>
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={`/admin/imported?q=${encodeURIComponent(q)}&page=${result.page - 1}`}
              className="rounded border px-2 py-1 hover:bg-muted"
            >
              上一页
            </Link>
          ) : (
            <span className="rounded border px-2 py-1 opacity-40">上一页</span>
          )}
          {hasNext ? (
            <Link
              href={`/admin/imported?q=${encodeURIComponent(q)}&page=${result.page + 1}`}
              className="rounded border px-2 py-1 hover:bg-muted"
            >
              下一页
            </Link>
          ) : (
            <span className="rounded border px-2 py-1 opacity-40">下一页</span>
          )}
        </div>
      </div>
    </div>
  );
}
