import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAdminHref, readAdminNotice } from "@/app/(app)/admin/admin-page-state";
import { SceneAdminActions } from "@/components/admin/scene-admin-actions";
import {
  AdminCodeBlock,
  AdminDetailGrid,
  AdminDetailItem,
  AdminDetailSection,
} from "@/components/shared/admin-detail-section";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { AdminTableShell } from "@/components/shared/admin-list-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { getAdminSceneDetail } from "@/lib/server/admin/service";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM } from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u573a\u666f\u7ba1\u7406",
  warning:
    "\u5220\u9664\u4f1a\u6c38\u4e45\u79fb\u9664\u8be5\u573a\u666f\u53ca\u5173\u8054\u53d8\u4f53\u3002seed \u573a\u666f\u4e5f\u53ef\u5220\u9664\uff0c\u4f46\u4e0b\u6b21\u540c\u6b65\u4f1a\u91cd\u65b0\u5165\u5e93\u3002",
  meta: "\u5143\u4fe1\u606f",
  variants: "\u53d8\u4f53",
  noVariants: "\u6682\u65e0\u53d8\u4f53\u3002",
  viewVariants: "\u67e5\u770b\u5b8c\u6574\u53d8\u4f53\u5217\u8868",
} as const;

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
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={scene.title}
        description={`ID: ${scene.id}`}
        actions={<SceneAdminActions sceneId={scene.id} isPublic={scene.is_public} returnTo={buildAdminHref(`/admin/scenes/${scene.id}`, { returnTo })} />}
      />

      <div className="flex items-center justify-between gap-3">
        <Link href={returnTo} className={`${appleButtonClassName} px-2 py-1 text-xs text-muted-foreground`}>
          返回列表
        </Link>
        {notice ? <AdminNoticeCard tone={notice.tone} className="flex-1">{notice.notice}</AdminNoticeCard> : null}
      </div>

      <AdminNoticeCard>{LABELS.warning}</AdminNoticeCard>

      <AdminDetailSection title={LABELS.meta}>
        <AdminDetailGrid>
          <AdminDetailItem label="id:" value={<span className="font-mono text-xs">{scene.id}</span>} />
          <AdminDetailItem label="slug:" value={scene.slug} />
          <AdminDetailItem label="origin:" value={<Badge variant="outline">{scene.origin}</Badge>} />
          <AdminDetailItem label="is_public:" value={scene.is_public ? "true" : "false"} />
          <AdminDetailItem
            label="created_by:"
            value={<span className="font-mono text-xs">{scene.created_by ?? "-"}</span>}
          />
          <AdminDetailItem label="model:" value={scene.model ?? "-"} />
          <AdminDetailItem label="prompt_version:" value={scene.prompt_version ?? "-"} />
          <AdminDetailItem label="variants_count:" value={diagnostics.variantsCount} />
          <AdminDetailItem
            label="related_variant_cache_count:"
            value={diagnostics.relatedVariantCacheCount}
          />
          <AdminDetailItem label="source_text_length:" value={diagnostics.sourceTextLength} />
          <AdminDetailItem label="progress_started_users:" value={diagnostics.progressStartedCount} />
          <AdminDetailItem
            label="progress_completed_users:"
            value={diagnostics.progressCompletedCount}
          />
          <AdminDetailItem
            label="avg_progress_percent:"
            value={Math.round(diagnostics.avgProgressPercent)}
          />
          <AdminDetailItem
            label="latest_learning_activity:"
            value={diagnostics.progressLastViewedAt ?? "-"}
          />
          <AdminDetailItem className="sm:col-span-2" label="created_at:" value={scene.created_at} />
          <AdminDetailItem className="sm:col-span-2" label="updated_at:" value={scene.updated_at} />
        </AdminDetailGrid>
      </AdminDetailSection>

      <AdminDetailSection title="source_text">
        <AdminCodeBlock>{scene.source_text ?? "-"}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title="translation">
        <AdminCodeBlock className="max-h-40">{scene.translation ?? "-"}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title="scene_json">
        <AdminCodeBlock className="max-h-[36rem] whitespace-pre">{sceneJsonPretty}</AdminCodeBlock>
      </AdminDetailSection>

      <AdminDetailSection title={LABELS.variants} contentClassName="space-y-2">
        {latestVariants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{LABELS.noVariants}</p>
        ) : (
          <AdminTableShell className="rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">variant_index</th>
                  <th className="px-3 py-2">model</th>
                  <th className="px-3 py-2">prompt_version</th>
                  <th className="px-3 py-2">cache_key</th>
                  <th className="px-3 py-2">created_at</th>
                </tr>
              </thead>
              <tbody>
                {latestVariants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-3 py-2">{variant.variant_index}</td>
                    <td className="px-3 py-2">{variant.model ?? "-"}</td>
                    <td className="px-3 py-2">{variant.prompt_version ?? "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{variant.cache_key ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{variant.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        )}
        <Link href="/admin/variants" className={`${appleButtonClassName} px-2 py-1 text-xs text-muted-foreground`}>
          {LABELS.viewVariants}
        </Link>
      </AdminDetailSection>
    </div>
  );
}
