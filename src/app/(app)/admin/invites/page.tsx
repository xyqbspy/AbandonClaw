import { Ticket, TicketCheck, TicketX } from "lucide-react";
import {
  updateAdminInviteCodeAction,
  updateAdminRegistrationModeAction,
} from "@/app/(app)/admin/actions";
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
import { Label } from "@/components/ui/label";
import { getAdminRegistrationModeState, listAdminInviteCodes } from "@/lib/server/admin/service";
import { APPLE_ADMIN_CONTROL, APPLE_META_TEXT } from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "管理后台",
  title: "邀请码管理",
  description: "生成、停用和查看注册邀请码；明文只在生成当次展示。",
  empty: "还没有邀请码。",
  update: "更新",
  deactivate: "停用",
  registrationMode: "注册模式",
  registrationModeDescription: "控制 /signup 是否关闭、邀请注册或公开注册。后台配置会优先生效。",
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

const REGISTRATION_MODE_LABELS = {
  closed: "关闭注册",
  invite_only: "邀请注册",
  open: "公开注册",
} as const;

const REGISTRATION_MODE_SOURCE_LABELS = {
  runtime: "后台配置",
  environment: "环境变量",
  default: "默认兜底",
} as const;

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = readAdminPositivePage(params);
  const notice = readAdminNotice(params);
  const pageSize = 20;
  const [registrationMode, result] = await Promise.all([
    getAdminRegistrationModeState(),
    listAdminInviteCodes({ page, pageSize }),
  ]);
  const currentHref = buildAdminHref("/admin/invites", { page });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;
  const buildListUrl = (nextPage: number) => buildAdminHref("/admin/invites", { page: nextPage });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <section className="space-y-4 rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{LABELS.registrationMode}</h2>
            <p className={`mt-1 text-sm ${APPLE_META_TEXT}`}>
              {LABELS.registrationModeDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={registrationMode.mode === "open" ? "destructive" : "secondary"}>
              {REGISTRATION_MODE_LABELS[registrationMode.mode]}
            </Badge>
            <Badge variant="outline">
              来源：{REGISTRATION_MODE_SOURCE_LABELS[registrationMode.source]}
            </Badge>
          </div>
        </div>
        <AdminListMeta>
          <span>最近修改人：{registrationMode.updatedBy ?? "-"}</span>
          <span>最近修改时间：{registrationMode.updatedAt ?? "-"}</span>
        </AdminListMeta>
        <form action={updateAdminRegistrationModeAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="returnTo" value={currentHref} />
          <div className="min-w-[220px] space-y-1.5">
            <Label htmlFor="registrationMode">切换注册模式</Label>
            <select
              id="registrationMode"
              name="registrationMode"
              defaultValue={registrationMode.mode}
              className={`${APPLE_ADMIN_CONTROL} h-9`}
            >
              <option value="closed">关闭注册</option>
              <option value="invite_only">邀请注册</option>
              <option value="open">公开注册</option>
            </select>
          </div>
          <AdminActionButton type="submit" tone="primary">
            更新注册模式
          </AdminActionButton>
        </form>
      </section>

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
                  <div className="space-y-1.5">
                    <Label htmlFor={`invite-${row.id}-max-uses`}>每码可用次数</Label>
                    <Input
                      id={`invite-${row.id}-max-uses`}
                      name="maxUses"
                      type="number"
                      min={Math.max(row.usedCount, 1)}
                      max={100}
                      defaultValue={row.maxUses}
                      className={APPLE_ADMIN_CONTROL}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`invite-${row.id}-expires-days`}>新的有效天数</Label>
                    <Input
                      id={`invite-${row.id}-expires-days`}
                      name="expiresInDays"
                      type="number"
                      min={0}
                      max={90}
                      placeholder="0 为永不过期"
                      className={APPLE_ADMIN_CONTROL}
                    />
                  </div>
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
