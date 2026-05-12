import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, PlusCircle, ShieldCheck, Ticket } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminRegistrationModeState, listAdminInviteCodes } from "@/lib/server/admin/service";
import {
  ADMIN_BADGE_BLUE,
  ADMIN_BADGE_GREEN,
  ADMIN_BADGE_RED,
  ADMIN_BADGE_SLATE,
} from "@/lib/ui/admin-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const LABELS = {
  title: "邀请码管理",
  description: "生成、停用和查看注册邀请码。明文仅在生成当次展示。",
  empty: "还没有邀请码。",
  update: "更新",
  deactivate: "停用",
  registrationMode: "当前注册模式",
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

const formatInviteRemaining = (usedCount: number, maxUses: number) => Math.max(maxUses - usedCount, 0);
const INVITE_CARD = "rounded-xl bg-white shadow-sm";

function AdminInviteNotice({
  notice,
}: {
  notice: ReturnType<typeof readAdminNotice>;
}) {
  if (!notice) return null;
  const className =
    notice.tone === "danger"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-green-100 bg-green-50 text-green-700";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${className}`}>
      {notice.notice}
    </div>
  );
}

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
  const totalCapacity = result.rows.reduce((sum, row) => sum + row.maxUses, 0);
  const totalRemaining = result.rows.reduce(
    (sum, row) => sum + formatInviteRemaining(row.usedCount, row.maxUses),
    0,
  );

  return (
    <main className="bg-[#f8fafc] font-sans">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">{LABELS.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{LABELS.description}</p>
        </header>

        <div className="space-y-6">
          <AdminInviteNotice notice={notice} />

          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={`${INVITE_CARD} p-6 md:col-span-2`}>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">{LABELS.registrationMode}</h2>
                  <p className="text-xs text-slate-400">控制系统入口的开放状态</p>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                  正在运行
                </span>
              </div>
              <form action={updateAdminRegistrationModeAction} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <input type="hidden" name="returnTo" value={currentHref} />
                <select
                  id="registrationMode"
                  name="registrationMode"
                  defaultValue={registrationMode.mode}
                  className="h-[46px] flex-1 cursor-pointer rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="invite_only">邀请注册模式 (目前推荐)</option>
                  <option value="open">全开放注册</option>
                  <option value="closed">维护中 - 禁止注册</option>
                </select>
                <button
                  type="submit"
                  className="min-h-[46px] cursor-pointer rounded-[12px] bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
                >
                  立即更新
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>状态：{REGISTRATION_MODE_LABELS[registrationMode.mode]}</span>
                <span>来源：{REGISTRATION_MODE_SOURCE_LABELS[registrationMode.source]}</span>
                <span>修改人：{registrationMode.updatedBy ?? "-"}</span>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl bg-slate-800 p-6 text-white">
              <p className="text-sm font-medium text-slate-400">总邀请量 / 剩余</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totalCapacity}</span>
                <span className="text-sm text-slate-400">/ {totalRemaining} 剩余</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width:
                      totalCapacity > 0
                        ? `${Math.max(0, Math.min(100, ((totalCapacity - totalRemaining) / totalCapacity) * 100))}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </section>

          <InviteCodeCreatePanel />

          {result.rows.length > 0 ? (
            <section className="space-y-4">
              <h3 className="mb-2 px-1 text-sm font-bold text-slate-800">管理列表</h3>
              {result.rows.map((row) => {
                const isUsedUp = row.usedCount >= row.maxUses;
                const remaining = formatInviteRemaining(row.usedCount, row.maxUses);
                const stateLabel = row.isActive ? (isUsedUp ? "已满额" : "启用中") : "已停用";
                const stateClassName = row.isActive
                  ? isUsedUp
                    ? "rounded border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600"
                    : ADMIN_BADGE_GREEN
                  : ADMIN_BADGE_RED;
                return (
                  <article
                    key={row.id}
                className={`${INVITE_CARD} flex flex-col gap-6 p-5 transition-all md:flex-row`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 md:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                              isUsedUp
                                ? "bg-slate-100 text-slate-400"
                                : "bg-green-50 text-green-500"
                            }`}
                          >
                            {isUsedUp ? <Ticket className="size-5" /> : <CheckCircle2 className="size-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg font-bold tracking-wider text-slate-700">
                                {row.id.slice(0, 8)}
                              </span>
                              <span className={stateClassName}>{stateLabel}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {row.attempts.length > 0
                                ? `过期时间: ${formatAdminDateTime(row.expiresAt, "永不过期")} · 已使用 ${row.usedCount} 次`
                                : "此码目前尚未被使用"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
                          <p>创建：{formatAdminDateTime(row.createdAt)}</p>
                          <p>到期：{formatAdminDateTime(row.expiresAt, "永不过期")}</p>
                          <p>总邀请量 / 剩余：{row.maxUses} / {remaining} 剩余</p>
                          <p>更新：{formatAdminDateTime(row.updatedAt)}</p>
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-slate-700">使用记录</p>
                          {row.attempts.length > 0 ? (
                            <div className="space-y-2">
                              {row.attempts.map((attempt) => (
                                <div key={attempt.id} className="rounded-xl bg-slate-50 p-3">
                                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                    <ShieldCheck className="size-4 text-slate-400" />
                                    <span className="font-semibold text-slate-700">{attempt.email}</span>
                                    <span className={attempt.status === "used" ? ADMIN_BADGE_BLUE : ADMIN_BADGE_SLATE}>
                                      {ATTEMPT_LABELS[attempt.status] ?? attempt.status}
                                    </span>
                                    <span className="text-slate-400">({formatAdminDateTime(attempt.createdAt)})</span>
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span className="font-mono">账号：{attempt.authUserId ?? "-"}</span>
                                    <span>原因：{attempt.failureReason ?? "-"}</span>
                                  </div>
                                  {attempt.account ? (
                                    <p className="mt-2 text-xs text-slate-500">
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
                            <p className="flex h-[58px] items-center justify-center rounded-[12px] border border-dashed border-slate-200 text-xs italic text-slate-300">
                              暂无使用记录。
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-full shrink-0 rounded-xl p-4 md:w-72 ${
                          isUsedUp ? "bg-blue-50/30" : "bg-slate-50"
                        } space-y-3`}
                      >
                        <form action={updateAdminInviteCodeAction} id={`invite-update-${row.id}`} className="grid gap-3">
                          <input type="hidden" name="inviteCodeId" value={row.id} />
                          <input type="hidden" name="returnTo" value={currentHref} />
                          <input type="hidden" name="inviteAction" value="update" />
                          <div className="grid gap-3">
                            <div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                  <Label
                                    htmlFor={`invite-${row.id}-max-uses`}
                                    className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-blue-400"
                                  >
                                    可用次数
                                  </Label>
                                  <Input
                                    id={`invite-${row.id}-max-uses`}
                                    name="maxUses"
                                    type="number"
                                    min={Math.max(row.usedCount, 1)}
                                    max={100}
                                    defaultValue={row.maxUses}
                                    className="h-[38px] w-full rounded-[12px] border border-blue-100 bg-white p-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                </div>
                                <div className="relative">
                                  <Label
                                    htmlFor={`invite-${row.id}-expires-days`}
                                    className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-blue-400"
                                  >
                                    追加天数
                                  </Label>
                                  <Input
                                    id={`invite-${row.id}-expires-days`}
                                    name="expiresInDays"
                                    type="number"
                                    min={0}
                                    max={90}
                                    placeholder="+0"
                                    className="h-[38px] w-full rounded-[12px] border border-blue-100 bg-white p-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </form>

                        <div className="grid grid-cols-2 gap-2">
                          {row.isActive ? (
                            <form action={updateAdminInviteCodeAction}>
                              <input type="hidden" name="inviteCodeId" value={row.id} />
                              <input type="hidden" name="returnTo" value={currentHref} />
                              <input type="hidden" name="inviteAction" value="deactivate" />
                              <button
                                type="submit"
                                className="min-h-[38px] w-full cursor-pointer rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-400 transition-all hover:text-red-500 active:scale-95"
                              >
                                停用
                              </button>
                            </form>
                          ) : (
                            <form action={updateAdminInviteCodeAction}>
                              <input type="hidden" name="inviteCodeId" value={row.id} />
                              <input type="hidden" name="returnTo" value={currentHref} />
                              <input type="hidden" name="inviteAction" value="activate" />
                              <button
                                type="submit"
                                className="min-h-[38px] w-full cursor-pointer rounded-[12px] border border-blue-100 bg-white px-3 py-2.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-50 active:scale-95"
                              >
                                启用
                              </button>
                            </form>
                          )}
                          <button
                            type="submit"
                            form={`invite-update-${row.id}`}
                            className={`min-h-[38px] w-full cursor-pointer rounded-[12px] px-3 py-2.5 text-xs font-bold text-white transition-all active:scale-95 ${
                              isUsedUp
                                ? "bg-blue-600 shadow-sm hover:bg-blue-700"
                                : "bg-slate-800 hover:bg-black"
                            }`}
                          >
                            {isUsedUp ? "更新权益" : "更新配置"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className={`${INVITE_CARD} p-10 text-center text-sm text-slate-500`}>
              <PlusCircle className="mx-auto mb-3 size-8 text-slate-300" />
              {LABELS.empty}
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              {result.total > 0 ? (
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
              )}
            </p>
            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link
                  href={buildListUrl(result.page - 1)}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                  aria-label="上一页"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              ) : (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm"
                  aria-label="上一页"
                >
                  <ChevronLeft className="size-4" />
                </span>
              )}
              {hasNext ? (
                <Link
                  href={buildListUrl(result.page + 1)}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                  aria-label="下一页"
                >
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm"
                  aria-label="下一页"
                >
                  <ChevronRight className="size-4" />
                </span>
              )}
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
