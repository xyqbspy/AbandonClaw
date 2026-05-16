"use client";

import Link from "next/link";
import { ArrowRight, IdCard, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_USER_VOICE_SPEED,
  normalizeUserVoiceSpeed,
  USER_SETTINGS_STORAGE_KEY,
  type UserVoiceSpeed,
} from "@/lib/utils/user-settings";

type SettingsDraft = {
  dailyMinutes: string;
  uiLanguage: string;
  voiceSpeed: UserVoiceSpeed;
};

const CARD_CLASS = "rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-8";
const FIELD_CLASS = "space-y-2";
const LABEL_CLASS = "ml-1 block text-xs font-bold text-slate-500";
const INPUT_CLASS =
  "h-12 w-full rounded-[14px] border-2 border-transparent bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const READONLY_INPUT_CLASS =
  "h-12 w-full rounded-[14px] border-2 border-transparent bg-slate-100 px-4 text-sm font-semibold text-slate-500";
const ICON_CLASS = "flex size-8 items-center justify-center rounded-lg text-sm";

const loadDraft = (): SettingsDraft => {
  const fallback = {
    dailyMinutes: "20",
    uiLanguage: "简体中文",
    voiceSpeed: DEFAULT_USER_VOICE_SPEED,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<SettingsDraft>;
    return {
      dailyMinutes: parsed.dailyMinutes ?? fallback.dailyMinutes,
      uiLanguage: parsed.uiLanguage ?? fallback.uiLanguage,
      voiceSpeed: normalizeUserVoiceSpeed(parsed.voiceSpeed),
    };
  } catch {
    return fallback;
  }
};

type SettingsPageClientProps = {
  canAccessAdmin: boolean;
  userDisplay: {
    displayName: string;
    email: string;
  };
};

export function SettingsPageClient({ canAccessAdmin, userDisplay }: SettingsPageClientProps) {
  const [initialDraft, setInitialDraft] = useState<SettingsDraft>(() => loadDraft());
  const [draft, setDraft] = useState<SettingsDraft>(initialDraft);

  const isDirty = useMemo(() => {
    return JSON.stringify(initialDraft) !== JSON.stringify(draft);
  }, [draft, initialDraft]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:space-y-8 sm:py-8 lg:px-5">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">账号与学习偏好</h1>
        <p className="mt-2 text-sm text-slate-500">管理个人信息、学习节奏和发音相关设置。</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2">
        <section className={CARD_CLASS}>
          <div className="mb-6 flex items-center gap-3">
            <div className={cn(ICON_CLASS, "bg-blue-50 text-blue-600")}>
              <IdCard className="size-4" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-slate-800">个人资料</h2>
          </div>

          <div className="space-y-5">
            <div className={FIELD_CLASS}>
              <label className={LABEL_CLASS} htmlFor="fullName">
                昵称
              </label>
              <input
                id="fullName"
                type="text"
                value={userDisplay.displayName}
                className={READONLY_INPUT_CLASS}
                readOnly
              />
            </div>
            <div className={FIELD_CLASS}>
              <label className={LABEL_CLASS} htmlFor="email">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={userDisplay.email}
                className={READONLY_INPUT_CLASS}
                readOnly
              />
            </div>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="mb-6 flex items-center gap-3">
            <div className={cn(ICON_CLASS, "bg-indigo-50 text-indigo-600")}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-slate-800">学习偏好</h2>
          </div>

          <div className="space-y-5">
            <div className={FIELD_CLASS}>
              <label className={LABEL_CLASS} htmlFor="dailyMinutes">
                每日学习时长目标（分钟）
              </label>
              <input
                id="dailyMinutes"
                type="number"
                min="1"
                value={draft.dailyMinutes}
                className={READONLY_INPUT_CLASS}
                disabled
                readOnly
              />
            </div>
            <div className={FIELD_CLASS}>
              <label className={LABEL_CLASS} htmlFor="uiLanguage">
                界面语言
              </label>
              <input
                id="uiLanguage"
                type="text"
                value={draft.uiLanguage}
                className={READONLY_INPUT_CLASS}
                disabled
                readOnly
              />
            </div>
            <div className={FIELD_CLASS}>
              <label className={LABEL_CLASS} htmlFor="voiceSpeed">
                发音速度
              </label>
              <select
                id="voiceSpeed"
                value={draft.voiceSpeed}
                className={cn(INPUT_CLASS, "cursor-pointer appearance-none")}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    voiceSpeed: normalizeUserVoiceSpeed(event.target.value),
                  }))
                }
              >
                <option value="0.8x">0.8x</option>
                <option value="1.0x">1.0x（推荐）</option>
                <option value="1.2x">1.2x</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {canAccessAdmin ? (
        <section className="flex flex-col items-center justify-between gap-6 rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-200 sm:p-8 md:flex-row">
          <div className="flex items-center gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-400">
              <ShieldCheck className="size-7" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold">管理员入口</h3>
              <p className="mt-1 text-sm text-slate-400">
                当前账号具备管理员权限，可进行全量数据维护。
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 sm:px-8"
          >
            进入管理后台
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      <div className="flex justify-start pt-4">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-10"
          disabled={!isDirty}
          onClick={() => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(draft));
            }
            setInitialDraft(draft);
            toast.success("设置已保存。");
          }}
        >
          保存所有更改
        </button>
      </div>
    </main>
  );
}
