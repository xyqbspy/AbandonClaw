import { Ticket, TicketCheck, TicketX } from "lucide-react";
import { updateAdminInviteCodeAction } from "@/app/(app)/admin/actions";
import {
  buildAdminHref,
  readAdminNotice,
  readAdminPositivePage,
} from "@/app/(app)/admin/admin-page-state";
import { InviteCodeCreatePanel } from "@/app/(app)/admin/invites/invite-code-create-panel";
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
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listAdminInviteCodes } from "@/lib/server/admin/service";
import { APPLE_ADMIN_CONTROL, APPLE_META_TEXT } from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "管理后台",
  title: "邀请码管理",
  description: "生成、停用和查看注册邀请码；明文只在生成当次展示。",
  empty: "还没有邀请码。",
  update: "更新",
  deactivate: "停用",
  summaryPrefix: "显示",
  summaryMiddle: "/ 共",
} as const;

const ATTEMPT_LABELS: Record<string, string> = {
  pending: "处理中",
  used: "已使用",
  rejected: "已拒绝",
  failed: "注册失败",
  needs_repair: "需修复",
};

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = readAdminPositivePage(params);
  const notice = readAdminNotice(params);
  const pageSize = 20;
  const result = await listAdminInviteCodes({ page, pageSize });
  const currentHref = buildAdminHref("/admin/invites", { page });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;
  const buildListUrl = (nextPage: number) => buildAdminHref("/admin/invites", { page: nextPage });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <InviteCodeCreatePanel />

      {result.rows.length > 0 ? (
        <AdminList>
          {result.rows.map((row) => (
            <AdminListItem key={row.id} className="sm:items-start">
              <AdminListIcon>
                {row.isActive ? <TicketCheck className="size-5" /> : <TicketX className="size-5" />}
              </AdminListIcon>
              <AdminListContent>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminListTitle>邀请码 {row.id.slice(0, 8)}</AdminListTitle>
                  <AdminListBadges>
                    <Badge variant={row.isActive ? "secondary" : "destructive"}>
                      {row.isActive ? "启用" : "停用"}
                    </Badge>
                    <Badge variant="outline">
                      {row.usedCount}/{row.maxUses}
                    </Badge>
                  </AdminListBadges>
                </div>
                <AdminListMeta>
                  <span>创建时间：{row.createdAt}</span>
                  <span>过期时间：{row.expiresAt ?? "永不过期"}</span>
                  <span>更新时间：{row.updatedAt}</span>
                </AdminListMeta>

                <div className="space-y-2 pt-2">
                  <p className={`text-sm font-medium text-foreground`}>使用记录</p>
                  {row.attempts.length > 0 ? (
                    <div className="space-y-2">
                      {row.attempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="rounded-md border border-[var(--app-border-soft)] bg-muted/30 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {attempt.email}
                            </span>
                            <Badge variant={attempt.status === "used" ? "secondary" : "outline"}>
                              {ATTEMPT_LABELS[attempt.status] ?? attempt.status}
                            </Badge>
                          </div>
                          <AdminListMeta className="mt-2">
                            <span>时间：{attempt.createdAt}</span>
                            <span className="font-mono">
                              账号：{attempt.authUserId ?? "-"}
                            </span>
                            <span>原因：{attempt.failureReason ?? "-"}</span>
                          </AdminListMeta>
                          {attempt.account ? (
                            <p className={`mt-2 text-xs ${APPLE_META_TEXT}`}>
                              用户名：{attempt.account.username ?? "-"} · 状态：
                              {attempt.account.accessStatus} · 邮箱：
                              {attempt.account.emailVerified === null
                                ? "未知"
                                : attempt.account.emailVerified
                                  ? "已验证"
                                  : "未验证"} · 学习秒数：{attempt.account.studySeconds} · 完成场景：
                              {attempt.account.scenesCompleted} · 复习：
                              {attempt.account.reviewItemsCompleted} · 高成本：
                              {attempt.account.highCostSuccess}/{attempt.account.highCostReserved}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${APPLE_META_TEXT}`}>暂无使用记录。</p>
                  )}
                </div>
              </AdminListContent>
              <AdminListActions className="sm:max-w-[260px]">
                <form action={updateAdminInviteCodeAction} className="grid gap-2">
                  <input type="hidden" name="inviteCodeId" value={row.id} />
                  <input type="hidden" name="returnTo" value={currentHref} />
                  <input type="hidden" name="inviteAction" value="update" />
                  <Input
                    name="maxUses"
                    type="number"
                    min={Math.max(row.usedCount, 1)}
                    max={100}
                    defaultValue={row.maxUses}
                    className={APPLE_ADMIN_CONTROL}
                    aria-label="最大使用次数"
                  />
                  <Input
                    name="expiresInDays"
                    type="number"
                    min={0}
                    max={90}
                    placeholder="从现在起多少天后过期"
                    className={APPLE_ADMIN_CONTROL}
                    aria-label="过期天数"
                  />
                  <AdminActionButton type="submit" tone="primary">
                    {LABELS.update}
                  </AdminActionButton>
                </form>
                {row.isActive ? (
                  <form action={updateAdminInviteCodeAction}>
                    <input type="hidden" name="inviteCodeId" value={row.id} />
                    <input type="hidden" name="returnTo" value={currentHref} />
                    <input type="hidden" name="inviteAction" value="deactivate" />
                    <AdminActionButton type="submit" tone="danger">
                      <Ticket className="size-3.5" />
                      {LABELS.deactivate}
                    </AdminActionButton>
                  </form>
                ) : null}
              </AdminListActions>
            </AdminListItem>
          ))}
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
