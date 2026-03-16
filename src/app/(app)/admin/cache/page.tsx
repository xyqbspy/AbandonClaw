import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminAiCache } from "@/lib/server/admin/service";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export default async function AdminCachePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const cacheType = typeof params.cacheType === "string" ? params.cacheType : "";
  const status = typeof params.status === "string" ? params.status : "";
  const cacheKey = typeof params.cacheKey === "string" ? params.cacheKey : "";
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );
  const result = await listAdminAiCache({
    page,
    pageSize: 30,
    search: q,
    cacheType: cacheType || undefined,
    status: status === "success" || status === "error" ? status : undefined,
  });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;

  const selected = cacheKey
    ? result.rows.find((row) => row.cache_key === cacheKey) ?? null
    : null;

  const buildListUrl = (nextPage: number) =>
    `/admin/cache?q=${encodeURIComponent(q)}&cacheType=${cacheType}&status=${status}&page=${nextPage}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="AI Cache"
        description="Read-only cache records for parse/variant diagnostics."
      />

      <Card className="border-border/70">
        <CardContent className="pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input name="q" defaultValue={q} placeholder="Search cache_key" />
            <select
              name="cacheType"
              defaultValue={cacheType}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All types</option>
              <option value="scene_parse">scene_parse</option>
              <option value="scene_variants">scene_variants</option>
            </select>
            <select
              name="status"
              defaultValue={status}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All status</option>
              <option value="success">success</option>
              <option value="error">error</option>
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
              <th className="px-3 py-2">cache_key</th>
              <th className="px-3 py-2">cache_type</th>
              <th className="px-3 py-2">status</th>
              <th className="px-3 py-2">input_hash</th>
              <th className="px-3 py-2">source_ref</th>
              <th className="px-3 py-2">model</th>
              <th className="px-3 py-2">prompt_version</th>
              <th className="px-3 py-2">created_at</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="border-t border-border/50 align-top">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link
                    href={`/admin/cache?q=${encodeURIComponent(q)}&cacheType=${cacheType}&status=${status}&page=${result.page}&cacheKey=${encodeURIComponent(row.cache_key)}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {row.cache_key}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.cache_type}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.input_hash ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.source_ref ?? "-"}</td>
                <td className="px-3 py-2">{row.model ?? "-"}</td>
                <td className="px-3 py-2">{row.prompt_version ?? "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.created_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No cache rows found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <Card className="border-border/70">
          <CardContent className="space-y-2 pt-4 text-sm">
            <p>
              <span className="text-muted-foreground">cache_key:</span>{" "}
              <span className="font-mono text-xs">{selected.cache_key}</span>
            </p>
            <p>
              <span className="text-muted-foreground">status:</span> {selected.status}
            </p>
            <p>
              <span className="text-muted-foreground">meta_json:</span>{" "}
              <span className="font-mono text-xs">
                {selected.meta_json ? JSON.stringify(selected.meta_json) : "-"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">input/output preview:</span>
            </p>
            <pre className="max-h-40 overflow-auto rounded border border-border/60 bg-muted/20 p-2 text-xs">
              {JSON.stringify(
                {
                  input: selected.input_json,
                  output:
                    typeof selected.output_json === "object" &&
                    selected.output_json !== null
                      ? Object.keys(selected.output_json as Record<string, unknown>)
                      : selected.output_json,
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      ) : null}

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
