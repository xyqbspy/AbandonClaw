import type { Metadata, Viewport } from "next";
import { ScrollToTopOnRouteChange } from "@/components/layout/scroll-to-top-on-route-change";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Abridge English",
    template: "%s | Abridge English",
  },
  description:
    "\u4ee5\u8868\u8fbe\u548c\u8bed\u5883\u4e3a\u6838\u5fc3\u7684\u82f1\u8bed\u5b66\u4e60\u4ea7\u54c1\uff0c\u5e2e\u52a9\u4f60\u5728\u9605\u8bfb\u4e2d\u7406\u89e3\u3001\u5728\u590d\u4e60\u4e2d\u6c89\u6dc0\u3002",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollToTopOnRouteChange />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
