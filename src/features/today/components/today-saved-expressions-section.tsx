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
      className="flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.99] sm:px-5 sm:py-5"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
          <span className="text-sm" aria-hidden="true">
            ≡
          </span>
        </div>
        <div>
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">表达库</p>
          <p className="mt-1 font-sans text-[15px] font-bold text-slate-800">{savedPhraseCount} 条已保存</p>
        </div>
      </div>

      <span className="text-[18px] text-slate-200" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
