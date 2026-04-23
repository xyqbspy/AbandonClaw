import { buttonVariants } from "@/components/ui/button";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

export const REVIEW_PAGE_CLASSNAME = "space-y-6 pb-28";

export const REVIEW_HERO_CLASSNAME =
  "overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#eef5ff_0%,#f8fafc_72%,#ffffff_100%)] p-5 shadow-[0_22px_60px_rgba(37,99,235,0.12)] ring-1 ring-sky-100";

export const REVIEW_HERO_HEADER_CLASSNAME = "mb-4 flex items-center justify-between gap-3";

export const REVIEW_HERO_STREAK_PILL_CLASSNAME =
  "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700";

export const REVIEW_HERO_BODY_CLASSNAME = "mt-5 space-y-4";

export const REVIEW_PROGRESS_HEADER_CLASSNAME =
  `mb-2 flex items-center justify-between text-xs ${APPLE_META_TEXT}`;

export const REVIEW_PROGRESS_TRACK_CLASSNAME = "h-2 overflow-hidden rounded-full bg-slate-200";

export const REVIEW_PROGRESS_FILL_CLASSNAME =
  "h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#2563eb)] transition-all";

export const REVIEW_HINT_STACK_CLASSNAME = "space-y-2";

export const REVIEW_HINT_SOURCE_CLASSNAME = `text-xs ${APPLE_META_TEXT}`;

export const REVIEW_SOURCE_ACTIONS_CLASSNAME = "flex flex-wrap gap-3";

export const REVIEW_SOURCE_UNAVAILABLE_CLASSNAME =
  "rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700";

export const REVIEW_SOURCE_UNAVAILABLE_HINT_CLASSNAME = "text-xs text-amber-600";

export const REVIEW_FOOTER_CLASSNAME =
  "fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur";

export const REVIEW_FOOTER_INNER_CLASSNAME = "mx-auto flex max-w-3xl flex-col gap-3";

export const REVIEW_FOOTER_REVIEW_GRID_CLASSNAME = "grid grid-cols-3 gap-2";

export const REVIEW_FOOTER_MUTED_TEXT_CLASSNAME =
  "rounded-full px-4 py-3 text-center text-sm text-[var(--muted-foreground)]";

export const REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME = buttonVariants({
  className: "h-14 rounded-full text-base",
});

export const REVIEW_FOOTER_PRIMARY_FULL_BUTTON_CLASSNAME = buttonVariants({
  className: "h-14 w-full rounded-full text-base",
});

export const REVIEW_FOOTER_SECONDARY_BUTTON_CLASSNAME = buttonVariants({
  variant: "secondary",
  className: "w-full",
});

export const REVIEW_FOOTER_DANGER_BUTTON_CLASSNAME = buttonVariants({
  variant: "destructive",
  className: "w-full",
});
