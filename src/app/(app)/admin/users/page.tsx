import { ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { updateAdminUserAccessStatusAction } from "@/app/(app)/admin/actions";
import {
  buildAdminHref,
  readAdminNotice,
  readAdminPositivePage,
  readAdminStringParam,
} from "@/app/(app)/admin/admin-page-state";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import {
  AdminEmptyState,
  AdminList,
  AdminListActions,
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
import { listAdminUsers } from "@/lib/server/admin/service";
import { UserAccessStatus } from "@/lib/server/db/types";
import { APPLE_ADMIN_CONTROL, APPLE_ADMIN_SELECT, APPLE_META_TEXT } from "@/lib/ui/apple-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const ACCESS_STATUS_OPTIONS: Array<{
  value: UserAccessStatus;
  label: string;
  badgeVariant: "secondary" | "outline" | "destructive";
}> = [
  { value: "active", label: "正常", badgeVariant: "secondary" },
  { value: "generation_limited", label: "限制生成", badgeVariant: "outline" },
  { value: "readonly", label: "只读", badgeVariant: "outline" },
  { value: "disabled", label: "禁用", badgeVariant: "destructive" },
];

const ACCESS_STATUS_VALUES = new Set<UserAccessStatus>(
  ACCESS_STATUS_OPTIONS.map((item) => item.value),
);

const LABELS = {
  eyebrow: "管理后台",
  title: "用户状态管理",
  description: "按邮箱、用户 ID、用户名或状态快速找到账号，并执行最小处置。",
  search: "搜索邮箱 / 用户 ID / 用户名",
  statusFilter: "全部状态",
  statusFilterLabel: "账号状态筛选",
  submit: "筛选",
  updateStatus: "更新状态",
  empty: "未找到匹配的用户。",
  summaryPrefix: "显示",
  summaryMiddle: "/ 共",
} as const;

const getAccessStatusMeta = (value: UserAccessStatus) =>
  ACCESS_STATUS_OPTIONS.find((item) => item.value === value) ?? ACCESS_STATUS_OPTIONS[0];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const accessStatusRaw = readAdminStringParam(params, "accessStatus");
  const accessStatus = ACCESS_STATUS_VALUES.has(accessStatusRaw as UserAccessStatus)
    ? (accessStatusRaw as UserAccessStatus)
    : undefined;
  const page = readAdminPositivePage(params);
  const notice = readAdminNotice(params);
  const pageSize = 20;

  const result = await listAdminUsers({
    q,
    accessStatus,
    page,
    pageSize,
  });

  const currentHref = buildAdminHref("/admin/users", {
    q,
    accessStatus: accessStatusRaw,
    page,
  });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;
  const buildListUrl = (nextPage: number) =>
    buildAdminHref("/admin/users", {
      q,
      accessStatus: accessStatusRaw,
      page: nextPage,
    });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto]">
          <Input
            name="q"
            defaultValue={q}
            placeholder={LABELS.search}
            className={APPLE_ADMIN_CONTROL}
            aria-label={LABELS.search}
          />
          <select
            name="accessStatus"
            defaultValue={accessStatusRaw}
            className={APPLE_ADMIN_SELECT}
            aria-label={LABELS.statusFilterLabel}
          >
            <option value="">{LABELS.statusFilter}</option>
            {ACCESS_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="default" size="lg">
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      {result.rows.length > 0 ? (
        <AdminList>
          {result.rows.map((row) => {
            const statusMeta = getAccessStatusMeta(row.accessStatus);
            const selectLabel = `设置 ${row.email ?? row.userId} 的账号状态`;

            return (
              <AdminListItem key={row.userId}>
                <AdminListIcon>
                  {row.accessStatus === "disabled" ? (
                    <ShieldAlert className="size-5" />
                  ) : row.accessStatus === "active" ? (
                    <ShieldCheck className="size-5" />
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </AdminListIcon>
                <AdminListContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminListTitle>{row.email ?? row.userId}</AdminListTitle>
                    <AdminListBadges>
                      <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                    </AdminListBadges>
                  </div>
                  <p className={`text-sm ${APPLE_META_TEXT}`}>{row.username ?? "-"}</p>
                  <AdminListMeta>
                    <span className="font-mono">用户 ID：{row.userId}</span>
                    <span>创建时间：{formatAdminDateTime(row.createdAt)}</span>
                  </AdminListMeta>
                </AdminListContent>
                <AdminListActions>
                  <form
                    action={updateAdminUserAccessStatusAction}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={row.userId} />
                    <input type="hidden" name="returnTo" value={currentHref} />
                    <select
                      name="accessStatus"
                      defaultValue={row.accessStatus}
                      className={APPLE_ADMIN_SELECT}
                      aria-label={selectLabel}
                    >
                      {ACCESS_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <AdminActionButton type="submit" tone="primary">
                      {LABELS.updateStatus}
                    </AdminActionButton>
                  </form>
                </AdminListActions>
              </AdminListItem>
            );
          })}
        </AdminList>
      ) : (
        <AdminEmptyState>{LABELS.empty}</AdminEmptyState>
      )}

      <AdminPagination
        summary={
          result.total > 0 ? (
            <>
              {LABELS.summaryPrefix} {(result.page - 1) * result.pageSize + 1}-
              {Math.min(result.page * result.pageSize, result.total)} {LABELS.summaryMiddle}
              {result.total}
            </>
          ) : (
            <>
              {LABELS.summaryPrefix} 0-0 {LABELS.summaryMiddle}
              0
            </>
          )
        }
        prevHref={hasPrev ? buildListUrl(result.page - 1) : null}
        nextHref={hasNext ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
