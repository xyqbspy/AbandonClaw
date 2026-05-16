import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";

// chunks/page.tsx 第二轮拆分配套：收口 page.tsx 顶层常量与 hero / filter 区重复 className。
// 仅承载 chunks 页族私有样式入口，不公共化。

// === 顶层 button 常量（原 appleButtonClassName / appleButtonStrongClassName / chunksButtonClassName） ===

export const CHUNKS_APPLE_BUTTON_CLASSNAME = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
export const CHUNKS_APPLE_BUTTON_STRONG_CLASSNAME = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_SM}`;
export const CHUNKS_PRIMARY_BUTTON_CLASSNAME =
  "cursor-pointer rounded-xl bg-white px-4 py-2 text-[10px] font-black text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600";

// === view-mode / content-filter / review-filter 三处 pill group 重复模式 ===

export const CHUNKS_PILL_GROUP_CONTAINER_CLASSNAME =
  "flex gap-1 rounded-xl bg-slate-100 p-1";

// 注意：review-filter 行使用 flex-wrap，与 view-mode/content-filter 略不同；在调用处单独追加 flex-wrap
export const CHUNKS_PILL_BUTTON_BASE_CLASSNAME =
  "cursor-pointer rounded-lg px-5 py-2 text-xs font-bold transition-all";
export const CHUNKS_PILL_BUTTON_BASE_COMPACT_CLASSNAME =
  "cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition-all";
export const CHUNKS_PILL_BUTTON_ACTIVE_CLASSNAME = "bg-white text-blue-600 shadow-sm";
export const CHUNKS_PILL_BUTTON_INACTIVE_CLASSNAME =
  "text-slate-400 hover:text-slate-600";

// === library tab（mine / builtin）切换 ===

export const CHUNKS_LIBRARY_TAB_BUTTON_BASE_CLASSNAME =
  "relative whitespace-nowrap text-[13px] font-black transition";
export const CHUNKS_LIBRARY_TAB_BUTTON_ACTIVE_TEXT_CLASSNAME = "text-blue-600";
export const CHUNKS_LIBRARY_TAB_BUTTON_INACTIVE_TEXT_CLASSNAME =
  "text-slate-400 hover:text-slate-600";
export const CHUNKS_LIBRARY_TAB_ACTIVE_UNDERLINE_CLASSNAME =
  "absolute left-1/2 top-full mt-2 block h-[3px] w-4 -translate-x-1/2 rounded-full bg-blue-600";
