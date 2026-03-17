import { BookText, ChartColumnBig, CircleCheck, Gem, Home, Settings } from "lucide-react";

export const mainNav = [
  { title: "\u4eca\u65e5\u5b66\u4e60", href: "/today", icon: Home },
  { title: "\u573a\u666f", href: "/scenes", icon: BookText },
  { title: "\u590d\u4e60", href: "/review", icon: CircleCheck },
  { title: "\u8868\u8fbe\u5e93", href: "/chunks", icon: Gem },
  { title: "\u5b66\u4e60\u8fdb\u5ea6", href: "/progress", icon: ChartColumnBig },
  { title: "\u8bbe\u7f6e", href: "/settings", icon: Settings },
];

export const marketingNav = [
  { title: "\u6f14\u793a", href: "/demo" },
  { title: "\u767b\u5f55", href: "/login" },
  { title: "\u6ce8\u518c", href: "/signup" },
];
