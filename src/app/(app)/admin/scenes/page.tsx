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

export default async function AdminScenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const originRaw = typeof params.origin === "string" ? params.origin : "";
  const isPublicRaw = typeof params.isPublic === "string" ? params.isPublic : "";
  const origin =
    originRaw === "seed" || originRaw === "imported" ? originRaw : undefined;
  const isPublic =
    isPublicRaw === "true" ? true : isPublicRaw === "false" ? false : undefined;
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );
  const pageSize = 20;

  const result = await listAdminScenes({
    search: q,
    origin,
    isPublic,
    page,
    pageSize,
  });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;

  const buildListUrl = (nextPage: number) =>
    `/admin/scenes?q=${encodeURIComponent(q)}&origin=${originRaw}&isPublic=${isPublicRaw}&page=${nextPage}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Scenes"
        description="Search by title/slug, filter by origin, and inspect scene data."
      />

      <Card className="border-border/70">
        <CardContent className="pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input name="q" defaultValue={q} placeholder="Search title or slug" />
            <select
              name="origin"
              defaultValue={originRaw}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All origins</option>
              <option value="seed">seed</option>
              <option value="imported">imported</option>
            </select>
            <select
              name="isPublic"
              defaultValue={isPublicRaw}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All visibility</option>
              <option value="true">public</option>
              <option value="false">private</option>
            </select>
            <Button type="submit" variant="outline">
              Filter
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
              <th className="px-3 py-2">updated_at</th>
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
                <td className="px-3 py-2 whitespace-nowrap">{row.updated_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No scenes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Showing {(result.page - 1) * result.pageSize + 1}-
          {Math.min(result.page * result.pageSize, result.total)} of {result.total}
        </p>
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={buildListUrl(result.page - 1)}
              className="rounded border px-2 py-1 hover:bg-muted"
            >
              Prev
            </Link>
          ) : (
            <span className="rounded border px-2 py-1 opacity-40">Prev</span>
          )}
          {hasNext ? (
            <Link
              href={buildListUrl(result.page + 1)}
              className="rounded border px-2 py-1 hover:bg-muted"
            >
              Next
            </Link>
          ) : (
            <span className="rounded border px-2 py-1 opacity-40">Next</span>
          )}
        </div>
      </div>
    </div>
  );
}
