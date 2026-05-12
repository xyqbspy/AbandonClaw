import Link from "next/link";
import { CalendarClock, Search, UploadCloud, UserRound } from "lucide-react";
import { buildAdminHref, readAdminPositivePage, readAdminStringParam } from "@/app/(app)/admin/admin-page-state";
import {
  AdminEmptyState,
  AdminList,
  AdminListBadges,
  AdminListContent,
  AdminListIcon,
  AdminListItem,
  AdminListMeta,
  AdminListTitle,
  AdminPagination,
} from "@/components/shared/admin-list-shell";
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_META_TEXT,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u5bfc\u5165\u573a\u666f",
  description:
    "\u5feb\u901f\u67e5\u770b imported \u5185\u5bb9\uff0c\u4fbf\u4e8e\u6392\u67e5 parse \u8d28\u91cf\u4e0e\u6e05\u7406\u3002",
  search: "\u641c\u7d22\u6807\u9898\u6216 slug",
  submit: "\u641c\u7d22",
  imported: "\u5bfc\u5165",
  public: "\u516c\u5f00",
  private: "\u79c1\u6709",
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={LABELS.search} className={`${APPLE_ADMIN_CONTROL} pl-9`} />
          </div>
          <Button type="submit" variant="default" size="lg" className="gap-2">
            <Search className="size-4" />
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      {result.rows.length > 0 ? (
        <AdminList>
          {result.rows.map((row) => (
            <AdminListItem key={row.id}>
              <AdminListIcon>
                <UploadCloud className="size-5" />
              </AdminListIcon>
              <AdminListContent>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminListTitle>
                  <Link
                    href={`/admin/scenes/${row.id}`}
                    className={`${APPLE_TITLE_SM} underline-offset-2 hover:underline`}
                  >
                    {row.title}
                  </Link>
                  </AdminListTitle>
                  <AdminListBadges>
                    <Badge variant="outline">{LABELS.imported}</Badge>
                    <Badge variant="secondary">{row.is_public ? LABELS.public : LABELS.private}</Badge>
                  </AdminListBadges>
                </div>
                <p className={`font-mono text-xs ${APPLE_META_TEXT}`}>{row.slug}</p>
                <AdminListMeta>
                  <span className="flex items-center gap-1.5">
                    <UserRound className="size-3.5" />
                    创建者：{row.created_by ?? "-"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    创建时间：{formatAdminDateTime(row.created_at)}
                  </span>
                </AdminListMeta>
              </AdminListContent>
            </AdminListItem>
          ))}
        </AdminList>
      ) : (
        <AdminEmptyState>{LABELS.empty}</AdminEmptyState>
      )}

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
