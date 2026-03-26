import Link from "next/link";
import { buildAdminHref, readAdminPositivePage, readAdminStringParam } from "@/app/(app)/admin/admin-page-state";
import { AdminPagination, AdminTableShell } from "@/components/shared/admin-list-shell";
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_META_TEXT,
  APPLE_TABLE_HEAD,
  APPLE_TABLE_ROW,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u5bfc\u5165\u573a\u666f",
  description:
    "\u5feb\u901f\u67e5\u770b imported \u5185\u5bb9\uff0c\u4fbf\u4e8e\u6392\u67e5 parse \u8d28\u91cf\u4e0e\u6e05\u7406\u3002",
  search: "\u641c\u7d22\u6807\u9898\u6216 slug",
  submit: "\u641c\u7d22",
  empty: "\u672a\u627e\u5230\u5bfc\u5165\u573a\u666f\u3002",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

export default async function AdminImportedScenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const page = readAdminPositivePage(params);
  const pageSize = 20;
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminScenes({
    origin: "imported",
    search: q,
    page,
    pageSize,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={LABELS.title}
        description={LABELS.description}
      />

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto]">
          <Input name="q" defaultValue={q} placeholder={LABELS.search} />
          <Button type="submit" variant="ghost" className={appleButtonClassName}>
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      <AdminTableShell>
        <table className="min-w-full text-sm">
          <thead className={`${APPLE_TABLE_HEAD} text-left text-xs`}>
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
              <tr key={row.id} className={`${APPLE_TABLE_ROW} align-top`}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/scenes/${row.id}`}
                    className={`${APPLE_TITLE_SM} underline-offset-2 hover:underline`}
                  >
                    {row.title}
                  </Link>
                </td>
                <td className={`px-3 py-2 font-mono ${APPLE_META_TEXT}`}>{row.slug}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{row.origin}</Badge>
                </td>
                <td className="px-3 py-2">{row.is_public ? "true" : "false"}</td>
                <td className={`px-3 py-2 font-mono ${APPLE_META_TEXT}`}>{row.created_by ?? "-"}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${APPLE_META_TEXT}`}>{row.created_at}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
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
        prevHref={result.page > 1 ? buildAdminHref("/admin/imported", { q, page: result.page - 1 }) : null}
        nextHref={
          result.page * result.pageSize < result.total
            ? buildAdminHref("/admin/imported", { q, page: result.page + 1 })
            : null
        }
      />
    </div>
  );
}
