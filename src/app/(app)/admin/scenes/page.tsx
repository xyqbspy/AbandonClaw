import Link from "next/link";
import { CalendarClock, FileText, Filter, Layers3, Search, Trash2 } from "lucide-react";
import { deleteSceneAction } from "@/app/(app)/admin/actions";
import {
  buildAdminHref,
  readAdminNotice,
  readAdminPositivePage,
  readAdminStringParam,
} from "@/app/(app)/admin/admin-page-state";
import { SceneSentenceEditorSheet } from "@/components/admin/scene-sentence-editor-sheet";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import {
  AdminEmptyState,
  AdminList,
  AdminListActions,
  AdminListBadges,
  AdminListContent,
  AdminListIcon,
  AdminListItem,
  AdminListMeta,
  AdminListTitle,
  AdminPagination,
} from "@/components/shared/admin-list-shell";
import { AdminConfirmActionButton } from "@/components/admin/admin-action-button";
import { FilterBar, FilterBarForm, FilterBarMeta } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminScenes } from "@/lib/server/admin/service";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { ParsedScene } from "@/lib/types/scene-parser";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

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
  seed: "\u5185\u7f6e",
  imported: "\u5bfc\u5165",
  dialogue: "\u5bf9\u8bdd",
  monologue: "\u72ec\u767d",
  submit: "\u7b5b\u9009",
  total: "\u603b\u6570",
  currentPage: "\u5f53\u524d\u9875",
  guidance:
    "\u5efa\u8bae\uff1a\u4f18\u5148\u7528\u201c\u7f16\u8f91\u53e5\u5b50\u201d\u505a\u5fae\u8c03\uff0c\u4fdd\u5b58\u540e\u4f1a\u81ea\u52a8\u6e05\u7406\u8be5\u573a\u666f\u7684\u97f3\u9891\u7f13\u5b58",
  invalidSceneJson: "\u573a\u666f JSON \u7ed3\u6784\u5f02\u5e38",
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

const formatOrigin = (origin: string) =>
  origin === "seed" ? LABELS.seed : origin === "imported" ? LABELS.imported : origin;

const formatSceneType = (sceneType: string | null) =>
  sceneType === "dialogue" ? LABELS.dialogue : sceneType === "monologue" ? LABELS.monologue : sceneType;

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
      <PageHeader variant="admin" eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <FilterBar className="space-y-3">
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={LABELS.search} className={`${APPLE_ADMIN_CONTROL} pl-9`} />
          </div>
          <select name="origin" defaultValue={originRaw} className={APPLE_ADMIN_SELECT}>
            <option value="">{LABELS.allOrigin}</option>
            <option value="seed">{LABELS.seed}</option>
            <option value="imported">{LABELS.imported}</option>
          </select>
          <select name="isPublic" defaultValue={isPublicRaw} className={APPLE_ADMIN_SELECT}>
            <option value="">{LABELS.allVisibility}</option>
            <option value="true">{LABELS.public}</option>
            <option value="false">{LABELS.private}</option>
          </select>
          <Button type="submit" variant="default" size="lg" className="h-[46px] gap-2 rounded-[12px] px-6 text-sm font-bold">
            <Filter className="size-4" />
            {LABELS.submit}
          </Button>
        </FilterBarForm>

        <FilterBarMeta>
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {LABELS.total} {result.total}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {LABELS.currentPage} {result.rows.length} 条
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1">{LABELS.guidance}</span>
        </FilterBarMeta>
      </FilterBar>

      {rows.length > 0 ? (
        <AdminList>
          {rows.map(({ row, sceneType, sectionCount, sentenceCount, editorSections }) => (
            <AdminListItem key={row.id}>
              <AdminListIcon>
                <Layers3 className="size-5" />
              </AdminListIcon>
              <AdminListContent>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminListTitle>
                    <Link
                      href={buildAdminHref(`/admin/scenes/${row.id}`, { returnTo: currentHref })}
                      className={`${APPLE_TITLE_SM} underline-offset-2 hover:underline`}
                    >
                      {row.title}
                    </Link>
                  </AdminListTitle>
                  <AdminListBadges>
                  <Badge variant="outline">{formatOrigin(row.origin)}</Badge>
                  <Badge variant="secondary">{row.is_public ? LABELS.public : LABELS.private}</Badge>
                  </AdminListBadges>
                </div>
                <p className={`font-mono text-xs ${APPLE_META_TEXT}`}>{row.slug}</p>
                <AdminListMeta>
                  {editorSections ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        {sectionCount} 个段落 / {sentenceCount} 句
                      </span>
                      <span>{formatSceneType(sceneType)}</span>
                    </>
                  ) : (
                    <span className="text-destructive">{LABELS.invalidSceneJson}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    {LABELS.updated}: {formatAdminDateTime(row.updated_at)}
                  </span>
                  <span className="font-mono">创建者：{row.created_by ?? "-"}</span>
                </AdminListMeta>
              </AdminListContent>
              <AdminListActions>
                {editorSections ? (
                  <SceneSentenceEditorSheet
                    sceneId={row.id}
                    slug={row.slug}
                    title={row.title}
                    origin={row.origin}
                    sections={editorSections}
                  />
                ) : (
                  <span className="text-xs text-slate-400">{LABELS.notEditable}</span>
                )}
                <form action={deleteSceneAction}>
                  <input type="hidden" name="sceneId" value={row.id} />
                  <input type="hidden" name="returnTo" value={currentHref} />
                  <AdminConfirmActionButton
                    type="submit"
                    tone="danger"
                    confirmText={`${LABELS.deleteConfirm}${row.title}${LABELS.deleteConfirmTail}`}
                    finalConfirmText={LABELS.deleteFinal}
                    aria-label={LABELS.delete}
                  >
                    <Trash2 className="size-3.5" />
                    {LABELS.delete}
                  </AdminConfirmActionButton>
                </form>
              </AdminListActions>
            </AdminListItem>
          ))}
        </AdminList>
      ) : (
        <AdminEmptyState>{LABELS.empty}</AdminEmptyState>
      )}

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
