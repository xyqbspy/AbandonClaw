import Link from "next/link";

export function TodaySavedExpressionsSection({
  savedPhraseCount,
}: {
  savedPhraseCount: number;
  items: Array<{
    key: string;
    text: string;
    meta: string;
  }>;
}) {
  return (
    <Link
      href="/chunks"
      className="flex items-center justify-between rounded-[18px] bg-white px-5 py-4 text-left shadow-[0_4px_14px_rgba(0,0,0,0.03)] transition active:scale-[0.99]"
    >
      <div>
        <div className="text-[15px] font-semibold text-[#1d1d1f]">表达库</div>
        <div className="mt-1 text-[12px] text-[#86868b]">{savedPhraseCount} 条已保存</div>
      </div>
      <span className="text-[20px] text-[#d1d1d6]" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
