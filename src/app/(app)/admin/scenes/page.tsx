import Link from "next/link";
import { deleteSceneAction } from "@/app/(app)/admin/actions";
import {
  buildAdminHref,
  readAdminNotice,
  readAdminPositivePage,
  readAdminStringParam,
} from "@/app/(app)/admin/admin-page-state";
import { SceneSentenceEditorSheet } from "@/components/admin/scene-sentence-editor-sheet";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { AdminPagination, AdminTableShell } from "@/components/shared/admin-list-shell";
import { ConfirmButton } from "@/components/shared/confirm-action";
import { FilterBar, FilterBarForm, FilterBarMeta } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { ParsedScene } from "@/lib/types/scene-parser";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_DANGER, APPLE_BUTTON_TEXT_SM, APPLE_INPUT_BASE } from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u573a\u666f\u5217\u8868",
  description:
    "\u652f\u6301\u6309\u6807\u9898\u641c\u7d22\uff0c\u5e76\u53ef\u76f4\u63a5\u5728\u5217\u8868\u91cc\u7f16\u8f91\u53e5\u5b50\u5185\u5bb9\u3002",
  search: "\u641c\u7d22\u6807\u9898\u6216 slug",
  allOrigin: "\u5168\u90e8\u6765\u6e90",
  allVisibility: "\u5168\u90e8\u53ef\u89c1\u6027",
  public: "\u516c\u5f00",
  private: "\u79c1\u6709",
  submit: "\u7b5b\u9009",
  total: "\u603b\u6570",
  currentPage: "\u5f53\u524d\u9875",
  guidance:
    "\u5efa\u8bae\uff1a\u4f18\u5148\u7528\u201c\u7f16\u8f91\u53e5\u5b50\u201d\u505a\u5fae\u8c03\uff0c\u4fdd\u5b58\u540e\u4f1a\u81ea\u52a8\u6e05\u7406\u8be5\u573a\u666f\u7684\u97f3\u9891\u7f13\u5b58",
  invalidSceneJson: "scene_json \u7ed3\u6784\u5f02\u5e38",
  updated: "\u66f4\u65b0",
  created: "\u521b\u5efa",
  notEditable: "\u4e0d\u53ef\u7f16\u8f91",
  delete: "\u5220\u9664",
  deleteConfirm: "\u786e\u8ba4\u5220\u9664\u573a\u666f ",
  deleteConfirmTail: " \u5417\uff1f",
  deleteFinal:
    "\u5220\u9664\u540e\u4f1a\u540c\u65f6\u79fb\u9664\u5173\u8054\u53d8\u4f53\u548c\u573a\u666f\u97f3\u9891\uff0c\u662f\u5426\u7ee7\u7eed\uff1f",
  empty: "\u672a\u627e\u5230\u573a\u666f\u3002",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

export default async function AdminScenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const originRaw = readAdminStringParam(params, "origin");
  const isPublicRaw = readAdminStringParam(params, "isPublic");
  const origin = originRaw === "seed" || originRaw === "imported" ? originRaw : undefined;
  const isPublic = isPublicRaw === "true" ? true : isPublicRaw === "false" ? false : undefined;
  const page = readAdminPositivePage(params);
  const notice = readAdminNotice(params);
  const pageSize = 20;
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  const result = await listAdminScenes({
    search: q,
    origin,
    isPublic,
    page,
    pageSize,
  });

  const currentHref = buildAdminHref("/admin/scenes", {
    q,
    origin: originRaw,
    isPublic: isPublicRaw,
    page,
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

  const buildListUrl = (nextPage: number) =>
    buildAdminHref("/admin/scenes", {
      q,
      origin: originRaw,
      isPublic: isPublicRaw,
      page: nextPage,
    });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <FilterBar className="space-y-3">
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto_auto]">
          <Input name="q" defaultValue={q} placeholder={LABELS.search} />
          <select name="origin" defaultValue={originRaw} className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}>
            <option value="">{LABELS.allOrigin}</option>
            <option value="seed">seed</option>
            <option value="imported">imported</option>
          </select>
          <select name="isPublic" defaultValue={isPublicRaw} className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}>
            <option value="">{LABELS.allVisibility}</option>
            <option value="true">{LABELS.public}</option>
            <option value="false">{LABELS.private}</option>
          </select>
          <Button type="submit" variant="ghost" className={appleButtonClassName}>
            {LABELS.submit}
          </Button>
        </FilterBarForm>

        <FilterBarMeta>
          <span className="rounded-full bg-muted px-2 py-1">
            {LABELS.total} {result.total}
          </span>
          <span className="rounded-full bg-muted px-2 py-1">
            {LABELS.currentPage} {result.rows.length} 条
          </span>
          <span className="rounded-full bg-muted px-2 py-1">{LABELS.guidance}</span>
        </FilterBarMeta>
      </FilterBar>

      <AdminTableShell>
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
                      href={buildAdminHref(`/admin/scenes/${row.id}`, { returnTo: currentHref })}
                      className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.slug}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">owner: {row.created_by ?? "-"}</p>
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
                    <p className="text-xs text-destructive">{LABELS.invalidSceneJson}</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge variant="outline">{row.origin}</Badge>
                </td>
                <td className="px-3 py-3">{row.is_public ? LABELS.public : LABELS.private}</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  <div>
                    {LABELS.updated}: {row.updated_at}
                  </div>
                  <div>
                    {LABELS.created}: {row.created_at}
                  </div>
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
                      <span className="text-xs text-muted-foreground">{LABELS.notEditable}</span>
                    )}
                    <form action={deleteSceneAction}>
                      <input type="hidden" name="sceneId" value={row.id} />
                      <input type="hidden" name="returnTo" value={currentHref} />
                      <ConfirmButton
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`}
                        confirmText={`${LABELS.deleteConfirm}${row.title}${LABELS.deleteConfirmTail}`}
                        finalConfirmText={LABELS.deleteFinal}
                      >
                        {LABELS.delete}
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  {LABELS.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>

      <AdminPagination
        summary={
          <>
            {LABELS.summaryPrefix} {(result.page - 1) * result.pageSize + 1}-
            {Math.min(result.page * result.pageSize, result.total)} {LABELS.summaryMiddle}
            {result.total}
          </>
        }
        prevHref={result.page > 1 ? buildListUrl(result.page - 1) : null}
        nextHref={result.page * result.pageSize < result.total ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
