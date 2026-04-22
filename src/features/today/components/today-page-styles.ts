import {
  APPLE_BODY_TEXT,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_MD,
  APPLE_META_TEXT,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

export const TODAY_SECTION_CLASSNAME = `${APPLE_PANEL_RAISED} px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]`;
export const TODAY_SECTION_TITLE_CLASSNAME = `flex items-center gap-[var(--mobile-space-sm)] ${APPLE_TITLE_SM}`;
export const TODAY_CONTINUE_BUTTON_CLASSNAME = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_MD} mt-[var(--mobile-space-xl)] h-[var(--mobile-button-height)] w-full justify-center shadow-[0_8px_18px_rgba(37,99,235,0.25)] active:scale-[0.97] disabled:cursor-default disabled:opacity-70 disabled:shadow-none`;
export const TODAY_CONTINUE_TITLE_CLASSNAME =
  "truncate text-[length:clamp(1.15rem,5.6vw,1.25rem)] leading-[1.2] font-extrabold tracking-[-0.03em] text-[#0B2B40]";
export const TODAY_CONTINUE_SECTION_CLASSNAME = `${TODAY_SECTION_CLASSNAME} shadow-[0_12px_24px_rgba(0,0,0,0.05)]`;

export const TODAY_SECTION_EMOJI_CLASSNAME =
  "inline-flex text-[clamp(0.95rem,4.4vw,1rem)] leading-none";
export const TODAY_TASK_ICON_GLYPH_CLASSNAME =
  "text-[clamp(1.15rem,5.8vw,1.35rem)] leading-none";
export const TODAY_INLINE_META_ICON_CLASSNAME =
  "inline-flex text-[clamp(0.82rem,3.8vw,0.92rem)] leading-none";
export const TODAY_CONTINUE_BADGE_ICON_CLASSNAME =
  "inline-flex text-[clamp(0.88rem,4vw,0.96rem)] leading-none";
export const TODAY_CONTINUE_RING_VALUE_CLASSNAME =
  "text-[clamp(1.3rem,6vw,1.6rem)] leading-none";
export const TODAY_CONTINUE_RING_SHELL_CLASSNAME =
  "flex h-[100px] w-[100px] items-center justify-center rounded-full border-[8px] border-[#E9EEF5] bg-[#F8FAFE]";
export const TODAY_CONTINUE_RING_TRACK_COLOR = "#E9EEF5";
export const TODAY_CONTINUE_RING_PROGRESS_COLOR = "#3B82F6";
export const TODAY_CONTINUE_RING_VALUE_TEXT_CLASSNAME =
  `absolute inset-0 flex items-center justify-center font-extrabold text-[#1E293B] ${TODAY_CONTINUE_RING_VALUE_CLASSNAME}`;
export const TODAY_CONTINUE_HELPER_ICON_CLASSNAME =
  "inline-flex text-[clamp(0.88rem,4vw,0.95rem)] leading-none align-[-0.08em]";
export const TODAY_CONTINUE_PROGRESS_TEXT_CLASSNAME = `${APPLE_BODY_TEXT} font-medium text-[#1E293B]`;
export const TODAY_CONTINUE_RESULT_TEXT_CLASSNAME = `${APPLE_META_TEXT} leading-[1.5] text-[#425466]`;
export const TODAY_SKELETON_BAR_CLASSNAME = "rounded-full animate-pulse";
export const TODAY_SKELETON_STRONG_BAR_CLASSNAME = `bg-[#DCE7F7] ${TODAY_SKELETON_BAR_CLASSNAME}`;
export const TODAY_SKELETON_SOFT_BAR_CLASSNAME = `bg-[#E7EEF9] ${TODAY_SKELETON_BAR_CLASSNAME}`;
export const TODAY_BADGE_EMOJI_CLASSNAME =
  "inline-flex text-[clamp(0.82rem,3.8vw,0.92rem)] leading-none align-[-0.08em]";

export const TODAY_PILL_BASE_CLASSNAME =
  "rounded-[var(--app-radius-pill)] text-[length:var(--mobile-font-caption)] font-medium";
export const TODAY_INFO_PILL_CLASSNAME = `${TODAY_PILL_BASE_CLASSNAME} bg-[#EEF2FF] text-[#2563EB]`;
export const TODAY_STEP_PILL_CLASSNAME = `${TODAY_PILL_BASE_CLASSNAME} bg-[#EFF6FF] text-[#2563EB]`;
export const TODAY_REVIEW_PILL_CLASSNAME =
  `${TODAY_PILL_BASE_CLASSNAME} px-[var(--mobile-space-lg)] py-[var(--mobile-space-sm)]`;
export const TODAY_REVIEW_DUE_PILL_CLASSNAME = "bg-[#FEF2F2] text-[#DC2626]";
export const TODAY_REVIEW_CLEAR_PILL_CLASSNAME = "bg-[#E6F7EC] text-[#2E7D32]";
export const TODAY_REVIEW_ACCURACY_VALUE_CLASSNAME =
  "text-[length:clamp(1.55rem,7vw,1.8rem)] font-extrabold text-[#10B981]";

export const TODAY_CARD_PANEL_CLASSNAME =
  "rounded-[var(--app-radius-panel)] bg-[#F8FAFE] px-[var(--mobile-space-lg)] py-[var(--mobile-space-md)]";
export const TODAY_SOFT_PANEL_CLASSNAME =
  "rounded-[var(--app-radius-panel)] bg-[#F9F9FF] px-[var(--mobile-space-lg)] py-[var(--mobile-space-md)]";
export const TODAY_RECOMMEND_CARD_CLASSNAME =
  "min-w-[200px] shrink-0 rounded-[var(--app-radius-card)] border border-[#EDF2F7] bg-white px-[var(--mobile-space-lg)] py-[var(--mobile-space-lg)] text-left shadow-[0_6px_12px_rgba(0,0,0,0.03)] transition active:scale-[0.98]";
export const TODAY_RECOMMEND_EMPTY_CLASSNAME =
  `${TODAY_SECTION_CLASSNAME} py-[calc(var(--mobile-space-xl)+var(--mobile-space-lg))] text-[length:var(--mobile-font-body)] text-[#6C7A91]`;
export const TODAY_RECOMMEND_TITLE_CLASSNAME =
  "text-[length:clamp(0.98rem,4.4vw,1rem)] leading-[1.28] font-bold tracking-[-0.02em] text-[#1E293B]";
export const TODAY_RECOMMEND_REASON_PILL_CLASSNAME =
  `${TODAY_PILL_BASE_CLASSNAME} mt-[var(--mobile-space-md)] inline-flex bg-[#F1F5F9] px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)] text-[#334155]`;
export const TODAY_RECOMMEND_BADGE_CLASSNAME =
  "mt-[var(--mobile-space-sm)] text-[length:var(--mobile-font-caption)] font-medium text-[#7B8798]";

export const TODAY_TASK_STEP_BASE_CLASSNAME =
  "flex-1 rounded-[var(--app-radius-card)] border px-[var(--mobile-space-sm)] py-[var(--mobile-space-md)] text-center transition";
export const TODAY_TASK_STEP_COMPLETED_CLASSNAME = "border-[#A3E9B0] bg-[#E6F7EC]";
export const TODAY_TASK_STEP_ACTIVE_CLASSNAME =
  "border-[#3B82F6] bg-[#EFF6FF] shadow-[0_2px_6px_rgba(59,130,246,0.1)]";
export const TODAY_TASK_STEP_INACTIVE_CLASSNAME = "border-[#EDF2F7] bg-[#F8FAFE]";
export const TODAY_TASK_STEP_ICON_CLASSNAME =
  "mx-auto mb-[var(--mobile-space-sm)] flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/80 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)] aspect-square";
export const TODAY_TASK_STEP_TITLE_CLASSNAME =
  "text-[length:var(--mobile-font-body-sm)] font-semibold leading-[1.2] tracking-[-0.01em] text-[#1F2A44]";
export const TODAY_TASK_STEP_DESC_CLASSNAME =
  "mt-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] leading-[1.35] text-[#6C7A91]";

export const TODAY_INLINE_LINK_CLASSNAME =
  "text-[length:var(--mobile-font-caption)] font-medium text-[#3B82F6]";
export const TODAY_SAVED_ITEM_CLASSNAME =
  "border-b border-dashed border-[#E2E8F0] py-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body-sm)] font-medium leading-[1.45] text-[#1F2A44] last:border-b-0";
export const TODAY_SAVED_ITEM_META_CLASSNAME =
  "mt-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] leading-[1.4] font-normal text-[#7A8699]";
export const TODAY_SAVED_FOOTNOTE_CLASSNAME =
  "mt-[var(--mobile-space-sm)] flex items-center gap-[6px] text-[length:var(--mobile-font-caption)] leading-[1.3] text-[#8A99B0]";

export const TODAY_TASK_ACTION_BASE_CLASSNAME =
  `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} h-[var(--mobile-control-height)] px-[var(--mobile-space-md)]`;
export const TODAY_TASK_ACTION_STRONG_CLASSNAME =
  `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_SM} h-[var(--mobile-control-height)] px-[var(--mobile-space-md)]`;
export const TODAY_TASK_ACTION_DISABLED_CLASSNAME =
  `${TODAY_TASK_ACTION_BASE_CLASSNAME} cursor-not-allowed border-transparent bg-[var(--app-surface-hover)] text-[var(--muted-foreground)] shadow-none`;
export const TODAY_TASK_ACTION_WRAPPER_CLASSNAME =
  "inline-flex cursor-pointer items-center justify-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
