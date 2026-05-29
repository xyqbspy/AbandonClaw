import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AnonymousGuidancePage = "review" | "progress" | "chunks";

interface GuidanceCopy {
  title: string;
  whyHeading: string;
  why: string;
  unlockHeading: string;
  unlock: string[];
  nowHeading: string;
  now: string;
  nowAction: { label: string; href: string };
}

const COPY: Record<AnonymousGuidancePage, GuidanceCopy> = {
  review: {
    title: "复习功能需要先登录",
    whyHeading: "为什么用不了",
    why: "复习清单依赖你「学过」的表达,匿名访问还没有积累任何表达,所以这里没有内容可展示。",
    unlockHeading: "注册后可解锁",
    unlock: [
      "保存学过的表达进个人表达库",
      "按记忆曲线自动安排每日复习",
      "在场景里随时切回复习并打上信号",
    ],
    nowHeading: "现在可以做什么",
    now: "回到首页找一个你感兴趣的场景继续读一段,体会一下 AI 表达解释的玩法,觉得有用再注册保存。",
    nowAction: { label: "回到首页", href: "/" },
  },
  progress: {
    title: "学习进度需要先登录",
    whyHeading: "为什么用不了",
    why: "学习进度统计需要持久记录你每日的学习时长和场景完成情况,匿名访问不会被持久化。",
    unlockHeading: "注册后可解锁",
    unlock: [
      "记录每日学习时长与连续打卡",
      "按场景维度查看完成度",
      "看到自己「已学 / 已保存 / 已复习」的全景",
    ],
    nowHeading: "现在可以做什么",
    now: "先在分享场景里完整体验一次「看 + 听 + 拆」,再决定要不要注册积累自己的学习轨迹。",
    nowAction: { label: "回到首页", href: "/" },
  },
  chunks: {
    title: "我的表达库需要先登录",
    whyHeading: "为什么用不了",
    why: "表达库展示的是你保存过的表达,匿名访问下保存按钮被禁用,因此这里还是空的。",
    unlockHeading: "注册后可解锁",
    unlock: [
      "把场景里学到的好表达一键保存",
      "在表达页打信号(已用 / 想再用 / 不熟)",
      "复习时自动从这里出题",
    ],
    nowHeading: "现在可以做什么",
    now: "在场景里碰到喜欢的表达,先用 AI 解释看清用法,等想保存再注册。",
    nowAction: { label: "回到首页", href: "/" },
  },
};

export function AnonymousGuidanceState({
  page,
  className,
  registerHref = "/signup",
}: {
  page: AnonymousGuidancePage;
  className?: string;
  registerHref?: string;
}) {
  const copy = COPY[page];
  return (
    <div
      data-testid="anonymous-guidance-state"
      data-page={page}
      className={cn("mx-auto w-full max-w-2xl px-4 py-10 sm:py-12", className)}
    >
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 pb-6 text-sm leading-6 text-foreground/85 sm:px-6">
          <section>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-foreground/60 uppercase">
              {copy.whyHeading}
            </h3>
            <p>{copy.why}</p>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-foreground/60 uppercase">
              {copy.unlockHeading}
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              {copy.unlock.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-foreground/60 uppercase">
              {copy.nowHeading}
            </h3>
            <p>{copy.now}</p>
          </section>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button asChild variant="outline" radius="sm">
              <Link href={copy.nowAction.href} data-testid="anonymous-guidance-secondary-action">
                {copy.nowAction.label}
              </Link>
            </Button>
            <Button asChild radius="sm">
              <Link href={registerHref} data-testid="anonymous-guidance-primary-action">
                立即注册解锁
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
