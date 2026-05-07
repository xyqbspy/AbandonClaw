import { buttonVariants } from "@/components/ui/button";
import { APPLE_META_TEXT, APPLE_PANEL } from "@/lib/ui/apple-style";

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

export const REVIEW_SOURCE_ACTIONS_CLASSNAME =
  "flex flex-wrap items-center gap-3 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 p-4";

export const REVIEW_SOURCE_ACTIONS_LABEL_CLASSNAME =
  "w-full text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

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

export const REVIEW_STAGE_PANEL_CLASSNAME =
  "rounded-[24px] border border-[var(--app-border-soft)] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]";

export const REVIEW_STAGE_STEP_TAG_CLASSNAME =
  "mb-4 inline-flex rounded-xl bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700";

export const REVIEW_STAGE_TITLE_CLASSNAME = "text-2xl font-semibold tracking-tight text-slate-950";

export const REVIEW_STAGE_BLOCK_CLASSNAME = `rounded-[20px] p-4 ${APPLE_PANEL}`;

export const REVIEW_STAGE_DASHED_BLOCK_CLASSNAME =
  "rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4";

export const REVIEW_STAGE_STRONG_DASHED_BLOCK_CLASSNAME =
  "rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-4";

export const REVIEW_STAGE_GUIDANCE_TITLE_CLASSNAME = "text-sm font-semibold text-slate-900";

export const REVIEW_STAGE_PROMPT_TITLE_CLASSNAME = "text-sm font-medium text-slate-700";

export const REVIEW_STAGE_FIELD_LABEL_CLASSNAME = "mt-3 text-sm font-medium text-slate-800";

export const REVIEW_STAGE_FIELD_LABEL_SPACED_CLASSNAME =
  "mt-5 text-sm font-medium text-slate-800";

export const REVIEW_STAGE_QUEUE_TITLE_CLASSNAME = "text-lg font-semibold text-slate-950";

export const REVIEW_STAGE_SCENE_TITLE_CLASSNAME = "mt-2 text-lg font-semibold text-foreground";

export const REVIEW_STAGE_SCENE_BODY_CLASSNAME = "mt-3 text-base leading-7 text-foreground";

export const REVIEW_STAGE_SCENE_INLINE_TEXT_CLASSNAME = "mt-1 text-sm text-foreground";

export const REVIEW_STAGE_SCENE_EXPECTED_TEXT_CLASSNAME =
  "mt-1 text-base font-medium text-foreground";

export const REVIEW_STAGE_SCENE_FEEDBACK_RESULT_CLASSNAME = "mt-2 text-base font-medium";

export const REVIEW_STAGE_MODE_PILL_CLASSNAME = "rounded-full px-2.5 py-1 text-xs font-medium";

export const REVIEW_STAGE_SCHEDULING_REASON_CLASSNAME = "mt-2 text-sm text-amber-800";

export const REVIEW_STAGE_PHRASE_MASKED_CLASSNAME = "mt-2 text-lg font-semibold text-slate-950";

export const REVIEW_STAGE_PHRASE_EXPRESSION_CLASSNAME =
  "mt-2 text-2xl font-semibold text-slate-950";

export const REVIEW_STAGE_REFERENCE_TOGGLE_CLASSNAME =
  "mt-4 h-auto px-0 text-sm font-medium text-slate-600";

export const REVIEW_STAGE_FEEDBACK_SCORING_HINT_CLASSNAME = "mt-2 text-sm text-slate-700";

export const REVIEW_STAGE_REFERENCE_BLOCK_CLASSNAME =
  "mt-3 rounded-[18px] bg-white p-4 shadow-sm";

export const REVIEW_STAGE_WARNING_BLOCK_CLASSNAME =
  "rounded-[18px] border border-amber-200 bg-amber-50/80 p-4";

export const REVIEW_STAGE_WARNING_LABEL_CLASSNAME =
  "text-xs font-semibold uppercase tracking-[0.16em] text-amber-700";

const REVIEW_STAGE_FEEDBACK_PILL_BASE_CLASSNAME = "rounded-full px-3 py-1";

export const REVIEW_STAGE_FEEDBACK_PILL_SUBTLE_CLASSNAME =
  `${REVIEW_STAGE_FEEDBACK_PILL_BASE_CLASSNAME} bg-slate-100 text-slate-700`;

export const REVIEW_STAGE_FEEDBACK_PILL_INFO_CLASSNAME =
  `${REVIEW_STAGE_FEEDBACK_PILL_BASE_CLASSNAME} bg-sky-50 text-sky-700`;

export const REVIEW_STAGE_FEEDBACK_PILL_WARNING_CLASSNAME =
  `${REVIEW_STAGE_FEEDBACK_PILL_BASE_CLASSNAME} bg-amber-50 text-amber-700`;

export const REVIEW_STAGE_FEEDBACK_PILL_SUCCESS_CLASSNAME =
  `${REVIEW_STAGE_FEEDBACK_PILL_BASE_CLASSNAME} bg-emerald-50 text-emerald-700`;
