import { deleteAdminPhraseAction, enrichAdminPhraseAction, enrichAdminPhrasesBatchAction } from "@/app/(app)/admin/actions";
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
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { AdminPagination, AdminTableShell } from "@/components/shared/admin-list-shell";
import { ConfirmButton } from "@/components/shared/confirm-action";
import { FilterBar, FilterBarForm } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminPhrases } from "@/lib/server/admin/service";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_SM,
  APPLE_INPUT_BASE,
  APPLE_META_TEXT,
  APPLE_TABLE_HEAD,
  APPLE_TABLE_ROW,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u7ba1\u7406\u540e\u53f0",
  title: "\u8868\u8fbe\u5e93\u7ba1\u7406",
  description:
    "\u652f\u6301\u6309 chunk / \u53e5\u5b50\u7b5b\u9009\uff0c\u5217\u8868\u533a\u5206\u7c7b\u578b\u5e76\u53ef\u76f4\u63a5\u5220\u9664\u3002",
  search: "\u641c\u7d22\u8868\u8fbe / \u53e5\u5b50 / \u7ffb\u8bd1",
  allTypes: "\u5168\u90e8\u7c7b\u578b",
  sentence: "\u53e5\u5b50",
  submit: "\u7b5b\u9009",
  batchHint: "\u52fe\u9009\u540e\u53ef\u6279\u91cf\u8865\u5168\u9009\u4e2d\u7684 chunk\u3002",
  batchAction: "\u6279\u91cf\u8865\u5168\u9009\u4e2d\u9879",
  example: "\u4f8b\u53e5\uff1a",
  delete: "\u5220\u9664",
  deleteConfirmSentence: "\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u53e5\u5b50\u5417\uff1f",
  deleteConfirmChunk: "\u786e\u8ba4\u5220\u9664\u8fd9\u6761 chunk \u5417\uff1f",
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
  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
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
      <PageHeader eyebrow={LABELS.eyebrow} title={LABELS.title} description={LABELS.description} />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <FilterBar>
        <FilterBarForm className="sm:grid-cols-[1fr_auto_auto]">
          <Input name="q" defaultValue={q} placeholder={LABELS.search} />
          <select
            name="itemType"
            defaultValue={itemTypeRaw}
            className={`h-8 px-2.5 text-sm ${APPLE_INPUT_BASE}`}
          >
            <option value="all">{LABELS.allTypes}</option>
            <option value="chunk">chunk</option>
            <option value="sentence">{LABELS.sentence}</option>
          </select>
          <Button type="submit" variant="ghost" className={appleButtonClassName}>
            {LABELS.submit}
          </Button>
        </FilterBarForm>
      </FilterBar>

      <form id="admin-phrases-batch-enrich-form" action={enrichAdminPhrasesBatchAction}>
        <input type="hidden" name="returnTo" value={currentHref} />
      </form>

      <AdminTableShell>
        <AdminActionBar>
          <AdminActionBarHint>{LABELS.batchHint}</AdminActionBarHint>
          <AdminActionBarActions>
            <Button
              type="submit"
              form="admin-phrases-batch-enrich-form"
              size="sm"
              variant="ghost"
              className={appleButtonClassName}
            >
              {LABELS.batchAction}
            </Button>
          </AdminActionBarActions>
        </AdminActionBar>

        <table className="min-w-full text-sm">
          <thead className={`${APPLE_TABLE_HEAD} text-left text-xs`}>
            <tr>
              <th className="w-12 px-3 py-2">选择</th>
              <th className="px-3 py-2">内容</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">补全状态</th>
              <th className="px-3 py-2">翻译</th>
              <th className="px-3 py-2">来源场景</th>
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">保存时间</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.userPhraseId} className={`${APPLE_TABLE_ROW} align-top`}>
                <td className="px-3 py-2">
                  {row.learningItemType === "expression" ? (
                    <input
                      type="checkbox"
                      name="userPhraseIds"
                      value={row.userPhraseId}
                      form="admin-phrases-batch-enrich-form"
                      className="size-4 rounded border-border/70"
                    />
                  ) : null}
                </td>
                <td className="max-w-[360px] px-3 py-2">
                  <p className="line-clamp-2 font-medium">{row.text}</p>
                  {row.sourceSentenceText && row.learningItemType === "expression" ? (
                    <p className={`mt-0.5 line-clamp-1 ${APPLE_META_TEXT}`}>
                      {LABELS.example}
                      {row.sourceSentenceText}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.learningItemType === "sentence" ? "secondary" : "outline"}>
                    {row.learningItemType === "sentence" ? LABELS.sentence : "chunk"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
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
                </td>
                <td className={`max-w-[260px] px-3 py-2 ${APPLE_META_TEXT}`}>
                  <p className="line-clamp-2">{row.translation ?? "-"}</p>
                </td>
                <td className={`px-3 py-2 ${APPLE_META_TEXT}`}>{row.sourceSceneSlug ?? "-"}</td>
                <td className={`px-3 py-2 font-mono ${APPLE_META_TEXT}`}>
                  {row.userId.slice(0, 8)}...
                </td>
                <td className={`px-3 py-2 whitespace-nowrap ${APPLE_META_TEXT}`}>
                  {row.savedAt}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <form action={enrichAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <input type="hidden" name="returnTo" value={currentHref} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        disabled={
                          row.learningItemType !== "expression" || row.enrichmentState === "pending"
                        }
                      >
                        补全
                      </Button>
                    </form>
                    <form action={deleteAdminPhraseAction}>
                      <input type="hidden" name="userPhraseId" value={row.userPhraseId} />
                      <input type="hidden" name="returnTo" value={currentHref} />
                      <ConfirmButton
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`}
                        confirmText={
                          row.learningItemType === "sentence"
                            ? LABELS.deleteConfirmSentence
                            : LABELS.deleteConfirmChunk
                        }
                        finalConfirmText={LABELS.deleteFinal}
                      >
                        {LABELS.delete}
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
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
        prevHref={hasPrev ? buildListUrl(result.page - 1) : null}
        nextHref={hasNext ? buildListUrl(result.page + 1) : null}
      />
    </div>
  );
}
