import Link from "next/link";
import { buildAdminHref, readAdminPositivePage, readAdminStringParam } from "@/app/(app)/admin/admin-page-state";
import { AdminPagination, AdminTableShell } from "@/components/shared/admin-list-shell";
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminVariants } from "@/lib/server/admin/service";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_INPUT_BASE,
  APPLE_META_TEXT,
  APPLE_TABLE_HEAD,
  APPLE_TABLE_ROW,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u53d8\u4f53\u5217\u8868",
  description: "\u67e5\u770b\u751f\u6210\u53d8\u4f53\uff0c\u5e76\u8ffd\u6eaf\u6240\u5c5e\u573a\u666f\u3002",
  search: "\u641c\u7d22\u573a\u666f\u6807\u9898 / slug / scene_id / cache_key",
  sortDesc: "\u6309 created_at \u5012\u5e8f",
  sortAsc: "\u6309 created_at \u6b63\u5e8f",
  submit: "\u7b5b\u9009",
  empty: "\u672a\u627e\u5230\u53d8\u4f53\u3002",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

export default async function AdminVariantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const sort = readAdminStringParam(params, "sort") === "asc" ? "asc" : "desc";
  const page = readAdminPositivePage(params);
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminVariants({ page, pageSize: 30, search: q, sort });
  const buildListUrl = (nextPage: number) =>
    buildAdminHref("/admin/variants", { q, sort, page: nextPage });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={LABELS.title}
        description={LABELS.description}
      />

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto]">
          <Input name="q" defaultValue={q} placeholder={LABELS.search} />
          <select name="sort" defaultValue={sort} className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}>
            <option value="desc">{LABELS.sortDesc}</option>
            <option value="asc">{LABELS.sortAsc}</option>
          </select>
          <Button type="submit" variant="ghost" className={appleButtonClassName}>
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      <AdminTableShell>
        <table className="min-w-full text-sm">
          <thead className={`${APPLE_TABLE_HEAD} text-left text-xs`}>
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
              <tr key={row.id} className={`${APPLE_TABLE_ROW} align-top`}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/scenes/${row.scene_id}`}
                    className={`${APPLE_TITLE_SM} underline-offset-2 hover:underline`}
                  >
                    {row.scene?.title ?? row.scene_id}
                  </Link>
                  <p className={`font-mono ${APPLE_META_TEXT}`}>{row.scene?.slug ?? row.scene_id}</p>
                </td>
                <td className="px-3 py-2">{row.variant_index}</td>
                <td className="px-3 py-2">{row.model ?? "-"}</td>
                <td className="px-3 py-2">{row.prompt_version ?? "-"}</td>
                <td className="px-3 py-2">{row.retain_chunk_ratio ?? "-"}</td>
                <td className="px-3 py-2">{row.theme ?? "-"}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${APPLE_META_TEXT}`}>{row.created_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  {LABELS.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>

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
