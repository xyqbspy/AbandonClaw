"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_SURFACE } from "@/lib/ui/apple-style";

type SettingsDraft = {
  fullName: string;
  email: string;
  dailyMinutes: string;
  uiLanguage: string;
  voiceSpeed: string;
};

const SETTINGS_STORAGE_KEY = "app-settings-draft";

const loadDraft = (): SettingsDraft => {
  const fallback = {
    fullName: "Yilin",
    email: "yilin@example.com",
    dailyMinutes: "20",
    uiLanguage: "简体中文",
    voiceSpeed: "1.0x",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<SettingsDraft>;
    return {
      fullName: parsed.fullName ?? fallback.fullName,
      email: parsed.email ?? fallback.email,
      dailyMinutes: parsed.dailyMinutes ?? fallback.dailyMinutes,
      uiLanguage: parsed.uiLanguage ?? fallback.uiLanguage,
      voiceSpeed: parsed.voiceSpeed ?? fallback.voiceSpeed,
    };
  } catch {
    return fallback;
  }
};

export function SettingsPageClient({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const initialDraftRef = useRef<SettingsDraft | null>(null);
  if (!initialDraftRef.current) {
    initialDraftRef.current = loadDraft();
  }

  const [draft, setDraft] = useState<SettingsDraft>(() => initialDraftRef.current ?? loadDraft());
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const isDirty = useMemo(() => {
    return JSON.stringify(initialDraftRef.current) !== JSON.stringify(draft);
  }, [draft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="设置"
        title="账号与学习偏好"
        description="管理个人信息、学习节奏和发音相关设置。"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={APPLE_SURFACE}>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName">昵称</Label>
              <Input
                id="fullName"
                value={draft.fullName}
                onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={APPLE_SURFACE}>
          <CardHeader>
            <CardTitle>学习偏好</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dailyMinutes">每日学习时长目标</Label>
              <Input
                id="dailyMinutes"
                value={draft.dailyMinutes}
                onChange={(event) => setDraft((prev) => ({ ...prev, dailyMinutes: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="uiLanguage">界面语言</Label>
              <Input
                id="uiLanguage"
                value={draft.uiLanguage}
                onChange={(event) => setDraft((prev) => ({ ...prev, uiLanguage: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="voiceSpeed">发音速度</Label>
              <Input
                id="voiceSpeed"
                value={draft.voiceSpeed}
                onChange={(event) => setDraft((prev) => ({ ...prev, voiceSpeed: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {canAccessAdmin ? (
        <Card className={APPLE_SURFACE}>
          <CardHeader>
            <CardTitle>管理员入口</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>当前账号具备管理员权限，可以进入后台查看内容数据、AI 缓存和 TTS 本地缓存。</p>
            <Link href="/admin" className={`${appleButtonClassName} px-3 py-1.5 text-foreground`}>
              进入 Admin
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Button
        className="cursor-pointer"
        disabled={!isDirty}
        onClick={() => {
          initialDraftRef.current = draft;
          toast.success("设置已保存到本地草稿。");
        }}
      >
        保存设置
      </Button>
    </div>
  );
}
