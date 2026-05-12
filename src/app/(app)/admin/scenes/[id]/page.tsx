import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, GitBranch } from "lucide-react";
import { buildAdminHref, readAdminNotice } from "@/app/(app)/admin/admin-page-state";
import { adminActionButtonClassName } from "@/components/admin/admin-action-button";
import { SceneAdminActions } from "@/components/admin/scene-admin-actions";
import {
  AdminCodeBlock,
  AdminDetailGrid,
  AdminDetailItem,
  AdminDetailSection,
} from "@/components/shared/admin-detail-section";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import {
  AdminList,
  AdminListBadges,
  AdminListContent,
  AdminListIcon,
  AdminListItem,
  AdminListMeta,
  AdminListTitle,
} from "@/components/shared/admin-list-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { getAdminSceneDetail } from "@/lib/server/admin/service";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const LABELS = {
  eyebrow: "\u573a\u666f\u7ba1\u7406",
  warning:
    "\u5220\u9664\u4f1a\u6c38\u4e45\u79fb\u9664\u8be5\u573a\u666f\u53ca\u5173\u8054\u53d8\u4f53\u3002seed \u573a\u666f\u4e5f\u53ef\u5220\u9664\uff0c\u4f46\u4e0b\u6b21\u540c\u6b65\u4f1a\u91cd\u65b0\u5165\u5e93\u3002",
  meta: "\u5143\u4fe1\u606f",
  variants: "\u53d8\u4f53",
  noVariants: "\u6682\u65e0\u53d8\u4f53\u3002",
  viewVariants: "\u67e5\u770b\u5b8c\u6574\u53d8\u4f53\u5217\u8868",
  seed: "\u5185\u7f6e",
  imported: "\u5bfc\u5165",
  public: "\u516c\u5f00",
  private: "\u79c1\u6709",
} as const;

const formatOrigin = (origin: string) =>
  origin === "seed" ? LABELS.seed : origin === "imported" ? LABELS.imported : origin;

export default async function AdminSceneDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const detail = await getAdminSceneDetail(id);
  if (!detail) notFound();
  const notice = readAdminNotice(search);
  const returnTo =
    typeof search.returnTo === "string" && search.returnTo.startsWith("/admin")
      ? search.returnTo
      : "/admin/scenes";

  const { scene, variants, diagnostics } = detail;
  const sceneJsonPretty = JSON.stringify(scene.scene_json, null, 2);
  const latestCacheKey = variants[0]?.cache_key ?? null;
  const latestVariants = latestCacheKey
    ? variants.filter((row) => row.cache_key === latestCacheKey)
    : variants;
  const adminLinkButtonClassName = adminActionButtonClassName("secondary", "px-2 py-1 text-xs text-muted-foreground");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={scene.title}
        description={`ID: ${scene.id}`}
        actions={<SceneAdminActions sceneId={scene.id} isPublic={scene.is_public} returnTo={buildAdminHref(`/admin/scenes/${scene.id}`, { returnTo })} />}
      />

      <div className="flex items-center justify-between gap-3">
        <Link href={returnTo} className={adminLinkButtonClassName}>
          返回列表
        </Link>
        {notice ? <AdminNoticeCard tone={notice.tone} className="flex-1">{notice.notice}</AdminNoticeCard> : null}
      </div>

      <AdminNoticeCard>{LABELS.warning}</AdminNoticeCard>

      <AdminDetailSection title={LABELS.meta}>
        <AdminDetailGrid>
          <AdminDetailItem label="场景 ID：" value={<span className="font-mono text-xs">{scene.id}</span>} />
          <AdminDetailItem label="Slug：" value={scene.slug} />
          <AdminDetailItem label="来源：" value={<Badge variant="outline">{formatOrigin(scene.origin)}</Badge>} />
          <AdminDetailItem label="可见性：" value={scene.is_public ? LABELS.public : LABELS.private} />
          <AdminDetailItem
            label="创建者："
            value={<span className="font-mono text-xs">{scene.created_by ?? "-"}</span>}
          />
          <AdminDetailItem label="模型：" value={scene.model ?? "-"} />
          <AdminDetailItem label="提示词版本：" value={scene.prompt_version ?? "-"} />
          <AdminDetailItem label="变体数量：" value={diagnostics.variantsCount} />
          <AdminDetailItem
            label="关联变体缓存数："
            value={diagnostics.relatedVariantCacheCount}
          />
          <AdminDetailItem label="原文长度：" value={diagnostics.sourceTextLength} />
          <AdminDetailItem label="开始学习用户：" value={diagnostics.progressStartedCount} />
          <AdminDetailItem
            label="完成学习用户："
            value={diagnostics.progressCompletedCount}
          />
          <AdminDetailItem
            label="平均进度："
            value={Math.round(diagnostics.avgProgressPercent)}
          />
          <AdminDetailItem
            label="最近学习活动："
            value={formatAdminDateTime(diagnostics.progressLastViewedAt)}
          />
          <AdminDetailItem className="sm:col-span-2" label="创建时间：" value={formatAdminDateTime(scene.created_at)} />
          <AdminDetailItem className="sm:col-span-2" label="更新时间：" value={formatAdminDateTime(scene.updated_at)} />
        </AdminDetailGrid>
      </AdminDetailSection>

      <AdminDetailSection title="原始文本">
        <AdminCodeBlock>{scene.source_text ?? "-"}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title="中文翻译">
        <AdminCodeBlock className="max-h-40">{scene.translation ?? "-"}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title="场景 JSON">
        <AdminCodeBlock className="max-h-[36rem] whitespace-pre">{sceneJsonPretty}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title={LABELS.variants} contentClassName="space-y-2">
        {latestVariants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{LABELS.noVariants}</p>
        ) : (
          <AdminList>
            {latestVariants.map((variant) => (
              <AdminListItem key={variant.id}>
                <AdminListIcon>
                  <GitBranch className="size-5" />
                </AdminListIcon>
                <AdminListContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminListTitle>第 {variant.variant_index} 个变体</AdminListTitle>
                    <AdminListBadges>
                      <Badge variant="outline">模型：{variant.model ?? "-"}</Badge>
                    </AdminListBadges>
                  </div>
                  <AdminListMeta>
                    <span>提示词版本：{variant.prompt_version ?? "-"}</span>
                    <span className="font-mono">缓存键：{variant.cache_key ?? "-"}</span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      创建时间：{formatAdminDateTime(variant.created_at)}
                    </span>
                  </AdminListMeta>
                </AdminListContent>
              </AdminListItem>
            ))}
          </AdminList>
        )}
        <Link href="/admin/variants" className={adminLinkButtonClassName}>
          {LABELS.viewVariants}
        </Link>
      </AdminDetailSection>
    </div>
  );
}
