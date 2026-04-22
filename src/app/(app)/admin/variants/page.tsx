import Link from "next/link";
import { CalendarClock, Filter, GitBranch, Search, SlidersHorizontal } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminVariants } from "@/lib/server/admin/service";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u53d8\u4f53\u5217\u8868",
  description: "\u67e5\u770b\u751f\u6210\u53d8\u4f53\uff0c\u5e76\u8ffd\u6eaf\u6240\u5c5e\u573a\u666f\u3002",
  search: "\u641c\u7d22\u573a\u666f\u6807\u9898 / Slug / \u573a\u666f ID / \u7f13\u5b58\u952e",
  sortDesc: "\u6309\u521b\u5efa\u65f6\u95f4\u5012\u5e8f",
  sortAsc: "\u6309\u521b\u5efa\u65f6\u95f4\u6b63\u5e8f",
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={LABELS.search} className={`${APPLE_ADMIN_CONTROL} pl-9`} />
          </div>
          <select name="sort" defaultValue={sort} className={APPLE_ADMIN_SELECT}>
            <option value="desc">{LABELS.sortDesc}</option>
            <option value="asc">{LABELS.sortAsc}</option>
          </select>
          <Button type="submit" variant="default" size="lg" className="gap-2">
            <Filter className="size-4" />
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      {result.rows.length > 0 ? (
        <AdminList>
          {result.rows.map((row) => (
            <AdminListItem key={row.id}>
              <AdminListIcon>
                <GitBranch className="size-5" />
              </AdminListIcon>
              <AdminListContent>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminListTitle>
                  <Link
                    href={`/admin/scenes/${row.scene_id}`}
                    className={`${APPLE_TITLE_SM} underline-offset-2 hover:underline`}
                  >
                    {row.scene?.title ?? row.scene_id}
                  </Link>
                  </AdminListTitle>
                  <AdminListBadges>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      第 {row.variant_index} 个变体
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      模型：{row.model ?? "-"}
                    </span>
                  </AdminListBadges>
                </div>
                <p className={`font-mono text-xs ${APPLE_META_TEXT}`}>{row.scene?.slug ?? row.scene_id}</p>
                <AdminListMeta>
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="size-3.5" />
                    提示词版本：{row.prompt_version ?? "-"} / 保留比例：{row.retain_chunk_ratio ?? "-"}
                  </span>
                  <span>主题：{row.theme ?? "-"}</span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    创建时间：{row.created_at}
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
        prevHref={result.page > 1 ? buildListUrl(result.page - 1) : null}
        nextHref={result.page * result.pageSize < result.total ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
