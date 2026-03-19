import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneAdminActions } from "@/components/admin/scene-admin-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSceneDetail } from "@/lib/server/admin/service";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_SURFACE } from "@/lib/ui/apple-style";

export default async function AdminSceneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminSceneDetail(id);
  if (!detail) notFound();

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
        eyebrow="场景管理"
        title={scene.title}
        description={`ID: ${scene.id}`}
        actions={<SceneAdminActions sceneId={scene.id} isPublic={scene.is_public} />}
      />

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-4 text-sm text-destructive">
          删除会永久移除该场景及关联变体。seed 场景也可删除，但下次同步会重新入库。
        </CardContent>
      </Card>

      <Card className={APPLE_SURFACE}>
        <CardHeader>
          <CardTitle>元信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">id:</span> <span className="font-mono text-xs">{scene.id}</span></p>
          <p><span className="text-muted-foreground">slug:</span> {scene.slug}</p>
          <p><span className="text-muted-foreground">origin:</span> <Badge variant="outline">{scene.origin}</Badge></p>
          <p><span className="text-muted-foreground">is_public:</span> {scene.is_public ? "true" : "false"}</p>
          <p><span className="text-muted-foreground">created_by:</span> <span className="font-mono text-xs">{scene.created_by ?? "-"}</span></p>
          <p><span className="text-muted-foreground">model:</span> {scene.model ?? "-"}</p>
          <p><span className="text-muted-foreground">prompt_version:</span> {scene.prompt_version ?? "-"}</p>
          <p><span className="text-muted-foreground">variants_count:</span> {diagnostics.variantsCount}</p>
          <p><span className="text-muted-foreground">related_variant_cache_count:</span> {diagnostics.relatedVariantCacheCount}</p>
          <p><span className="text-muted-foreground">source_text_length:</span> {diagnostics.sourceTextLength}</p>
          <p><span className="text-muted-foreground">progress_started_users:</span> {diagnostics.progressStartedCount}</p>
          <p><span className="text-muted-foreground">progress_completed_users:</span> {diagnostics.progressCompletedCount}</p>
          <p><span className="text-muted-foreground">avg_progress_percent:</span> {Math.round(diagnostics.avgProgressPercent)}</p>
          <p><span className="text-muted-foreground">latest_learning_activity:</span> {diagnostics.progressLastViewedAt ?? "-"}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">created_at:</span> {scene.created_at}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">updated_at:</span> {scene.updated_at}</p>
        </CardContent>
      </Card>

      <Card className={APPLE_SURFACE}>
        <CardHeader><CardTitle>source_text</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[rgb(240,240,240)] p-3 text-xs">
            {scene.source_text ?? "-"}
          </pre>
        </CardContent>
      </Card>

      <Card className={APPLE_SURFACE}>
        <CardHeader><CardTitle>translation</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-[rgb(240,240,240)] p-3 text-xs">
            {scene.translation ?? "-"}
          </pre>
        </CardContent>
      </Card>

      <Card className={APPLE_SURFACE}>
        <CardHeader><CardTitle>scene_json</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-[36rem] overflow-auto rounded bg-[rgb(240,240,240)] p-3 text-xs">
            {sceneJsonPretty}
          </pre>
        </CardContent>
      </Card>

      <Card className={APPLE_SURFACE}>
        <CardHeader><CardTitle>变体</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {latestVariants.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无变体。</p>
          ) : (
            <div className={`overflow-x-auto rounded ${APPLE_SURFACE}`}>
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
            </div>
          )}
          <Link href="/admin/variants" className={`${appleButtonClassName} px-2 py-1 text-xs text-muted-foreground`}>
            查看完整变体列表
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
