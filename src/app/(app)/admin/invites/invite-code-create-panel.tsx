"use client";

import { useActionState } from "react";
import {
  createAdminInviteCodesAction,
  CreateAdminInviteCodesActionState,
} from "@/app/(app)/admin/actions";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { Input } from "@/components/ui/input";
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

      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select name="mode" defaultValue="auto" className={APPLE_ADMIN_SELECT} aria-label="生成模式">
          <option value="auto">自动批量</option>
          <option value="manual">手动输入</option>
        </select>
        <Input
          name="code"
          placeholder="手动邀请码（可空）"
          className={APPLE_ADMIN_CONTROL}
          aria-label="手动邀请码"
        />
        <Input
          name="count"
          type="number"
          min={1}
          max={50}
          defaultValue={5}
          className={APPLE_ADMIN_CONTROL}
          aria-label="生成数量"
        />
        <Input
          name="maxUses"
          type="number"
          min={1}
          max={100}
          defaultValue={1}
          className={APPLE_ADMIN_CONTROL}
          aria-label="最大使用次数"
        />
        <Input
          name="expiresInDays"
          type="number"
          min={0}
          max={90}
          defaultValue={7}
          className={APPLE_ADMIN_CONTROL}
          aria-label="过期天数"
        />
        <AdminActionButton type="submit" tone="primary" disabled={pending}>
          {pending ? "生成中" : "生成"}
        </AdminActionButton>
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
