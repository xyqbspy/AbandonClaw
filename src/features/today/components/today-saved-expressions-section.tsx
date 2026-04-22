import Link from "next/link";
import {
  TODAY_INFO_PILL_CLASSNAME,
  TODAY_INLINE_META_ICON_CLASSNAME,
  TODAY_INLINE_LINK_CLASSNAME,
  TODAY_SAVED_FOOTNOTE_CLASSNAME,
  TODAY_SAVED_ITEM_CLASSNAME,
  TODAY_SAVED_ITEM_META_CLASSNAME,
  TODAY_SECTION_CLASSNAME,
  TODAY_SECTION_EMOJI_CLASSNAME,
  TODAY_SECTION_TITLE_CLASSNAME,
  TODAY_SOFT_PANEL_CLASSNAME,
} from "@/features/today/components/today-page-styles";

export function TodaySavedExpressionsSection({
  savedPhraseCount,
  items,
}: {
  savedPhraseCount: number;
  items: Array<{
    key: string;
    text: string;
    meta: string;
  }>;
}) {
  return (
    <section className={TODAY_SECTION_CLASSNAME}>
      <div className="mb-[var(--mobile-space-lg)] flex items-center justify-between gap-[var(--mobile-space-md)]">
        <div className={`flex items-center gap-[var(--mobile-space-sm)] ${TODAY_SECTION_TITLE_CLASSNAME} text-[#1F2A44]`}>
          <span className={TODAY_SECTION_EMOJI_CLASSNAME}>📘</span>
          <span>已保存表达</span>
          <span className={`${TODAY_INFO_PILL_CLASSNAME} px-[var(--mobile-space-sm)] py-[2px]`}>
            {savedPhraseCount}
          </span>
        </div>
        <Link href="/chunks" className={TODAY_INLINE_LINK_CLASSNAME}>
          查看全部 →
        </Link>
      </div>

      <div className={TODAY_SOFT_PANEL_CLASSNAME}>
        {items.map((item) => (
          <div key={item.key} className={TODAY_SAVED_ITEM_CLASSNAME}>
            <div>“{item.text}”</div>
            <div className={TODAY_SAVED_ITEM_META_CLASSNAME}>{item.meta}</div>
          </div>
        ))}
      </div>

      <p className={TODAY_SAVED_FOOTNOTE_CLASSNAME}>
        <span aria-hidden="true" className={TODAY_INLINE_META_ICON_CLASSNAME}>
          📎
        </span>
        <span>最近沉淀 · 持续复用</span>
      </p>
    </section>
  );
}
