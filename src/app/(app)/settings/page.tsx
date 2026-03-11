"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsDraft = {
  fullName: string;
  email: string;
  dailyMinutes: string;
  uiLanguage: string;
  voiceSpeed: string;
};

const SETTINGS_STORAGE_KEY = "app-settings-draft";

const loadDraft = (): SettingsDraft => {
  if (typeof window === "undefined") {
    return {
      fullName: "Yilin",
      email: "yilin@example.com",
      dailyMinutes: "20",
      uiLanguage: "简体中文",
      voiceSpeed: "1.0x",
    };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<SettingsDraft>;
    return {
      fullName: parsed.fullName ?? "Yilin",
      email: parsed.email ?? "yilin@example.com",
      dailyMinutes: parsed.dailyMinutes ?? "20",
      uiLanguage: parsed.uiLanguage ?? "简体中文",
      voiceSpeed: parsed.voiceSpeed ?? "1.0x",
    };
  } catch {
    return {
      fullName: "Yilin",
      email: "yilin@example.com",
      dailyMinutes: "20",
      uiLanguage: "简体中文",
      voiceSpeed: "1.0x",
    };
  }
};

export default function SettingsPage() {
  const initialDraftRef = useRef<SettingsDraft | null>(null);
  if (!initialDraftRef.current) {
    initialDraftRef.current = loadDraft();
  }
  const [draft, setDraft] = useState<SettingsDraft>(() => initialDraftRef.current ?? loadDraft());

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
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName">昵称</Label>
              <Input
                id="fullName"
                value={draft.fullName}
                onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                value={draft.email}
                onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>学习偏好</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dailyMinutes">每日学习时长目标</Label>
              <Input
                id="dailyMinutes"
                value={draft.dailyMinutes}
                onChange={(e) => setDraft((prev) => ({ ...prev, dailyMinutes: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="uiLanguage">界面语言</Label>
              <Input
                id="uiLanguage"
                value={draft.uiLanguage}
                onChange={(e) => setDraft((prev) => ({ ...prev, uiLanguage: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="voiceSpeed">发音速度</Label>
              <Input
                id="voiceSpeed"
                value={draft.voiceSpeed}
                onChange={(e) => setDraft((prev) => ({ ...prev, voiceSpeed: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Button
        className="cursor-pointer"
        disabled={!isDirty}
        onClick={() => {
          initialDraftRef.current = draft;
          toast.success("设置已保存（本地草稿）");
        }}
      >
        保存设置
      </Button>
    </div>
  );
}
