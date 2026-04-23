import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
  APPLE_BADGE_SUBTLE,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL_INFO,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";

export const SCENE_PAGE_STACK_CLASSNAME = "space-y-[var(--mobile-adapt-space-2xl)]";

export const SCENE_PAGE_ERROR_TEXT_CLASSNAME =
  "text-[length:var(--mobile-adapt-font-body-sm)] text-destructive";

export const SCENE_PAGE_CONTENT_ANCHOR_CLASSNAME = "relative";

export const SCENE_PAGE_SHEET_PADDING_CLASSNAME = "p-[var(--mobile-adapt-space-sheet)]";

export const SCENE_PAGE_RAISED_SECTION_CLASSNAME =
  `${SCENE_PAGE_SHEET_PADDING_CLASSNAME} ${APPLE_PANEL_RAISED}`;

export const SCENE_PAGE_MUTED_TEXT_CLASSNAME = APPLE_META_TEXT;

export const SCENE_ACTION_BUTTON_SM_CLASSNAME = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

export const SCENE_ACTION_BUTTON_LG_CLASSNAME = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;

export const SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;

export const SCENE_DANGER_ACTION_BUTTON_LG_CLASSNAME = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_LG}`;

export const SCENE_MOBILE_SURFACE_CLASSNAME = "bg-[var(--app-page-background)] pb-10";

export const SCENE_MOBILE_NARROW_STACK_CLASSNAME =
  "mx-auto w-full max-w-[480px] space-y-[var(--mobile-space-md)]";

export const SCENE_MOBILE_PANEL_CLASSNAME = `${APPLE_PANEL_RAISED} rounded-[24px]`;

export const SCENE_MOBILE_SOFT_PANEL_CLASSNAME =
  `${APPLE_PANEL_INFO} rounded-[18px] shadow-[var(--app-shadow-soft)]`;

export const SCENE_MOBILE_SECONDARY_ACTION_CLASSNAME =
  `${APPLE_BUTTON_BASE} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;

export const SCENE_MOBILE_PRIMARY_ACTION_CLASSNAME =
  `${APPLE_BUTTON_STRONG} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;

export const SCENE_VARIANTS_STACK_CLASSNAME = "space-y-[var(--mobile-space-2xl)]";

export const SCENE_VARIANTS_SECTION_CLASSNAME =
  `space-y-[var(--mobile-space-xl)] p-[var(--mobile-space-sheet)] sm:p-[var(--mobile-space-sheet)] ${APPLE_PANEL_RAISED}`;

export const SCENE_VARIANTS_LIST_SECTION_CLASSNAME =
  `space-y-[var(--mobile-space-md)] p-[var(--mobile-space-sheet)] sm:p-[var(--mobile-space-sheet)] ${APPLE_PANEL_RAISED}`;

export const SCENE_VARIANTS_CHIP_CLASSNAME =
  `${APPLE_BADGE_SUBTLE} px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-caption)] font-medium`;

export const SCENE_VARIANTS_LIST_ITEM_CLASSNAME =
  `flex items-center justify-between gap-[var(--mobile-space-md)] p-[var(--mobile-space-md)] ${APPLE_LIST_ITEM}`;

export const SCENE_EXPRESSION_MAP_STACK_CLASSNAME = "space-y-[var(--mobile-adapt-space-xl)]";

export const SCENE_EXPRESSION_MAP_SECTION_CLASSNAME =
  `space-y-[var(--mobile-adapt-space-md)] p-[var(--mobile-adapt-space-sheet)] ${APPLE_PANEL_RAISED}`;

export const SCENE_EXPRESSION_MAP_LIST_ITEM_CLASSNAME =
  `space-y-[var(--mobile-adapt-space-sm)] p-[var(--mobile-adapt-space-md)] ${APPLE_LIST_ITEM}`;

export const SCENE_EXPRESSION_MAP_CHIP_CLASSNAME =
  `${APPLE_BUTTON_BASE} px-[var(--mobile-adapt-space-sm)] py-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-meta)] ${APPLE_BADGE_SUBTLE}`;

export const SCENE_SKELETON_CONTAINER_CLASSNAME =
  "space-y-[var(--mobile-adapt-space-xl)] p-[var(--mobile-adapt-space-sheet)]";

export const SCENE_SKELETON_SECTION_CARD_CLASSNAME =
  "rounded-[var(--mobile-adapt-overlay-card-radius)] border border-border/50 bg-background/92 p-[var(--mobile-adapt-space-md)] shadow-sm";

export const SCENE_SKELETON_SECTION_STACK_CLASSNAME = "space-y-[var(--mobile-adapt-space-md)]";

export const SCENE_SKELETON_STATS_GRID_CLASSNAME =
  "mt-[var(--mobile-adapt-space-md)] grid grid-cols-4 gap-[var(--mobile-adapt-space-sm)]";
