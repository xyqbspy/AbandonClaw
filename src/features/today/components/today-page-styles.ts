import {
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_MD,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

export const TODAY_SECTION_CLASSNAME = `${APPLE_PANEL_RAISED} px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]`;
export const TODAY_SECTION_TITLE_CLASSNAME = `flex items-center gap-[var(--mobile-space-sm)] ${APPLE_TITLE_SM}`;
export const TODAY_CONTINUE_BUTTON_CLASSNAME = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_MD} mt-[var(--mobile-space-xl)] h-[var(--mobile-button-height)] w-full justify-center shadow-[0_8px_18px_rgba(37,99,235,0.25)] active:scale-[0.97] disabled:cursor-default disabled:opacity-70 disabled:shadow-none`;

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
export const TODAY_CONTINUE_HELPER_ICON_CLASSNAME =
  "inline-flex text-[clamp(0.88rem,4vw,0.95rem)] leading-none align-[-0.08em]";
export const TODAY_BADGE_EMOJI_CLASSNAME =
  "inline-flex text-[clamp(0.82rem,3.8vw,0.92rem)] leading-none align-[-0.08em]";

export const TODAY_PILL_BASE_CLASSNAME =
  "rounded-[var(--app-radius-pill)] text-[length:var(--mobile-font-caption)] font-medium";
export const TODAY_INFO_PILL_CLASSNAME = `${TODAY_PILL_BASE_CLASSNAME} bg-[#EEF2FF] text-[#2563EB]`;
export const TODAY_STEP_PILL_CLASSNAME = `${TODAY_PILL_BASE_CLASSNAME} bg-[#EFF6FF] text-[#2563EB]`;
export const TODAY_REVIEW_PILL_CLASSNAME =
  `${TODAY_PILL_BASE_CLASSNAME} px-[var(--mobile-space-lg)] py-[var(--mobile-space-sm)]`;

export const TODAY_CARD_PANEL_CLASSNAME =
  "rounded-[var(--app-radius-panel)] bg-[#F8FAFE] px-[var(--mobile-space-lg)] py-[var(--mobile-space-md)]";
export const TODAY_SOFT_PANEL_CLASSNAME =
  "rounded-[var(--app-radius-panel)] bg-[#F9F9FF] px-[var(--mobile-space-lg)] py-[var(--mobile-space-md)]";
export const TODAY_RECOMMEND_CARD_CLASSNAME =
  "min-w-[200px] shrink-0 rounded-[var(--app-radius-card)] border border-[#EDF2F7] bg-white px-[var(--mobile-space-lg)] py-[var(--mobile-space-lg)] text-left shadow-[0_6px_12px_rgba(0,0,0,0.03)] transition active:scale-[0.98]";

export const TODAY_SKELETON_BAR_CLASSNAME = "rounded-full animate-pulse";
