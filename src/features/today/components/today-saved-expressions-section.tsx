import Link from "next/link";
import {
  TODAY_INFO_PILL_CLASSNAME,
  TODAY_INLINE_META_ICON_CLASSNAME,
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
        <Link href="/chunks" className="text-[length:var(--mobile-font-caption)] font-medium text-[#3B82F6]">
          查看全部 →
        </Link>
      </div>

      <div className={TODAY_SOFT_PANEL_CLASSNAME}>
        {items.map((item) => (
          <div
            key={item.key}
            className="border-b border-dashed border-[#E2E8F0] py-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body-sm)] font-medium leading-[1.45] text-[#1F2A44] last:border-b-0"
          >
            <div>“{item.text}”</div>
            <div className="mt-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] leading-[1.4] font-normal text-[#7A8699]">
              {item.meta}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-[var(--mobile-space-sm)] flex items-center gap-[6px] text-[length:var(--mobile-font-caption)] leading-[1.3] text-[#8A99B0]">
        <span aria-hidden="true" className={TODAY_INLINE_META_ICON_CLASSNAME}>
          📎
        </span>
        <span>最近沉淀 · 持续复用</span>
      </p>
    </section>
  );
}
