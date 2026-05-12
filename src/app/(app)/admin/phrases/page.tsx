import { deleteAdminPhraseAction, enrichAdminPhraseAction, enrichAdminPhrasesBatchAction } from "@/app/(app)/admin/actions";
import { BookOpen, FileText, Filter, Search, Trash2, Wand2 } from "lucide-react";
import {
  buildAdminHref,
  readAdminNotice,
  readAdminPositivePage,
  readAdminStringParam,
} from "@/app/(app)/admin/admin-page-state";
import {
  AdminActionBar,
  AdminActionBarActions,
  AdminActionBarHint,
} from "@/components/shared/admin-action-bar";
import { AdminConfirmActionButton, AdminSubmitButton } from "@/components/admin/admin-action-button";
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
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminPhrases } from "@/lib/server/admin/service";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
} from "@/lib/ui/apple-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u8868\u8fbe\u5e93\u7ba1\u7406",
  description:
    "\u652f\u6301\u6309\u8868\u8fbe / \u53e5\u5b50\u7b5b\u9009\uff0c\u5217\u8868\u533a\u5206\u7c7b\u578b\u5e76\u53ef\u76f4\u63a5\u5220\u9664\u3002",
  search: "\u641c\u7d22\u8868\u8fbe / \u53e5\u5b50 / \u7ffb\u8bd1",
  allTypes: "\u5168\u90e8\u7c7b\u578b",
  chunk: "\u8868\u8fbe",
  sentence: "\u53e5\u5b50",
  submit: "\u7b5b\u9009",
  batchHint: "\u52fe\u9009\u540e\u53ef\u6279\u91cf\u8865\u5168\u9009\u4e2d\u7684\u8868\u8fbe\u3002",
  batchAction: "\u6279\u91cf\u8865\u5168\u9009\u4e2d\u9879",
  example: "\u4f8b\u53e5\uff1a",
  delete: "\u5220\u9664",
  deleteConfirmSentence: "\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u53e5\u5b50\u5417\uff1f",
  deleteConfirmChunk: "\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u8868\u8fbe\u5417\uff1f",
  deleteFinal: "\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\uff0c\u662f\u5426\u7ee7\u7eed\uff1f",
  empty: "\u672a\u627e\u5230\u8868\u8fbe\u3002",
  summaryPrefix: "\u663e\u793a",
  summaryMiddle: "/ \u5171",
} as const;

export default async function AdminPhrasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = readAdminStringParam(params, "q");
  const itemTypeRaw = readAdminStringParam(params, "itemType") || "all";
  const itemType =
    itemTypeRaw === "sentence" ? "sentence" : itemTypeRaw === "chunk" ? "expression" : "all";
  const page = readAdminPositivePage(params);
  const notice = readAdminNotice(params);

  const pageSize = 20;
  const result = await listAdminPhrases({
    search: q,
    learningItemType: itemType,
    page,
    pageSize,
  });

  const currentHref = buildAdminHref("/admin/phrases", {
    q,
    itemType: itemTypeRaw,
    page,
  });
  const hasPrev = result.page > 1;
  const hasNext = result.page * result.pageSize < result.total;
  const buildListUrl = (nextPage: number) =>
    buildAdminHref("/admin/phrases", {
      q,
      itemType: itemTypeRaw,
      page: nextPage,
    });

  return (
    <div className="space-y-4">
      <PageHeader variant="admin" eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={LABELS.search} className={`${APPLE_ADMIN_CONTROL} pl-9`} />
          </div>
          <select
            name="itemType"
            defaultValue={itemTypeRaw}
            className={APPLE_ADMIN_SELECT}
          >
            <option value="all">{LABELS.allTypes}</option>
            <option value="chunk">{LABELS.chunk}</option>
            <option value="sentence">{LABELS.sentence}</option>
          </select>
          <Button type="submit" variant="default" size="lg" className="h-[46px] gap-2 rounded-[12px] px-6 text-sm font-bold">
            <Filter className="size-4" />
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      <div className="rounded-xl bg-white shadow-sm">
        <AdminActionBar>
          <AdminActionBarHint>{LABELS.batchHint}</AdminActionBarHint>
          <AdminActionBarActions>
            <form id="admin-phrases-batch-enrich-form" action={enrichAdminPhrasesBatchAction}>
              <input type="hidden" name="returnTo" value={currentHref} />
              <AdminSubmitButton pendingText="处理中...">
                <Wand2 className="size-3.5" />
                {LABELS.batchAction}
              </AdminSubmitButton>
            </form>
          </AdminActionBarActions>
        </AdminActionBar>

        <div className="p-3">
          {result.rows.length > 0 ? (
            <AdminList>
              {result.rows.map((row) => (
                <AdminListItem key={row.userPhraseId}>
                  <AdminListIcon>
                    {row.learningItemType === "sentence" ? (
                      <FileText className="size-5" />
                    ) : (
                      <BookOpen className="size-5" />
                    )}
                  </AdminListIcon>
                  <AdminListContent>
                    <div className="flex flex-wrap items-center gap-2">
                  {row.learningItemType === "expression" ? (
                    <input
                      type="checkbox"
                      name="userPhraseIds"
                      value={row.userPhraseId}
                      form="admin-phrases-batch-enrich-form"
                      className="size-4 cursor-pointer rounded border-border/70"
                      aria-label={`选择 ${row.text}`}
                    />
                  ) : null}
                      <AdminListTitle className="line-clamp-2">{row.text}</AdminListTitle>
                      <AdminListBadges>
                        <Badge variant={row.learningItemType === "sentence" ? "secondary" : "outline"}>
                          {row.learningItemType === "sentence" ? LABELS.sentence : LABELS.chunk}
                        </Badge>
                        <Badge
                          variant={
                            row.enrichmentState === "done"
                              ? "secondary"
                              : row.enrichmentState === "pending"
                                ? "outline"
                                : row.enrichmentState === "missing"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {row.enrichmentLabel}
                        </Badge>
                      </AdminListBadges>
                    </div>
                  {row.sourceSentenceText && row.learningItemType === "expression" ? (
                      <p className={`line-clamp-1 text-sm ${APPLE_META_TEXT}`}>
                      {LABELS.example}
                      {row.sourceSentenceText}
                    </p>
                  ) : null}
                    <p className={`line-clamp-2 text-sm ${APPLE_META_TEXT}`}>{row.translation ?? "-"}</p>
                    <AdminListMeta>
                      <span>来源场景：{row.sourceSceneSlug ?? "-"}</span>
                      <span className="font-mono">用户：{row.userId.slice(0, 8)}...</span>
                      <span>保存时间：{formatAdminDateTime(row.savedAt)}</span>
                    </AdminListMeta>
                  </AdminListContent>
                  <AdminListActions>
                    <form action={enrichAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <input type="hidden" name="returnTo" value={currentHref} />
                      <AdminSubmitButton
                        disabled={
                          row.learningItemType !== "expression" || row.enrichmentState === "pending"
                        }
                        pendingText="处理中..."
                      >
                        <Wand2 className="size-3.5" />
                        补全
                      </AdminSubmitButton>
                    </form>
                    <form action={deleteAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <input type="hidden" name="returnTo" value={currentHref} />
                      <AdminConfirmActionButton
                        type="submit"
                        tone="danger"
                        confirmText={
                          row.learningItemType === "sentence"
                            ? LABELS.deleteConfirmSentence
                            : LABELS.deleteConfirmChunk
                        }
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
        </div>
      </div>

      <AdminPagination
        summary={
          <>
            {LABELS.summaryPrefix} {(result.page - 1) * result.pageSize + 1}-
            {Math.min(result.page * result.pageSize, result.total)} {LABELS.summaryMiddle}
            {result.total}
          </>
        }
        prevHref={hasPrev ? buildListUrl(result.page - 1) : null}
        nextHref={hasNext ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
