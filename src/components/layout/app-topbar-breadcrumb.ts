export type TopbarBreadcrumbItem = {
  label: string;
  active?: boolean;
};

const appBreadcrumbLabels = [
  { href: "/today", label: "今日学习" },
  { href: "/scenes", label: "场景" },
  { href: "/review", label: "复习" },
  { href: "/chunks", label: "表达库" },
  { href: "/progress", label: "学习进度" },
  { href: "/settings", label: "设置" },
];

const adminBreadcrumbLabels = [
  { href: "/admin/users", label: "用户" },
  { href: "/admin/invites", label: "邀请码" },
  { href: "/admin/scenes", label: "场景" },
  { href: "/admin/phrases", label: "表达库" },
  { href: "/admin/imported", label: "导入场景" },
  { href: "/admin/variants", label: "变体" },
  { href: "/admin/cache", label: "AI 缓存" },
  { href: "/admin/tts", label: "TTS 缓存" },
  { href: "/admin/observability", label: "可观测性" },
];

export function resolveTopbarBreadcrumb(pathname: string): TopbarBreadcrumbItem[] {
  if (pathname.startsWith("/admin")) {
    const current =
      adminBreadcrumbLabels.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ??
      "总览";

    return [
      { label: "管理后台" },
      { label: current, active: true },
    ];
  }

  if (pathname.startsWith("/scene/")) {
    return [
      { label: "场景" },
      { label: "学习详情", active: true },
    ];
  }

  if (pathname.startsWith("/lesson/")) {
    return [
      { label: "课程" },
      { label: "学习详情", active: true },
    ];
  }

  const current = appBreadcrumbLabels.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.label;

  return [
    { label: "学习空间" },
    { label: current ?? "今日学习", active: true },
  ];
}
