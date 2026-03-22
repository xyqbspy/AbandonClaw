import { TtsBrowserCachePanel } from "@/components/admin/tts-browser-cache-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminTtsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="管理后台"
        title="TTS 缓存"
        description="查看当前浏览器里的本地 TTS 音频缓存，并支持按需清理。"
      />
      <TtsBrowserCachePanel />
    </div>
  );
}
