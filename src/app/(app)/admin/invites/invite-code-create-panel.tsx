"use client";

import { useActionState, useState } from "react";
import { Wand2, Zap } from "lucide-react";
import {
  createAdminInviteCodesAction,
  CreateAdminInviteCodesActionState,
} from "@/app/(app)/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_BUTTON_DARK, ADMIN_FIELD, ADMIN_SELECT } from "@/lib/ui/admin-style";

const INITIAL_STATE: CreateAdminInviteCodesActionState = {
  notice: null,
  tone: "success",
  codes: [],
};

export function InviteCodeCreatePanel() {
  const [state, formAction, pending] = useActionState(createAdminInviteCodesAction, INITIAL_STATE);
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800">
        <Wand2 className="size-4 text-blue-500" />
        快速批量生成
      </h3>

      {state.notice ? (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            state.tone === "danger"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {state.notice}
        </div>
      ) : null}

      <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-mode" className="ml-1 text-[11px] font-bold uppercase text-slate-400">
            生成策略
          </Label>
          <select
            id="invite-create-mode"
            name="mode"
            value={mode}
            onChange={(event) => setMode(event.target.value === "manual" ? "manual" : "auto")}
            className={ADMIN_SELECT}
          >
            <option value="auto">自动随机生成</option>
            <option value="manual">手动指定前缀</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-code-or-count" className="ml-1 text-[11px] font-bold uppercase text-slate-400">
            生成数量
          </Label>
          <Input
            id="invite-create-code-or-count"
            name={mode === "manual" ? "code" : "count"}
            type={mode === "manual" ? "text" : "number"}
            min={mode === "manual" ? undefined : 1}
            max={mode === "manual" ? undefined : 50}
            defaultValue={mode === "manual" ? undefined : 5}
            placeholder={mode === "manual" ? "输入前缀" : "5"}
            className={ADMIN_FIELD}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-create-max-uses" className="ml-1 text-[11px] font-bold uppercase text-slate-400">
            初始可用次数
          </Label>
          <Input
            id="invite-create-max-uses"
            name="maxUses"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className={ADMIN_FIELD}
          />
        </div>
        <input id="invite-create-expires-days" name="expiresInDays" type="hidden" value={7} />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className={`flex w-full items-center justify-center gap-2 rounded-[12px] ${ADMIN_BUTTON_DARK}`}
          >
            <Zap className="size-4" />
            {pending ? "执行中" : "执行任务"}
          </button>
        </div>
      </form>

      {state.codes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">本次生成的明文邀请码：</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.codes.map((item) => (
              <code
                key={item.id}
                className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {item.code}
              </code>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
