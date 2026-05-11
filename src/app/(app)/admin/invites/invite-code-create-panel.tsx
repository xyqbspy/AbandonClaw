"use client";

import { useActionState } from "react";
import {
  createAdminInviteCodesAction,
  CreateAdminInviteCodesActionState,
} from "@/app/(app)/admin/actions";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPLE_ADMIN_CONTROL, APPLE_ADMIN_SELECT, APPLE_META_TEXT } from "@/lib/ui/apple-style";

const INITIAL_STATE: CreateAdminInviteCodesActionState = {
  notice: null,
  tone: "success",
  codes: [],
};

export function InviteCodeCreatePanel() {
  const [state, formAction, pending] = useActionState(createAdminInviteCodesAction, INITIAL_STATE);

  return (
    <div className="space-y-4 rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-soft)]">
      <div>
        <h2 className="text-base font-semibold text-foreground">生成邀请码</h2>
        <p className={`mt-1 text-sm ${APPLE_META_TEXT}`}>
          明文只会在生成成功后显示一次；数据库只保存 hash。
        </p>
      </div>

      {state.notice ? <AdminNoticeCard tone={state.tone}>{state.notice}</AdminNoticeCard> : null}

      <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-mode">生成方式</Label>
          <select
            id="invite-create-mode"
            name="mode"
            defaultValue="auto"
            className={APPLE_ADMIN_SELECT}
          >
            <option value="auto">自动批量</option>
            <option value="manual">手动输入</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-code">手动邀请码</Label>
          <Input
            id="invite-create-code"
            name="code"
            placeholder="仅手动输入时填写"
            className={APPLE_ADMIN_CONTROL}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-count">生成数量</Label>
          <Input
            id="invite-create-count"
            name="count"
            type="number"
            min={1}
            max={50}
            defaultValue={5}
            className={APPLE_ADMIN_CONTROL}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-max-uses">每码可用次数</Label>
          <Input
            id="invite-create-max-uses"
            name="maxUses"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className={APPLE_ADMIN_CONTROL}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-expires-days">有效天数</Label>
          <Input
            id="invite-create-expires-days"
            name="expiresInDays"
            type="number"
            min={0}
            max={90}
            defaultValue={7}
            placeholder="0 为永不过期"
            className={APPLE_ADMIN_CONTROL}
          />
        </div>
        <div className="flex items-end">
          <AdminActionButton type="submit" tone="primary" disabled={pending}>
            {pending ? "生成中" : "生成"}
          </AdminActionButton>
        </div>
      </form>

      {state.codes.length > 0 ? (
        <div className="space-y-2">
          <p className={`text-sm ${APPLE_META_TEXT}`}>本次生成的明文邀请码：</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.codes.map((item) => (
              <code
                key={item.id}
                className="rounded-md border border-[var(--app-border-soft)] bg-muted/50 px-3 py-2 text-sm"
              >
                {item.code}
              </code>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
