import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminVariants } from "@/lib/server/admin/service";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_INPUT_BASE, APPLE_SURFACE } from "@/lib/ui/apple-style";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export default async function AdminVariantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const sort = params.sort === "asc" ? "asc" : "desc";
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminVariants({ page, pageSize: 30, search: q, sort });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;

  const buildListUrl = (nextPage: number) =>
    `/admin/variants?q=${encodeURIComponent(q)}&sort=${sort}&page=${nextPage}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="管理后台"
        title="变体列表"
        description="查看生成变体并追溯所属场景。"
      />

      <Card className={APPLE_SURFACE}>
        <CardContent className="pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              name="q"
              defaultValue={q}
              placeholder="搜索场景标题 / slug / scene_id / cache_key"
            />
            <select
              name="sort"
              defaultValue={sort}
              className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
            >
              <option value="desc">按 created_at 倒序</option>
              <option value="asc">按 created_at 正序</option>
            </select>
            <Button type="submit" variant="ghost" className={appleButtonClassName}>
              筛选
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={`overflow-x-auto rounded-lg ${APPLE_SURFACE}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">scene</th>
              <th className="px-3 py-2">variant_index</th>
              <th className="px-3 py-2">model</th>
              <th className="px-3 py-2">prompt_version</th>
              <th className="px-3 py-2">retain_ratio</th>
              <th className="px-3 py-2">theme</th>
              <th className="px-3 py-2">created_at</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/scenes/${row.scene_id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {row.scene?.title ?? row.scene_id}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.scene?.slug ?? row.scene_id}
                  </p>
                </td>
                <td className="px-3 py-2">{row.variant_index}</td>
                <td className="px-3 py-2">{row.model ?? "-"}</td>
                <td className="px-3 py-2">{row.prompt_version ?? "-"}</td>
                <td className="px-3 py-2">{row.retain_chunk_ratio ?? "-"}</td>
                <td className="px-3 py-2">{row.theme ?? "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.created_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  未找到变体。
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
            <Link href={buildListUrl(result.page - 1)} className={`${appleButtonClassName} px-2 py-1`}>
              上一页
            </Link>
          ) : (
            <span className={`${appleButtonClassName} px-2 py-1 opacity-40`}>上一页</span>
          )}
          {hasNext ? (
            <Link href={buildListUrl(result.page + 1)} className={`${appleButtonClassName} px-2 py-1`}>
              下一页
            </Link>
          ) : (
            <span className={`${appleButtonClassName} px-2 py-1 opacity-40`}>下一页</span>
          )}
        </div>
      </div>
    </div>
  );
}

