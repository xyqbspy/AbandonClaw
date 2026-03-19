import Link from "next/link";
import { deleteAdminPhraseAction, enrichAdminPhraseAction } from "@/app/(app)/admin/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminPhrases } from "@/lib/server/admin/service";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export default async function AdminPhrasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const itemTypeRaw = typeof params.itemType === "string" ? params.itemType : "all";
  const itemType =
    itemTypeRaw === "sentence" ? "sentence" : itemTypeRaw === "chunk" ? "expression" : "all";
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );

  const pageSize = 20;
  const result = await listAdminPhrases({
    search: q,
    learningItemType: itemType,
    page,
    pageSize,
  });

  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;
  const buildListUrl = (nextPage: number) =>
    `/admin/phrases?q=${encodeURIComponent(q)}&itemType=${encodeURIComponent(itemTypeRaw)}&page=${nextPage}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="管理后台"
        title="表达库管理"
        description="支持按 chunk / 句子筛选，列表区分类型并可直接删除。"
      />

      <Card className="border-border/70">
        <CardContent className="pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input name="q" defaultValue={q} placeholder="搜索表达 / 句子 / 翻译" />
            <select
              name="itemType"
              defaultValue={itemTypeRaw}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="all">全部类型</option>
              <option value="chunk">chunk</option>
              <option value="sentence">句子</option>
            </select>
            <Button type="submit" variant="outline">
              筛选
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">内容</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">补全状态</th>
              <th className="px-3 py-2">翻译</th>
              <th className="px-3 py-2">来源场景</th>
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">保存时间</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.userPhraseId} className="border-t border-border/50 align-top">
                <td className="max-w-[360px] px-3 py-2">
                  <p className="line-clamp-2 font-medium">{row.text}</p>
                  {row.sourceSentenceText && row.learningItemType === "expression" ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      例句：{row.sourceSentenceText}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.learningItemType === "sentence" ? "secondary" : "outline"}>
                    {row.learningItemType === "sentence" ? "句子" : "chunk"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{row.aiEnrichmentStatus ?? "-"}</Badge>
                </td>
                <td className="max-w-[260px] px-3 py-2 text-muted-foreground">
                  <p className="line-clamp-2">{row.translation ?? "-"}</p>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.sourceSceneSlug ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {row.userId.slice(0, 8)}...
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                  {row.savedAt}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <form action={enrichAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={
                          row.learningItemType !== "expression" ||
                          row.aiEnrichmentStatus === "pending"
                        }
                      >
                        补全
                      </Button>
                    </form>
                    <form action={deleteAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <Button type="submit" size="sm" variant="destructive">
                        删除
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  未找到表达
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
            <Link href={buildListUrl(result.page - 1)} className="rounded border px-2 py-1 hover:bg-muted">
              上一页
            </Link>
          ) : (
            <span className="rounded border px-2 py-1 opacity-40">上一页</span>
          )}
          {hasNext ? (
            <Link href={buildListUrl(result.page + 1)} className="rounded border px-2 py-1 hover:bg-muted">
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
