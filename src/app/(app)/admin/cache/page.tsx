import {
  AdminCodeBlock,
  AdminDetailItem,
  AdminDetailSection,
} from "@/components/shared/admin-detail-section";
import { buildAdminHref, readAdminPositivePage, readAdminStringParam } from "@/app/(app)/admin/admin-page-state";
import { AdminPagination, AdminTableShell } from "@/components/shared/admin-list-shell";
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminAiCache } from "@/lib/server/admin/service";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_INPUT_BASE } from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "AI \u7f13\u5b58",
  description:
    "\u53ea\u8bfb\u67e5\u770b\u7f13\u5b58\u8bb0\u5f55\uff0c\u7528\u4e8e parse \u548c variant \u95ee\u9898\u6392\u67e5\u3002",
  search: "\u641c\u7d22 cache_key",
  allTypes: "\u5168\u90e8\u7c7b\u578b",
  allStatus: "\u5168\u90e8\u72b6\u6001",
  filter: "\u7b5b\u9009",
  empty: "\u672a\u627e\u5230\u7f13\u5b58\u8bb0\u5f55\u3002",
  selected: "\u5f53\u524d\u9009\u4e2d\u7f13\u5b58",
  status: "\u72b6\u6001\uff1a",
  meta: "meta_json\uff1a",
  preview: "input/output \u9884\u89c8\uff1a",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

export default async function AdminCachePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const cacheType = readAdminStringParam(params, "cacheType");
  const status = readAdminStringParam(params, "status");
  const cacheKey = readAdminStringParam(params, "cacheKey");
  const page = readAdminPositivePage(params);
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminAiCache({
    page,
    pageSize: 30,
    search: q,
    cacheType: cacheType || undefined,
    status: status === "success" || status === "error" ? status : undefined,
  });
  const selected = cacheKey ? result.rows.find((row) => row.cache_key === cacheKey) ?? null : null;
  const buildListUrl = (nextPage: number) =>
    buildAdminHref("/admin/cache", { q, cacheType, status, page: nextPage });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={LABELS.title}
        description={LABELS.description}
      />

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto_auto]">
          <Input name="q" defaultValue={q} placeholder={LABELS.search} />
          <select
            name="cacheType"
            defaultValue={cacheType}
            className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
          >
            <option value="">{LABELS.allTypes}</option>
            <option value="scene_parse">scene_parse</option>
            <option value="scene_variants">scene_variants</option>
          </select>
          <select
            name="status"
            defaultValue={status}
            className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
          >
            <option value="">{LABELS.allStatus}</option>
            <option value="success">success</option>
            <option value="error">error</option>
          </select>
          <Button type="submit" variant="ghost" className={appleButtonClassName}>
            {LABELS.filter}
          </Button>
        </FilterBarForm>
      </FilterBar>

      <AdminTableShell>
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
              <tr key={row.id} className="align-top">
                <td className="px-3 py-2 font-mono text-xs">{row.cache_key}</td>
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
                  {LABELS.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>

      {selected ? (
        <AdminDetailSection title={LABELS.selected} contentClassName="space-y-3 text-sm">
          <div className="space-y-2">
            <AdminDetailItem
              label="cache_key:"
              value={<span className="font-mono text-xs">{selected.cache_key}</span>}
            />
            <AdminDetailItem label={LABELS.status} value={selected.status} />
            <AdminDetailItem
              label={LABELS.meta}
              value={
                <span className="font-mono text-xs">
                  {selected.meta_json ? JSON.stringify(selected.meta_json) : "-"}
                </span>
              }
            />
            <p className="text-muted-foreground">{LABELS.preview}</p>
          </div>
          <AdminCodeBlock className="max-h-40">
            {JSON.stringify(
              {
                input: selected.input_json,
                output:
                  typeof selected.output_json === "object" && selected.output_json !== null
                    ? Object.keys(selected.output_json as Record<string, unknown>)
                    : selected.output_json,
              },
              null,
              2,
            )}
          </AdminCodeBlock>
        </AdminDetailSection>
      ) : null}

      <AdminPagination
        summary={
          <>
            {LABELS.summaryPrefix} {(result.page - 1) * result.pageSize + 1}-
            {Math.min(result.page * result.pageSize, result.total)} {LABELS.summaryMiddle}
            {result.total}
          </>
        }
        prevHref={result.page > 1 ? buildListUrl(result.page - 1) : null}
        nextHref={result.page * result.pageSize < result.total ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
