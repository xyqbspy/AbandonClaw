import {
  AdminCodeBlock,
  AdminDetailItem,
  AdminDetailSection,
} from "@/components/shared/admin-detail-section";
import Link from "next/link";
import { CalendarClock, Database, FileJson, Filter, Hash, Search } from "lucide-react";
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
import { listAdminAiCache } from "@/lib/server/admin/service";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "AI \u7f13\u5b58",
  description:
    "\u53ea\u8bfb\u67e5\u770b\u7f13\u5b58\u8bb0\u5f55\uff0c\u7528\u4e8e parse \u548c variant \u95ee\u9898\u6392\u67e5\u3002",
  search: "\u641c\u7d22\u7f13\u5b58\u952e",
  allTypes: "\u5168\u90e8\u7c7b\u578b",
  allStatus: "\u5168\u90e8\u72b6\u6001",
  sceneParse: "\u573a\u666f\u89e3\u6790",
  sceneVariants: "\u573a\u666f\u53d8\u4f53",
  success: "\u6210\u529f",
  error: "\u5931\u8d25",
  filter: "\u7b5b\u9009",
  empty: "\u672a\u627e\u5230\u7f13\u5b58\u8bb0\u5f55\u3002",
  selected: "\u5f53\u524d\u9009\u4e2d\u7f13\u5b58",
  status: "\u72b6\u6001\uff1a",
  meta: "\u5143\u4fe1\u606f\uff1a",
  preview: "\u8f93\u5165 / \u8f93\u51fa\u9884\u89c8\uff1a",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

const formatCacheType = (cacheTypeValue: string) =>
  cacheTypeValue === "scene_parse"
    ? LABELS.sceneParse
    : cacheTypeValue === "scene_variants"
      ? LABELS.sceneVariants
      : cacheTypeValue;

const formatCacheStatus = (statusValue: string) =>
  statusValue === "success" ? LABELS.success : statusValue === "error" ? LABELS.error : statusValue;

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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={LABELS.search} className={`${APPLE_ADMIN_CONTROL} pl-9`} />
          </div>
          <select
            name="cacheType"
            defaultValue={cacheType}
            className={APPLE_ADMIN_SELECT}
          >
            <option value="">{LABELS.allTypes}</option>
            <option value="scene_parse">{LABELS.sceneParse}</option>
            <option value="scene_variants">{LABELS.sceneVariants}</option>
          </select>
          <select
            name="status"
            defaultValue={status}
            className={APPLE_ADMIN_SELECT}
          >
            <option value="">{LABELS.allStatus}</option>
            <option value="success">{LABELS.success}</option>
            <option value="error">{LABELS.error}</option>
          </select>
          <Button type="submit" variant="default" size="lg" className="gap-2">
            <Filter className="size-4" />
            {LABELS.filter}
          </Button>
        </FilterBarForm>
      </FilterBar>

      {result.rows.length > 0 ? (
        <AdminList>
          {result.rows.map((row) => (
            <AdminListItem key={row.id}>
              <AdminListIcon>
                <Database className="size-5" />
              </AdminListIcon>
              <AdminListContent>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminListTitle className="font-mono text-sm">
                    <Link
                      href={buildAdminHref("/admin/cache", {
                        q,
                        cacheType,
                        status,
                        cacheKey: row.cache_key,
                        page,
                      })}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.cache_key}
                    </Link>
                  </AdminListTitle>
                  <AdminListBadges>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {formatCacheType(row.cache_type)}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {formatCacheStatus(row.status)}
                    </span>
                  </AdminListBadges>
                </div>
                <AdminListMeta>
                  <span className="flex items-center gap-1.5">
                    <Hash className="size-3.5" />
                    {row.input_hash ?? "-"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileJson className="size-3.5" />
                    来源：{row.source_ref ?? "-"}
                  </span>
                  <span>模型：{row.model ?? "-"}</span>
                  <span>提示词版本：{row.prompt_version ?? "-"}</span>
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

      {selected ? (
        <AdminDetailSection title={LABELS.selected} contentClassName="space-y-3 text-sm">
          <div className="space-y-2">
            <AdminDetailItem
              label="缓存键："
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
            <p className={APPLE_META_TEXT}>{LABELS.preview}</p>
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
