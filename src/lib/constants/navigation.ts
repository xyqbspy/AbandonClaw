import { BookText, ChartColumnBig, CircleCheck, Gem, Home, Settings } from "lucide-react";

export const mainNav = [
  { title: "今日学习", href: "/today", icon: Home },
  { title: "课程", href: "/lesson/morning-routines", icon: BookText },
  { title: "复习", href: "/review", icon: CircleCheck },
  { title: "已收藏短语", href: "/chunks", icon: Gem },
  { title: "学习进度", href: "/progress", icon: ChartColumnBig },
  { title: "设置", href: "/settings", icon: Settings },
];

export const marketingNav = [
  { title: "演示", href: "/demo" },
  { title: "登录", href: "/login" },
  { title: "注册", href: "/signup" },
];
