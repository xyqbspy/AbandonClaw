import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
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
              <Input id="fullName" defaultValue="Yilin" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" defaultValue="yilin@example.com" />
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
              <Input id="dailyMinutes" defaultValue="20" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="uiLanguage">界面语言</Label>
              <Input id="uiLanguage" defaultValue="简体中文" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="voiceSpeed">发音速度</Label>
              <Input id="voiceSpeed" defaultValue="1.0x" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Button>保存设置</Button>
    </div>
  );
}
