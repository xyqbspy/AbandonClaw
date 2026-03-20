import Link from "next/link";
import { deleteSceneAction } from "@/app/(app)/admin/actions";
import { SceneSentenceEditorSheet } from "@/components/admin/scene-sentence-editor-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { ParsedScene } from "@/lib/types/scene-parser";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_SM,
  APPLE_INPUT_BASE,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export default async function AdminScenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const originRaw = typeof params.origin === "string" ? params.origin : "";
  const isPublicRaw = typeof params.isPublic === "string" ? params.isPublic : "";
  const origin =
    originRaw === "seed" || originRaw === "imported" ? originRaw : undefined;
  const isPublic =
    isPublicRaw === "true" ? true : isPublicRaw === "false" ? false : undefined;
  const page = parsePositiveInt(
    typeof params.page === "string" ? params.page : undefined,
    1,
  );
  const pageSize = 20;
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminScenes({
    search: q,
    origin,
    isPublic,
    page,
    pageSize,
  });

  const rows = result.rows.map((row) => {
    try {
      const scene = normalizeParsedSceneDialogue(row.scene_json as ParsedScene);
      return {
        row,
        sceneType: scene.type,
        sectionCount: scene.sections.length,
        sentenceCount: scene.sections.reduce(
          (total, section) =>
            total + section.blocks.reduce((sum, block) => sum + block.sentences.length, 0),
          0,
        ),
        editorSections: scene.sections.map((section) => ({
          sectionId: section.id,
          title: section.title,
          blocks: section.blocks.map((block) => ({
            blockId: block.id,
            type: block.type,
            speaker: block.speaker,
            sentences: block.sentences.map((sentence) => ({
              sentenceId: sentence.id,
              speaker: block.speaker,
              text: sentence.text,
              translation: sentence.translation ?? "",
              tts: sentence.tts ?? sentence.text,
              chunks: sentence.chunks.map((chunk) => chunk.text),
            })),
          })),
        })),
      };
    } catch {
      return {
        row,
        sceneType: null,
        sectionCount: 0,
        sentenceCount: 0,
        editorSections: null,
      };
    }
  });

  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;

  const buildListUrl = (nextPage: number) =>
    `/admin/scenes?q=${encodeURIComponent(q)}&origin=${originRaw}&isPublic=${isPublicRaw}&page=${nextPage}`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="管理后台"
        title="场景列表"
        description="支持按标题检索，并直接在列表里编辑句子内容。"
      />

      <Card className={APPLE_SURFACE}>
        <CardContent className="space-y-3 pt-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input name="q" defaultValue={q} placeholder="搜索标题或 slug" />
            <select
              name="origin"
              defaultValue={originRaw}
              className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
            >
              <option value="">全部来源</option>
              <option value="seed">seed</option>
              <option value="imported">imported</option>
            </select>
            <select
              name="isPublic"
              defaultValue={isPublicRaw}
              className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
            >
              <option value="">全部可见性</option>
              <option value="true">公开</option>
              <option value="false">私有</option>
            </select>
            <Button type="submit" variant="ghost" className={appleButtonClassName}>
              筛选
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">总数 {result.total}</span>
            <span className="rounded-full bg-muted px-2 py-1">
              当前页 {result.rows.length} 条
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              重点建议：直接用“编辑句子”做微调，保存后会自动清理该场景音频缓存
            </span>
          </div>
        </CardContent>
      </Card>

      <div className={`overflow-x-auto rounded-lg ${APPLE_SURFACE}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">场景</th>
              <th className="px-3 py-2">结构</th>
              <th className="px-3 py-2">来源</th>
              <th className="px-3 py-2">可见性</th>
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, sceneType, sectionCount, sentenceCount, editorSections }) => (
              <tr key={row.id} className="align-top border-t border-border/40">
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <Link
                      href={`/admin/scenes/${row.id}`}
                      className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.slug}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      owner: {row.created_by ?? "-"}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {editorSections ? (
                    <div className="space-y-1 text-xs">
                      <p>{sceneType}</p>
                      <p className="text-muted-foreground">
                        {sectionCount} sections / {sentenceCount} sentences
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-destructive">scene_json 结构异常</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge variant="outline">{row.origin}</Badge>
                </td>
                <td className="px-3 py-3">{row.is_public ? "公开" : "私有"}</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  <div>更新: {row.updated_at}</div>
                  <div>创建: {row.created_at}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {editorSections ? (
                      <SceneSentenceEditorSheet
                        sceneId={row.id}
                        slug={row.slug}
                        title={row.title}
                        origin={row.origin}
                        sections={editorSections}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">不可编辑</span>
                    )}
                    <form action={deleteSceneAction}>
                      <input type="hidden" name="sceneId" value={row.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`}
                      >
                        删除
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  未找到场景。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          显示 {(result.page - 1) * result.pageSize + 1}-
          {Math.min(result.page * result.pageSize, result.total)} / 共 {result.total}
        </p>
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link href={buildListUrl(result.page - 1)} className={`${appleButtonClassName} px-2 py-1`}>
              上一页
            </Link>
          ) : (
            <span className={`${appleButtonClassName} px-2 py-1 opacity-40`}>上一页</span>
          )}
          {hasNext ? (
            <Link href={buildListUrl(result.page + 1)} className={`${appleButtonClassName} px-2 py-1`}>
              下一页
            </Link>
          ) : (
            <span className={`${appleButtonClassName} px-2 py-1 opacity-40`}>下一页</span>
          )}
        </div>
      </div>
    </div>
  );
}
