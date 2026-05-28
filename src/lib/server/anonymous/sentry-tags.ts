import * as Sentry from "@sentry/nextjs";
import type { RequestUserType } from "@/lib/server/logger";

/**
 * 统一注入 user_type tag,让 Sentry 上的匿名/已登录两种错误可分组聚合。
 * 与 logApiError 的 breadcrumb userType 配对使用:tag 用于事件级别检索,
 * breadcrumb 保留逐次调用的上下文。
 */
export const setSentryUserTypeTag = (userType: RequestUserType): void => {
  try {
    Sentry.setTag("user_type", userType);
  } catch {
    // Sentry 未初始化(本地 / 单测)时静默,不应阻塞业务链路。
  }
};

export const setSentryUserTypeTagFromAuthenticated = (
  isAuthenticated: boolean,
): void => {
  setSentryUserTypeTag(isAuthenticated ? "registered" : "anonymous");
};
