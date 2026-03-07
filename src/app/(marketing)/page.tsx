import Link from "next/link";
import { ArrowRight, BookOpenText, Gem, Layers3, Sparkles, Volume2 } from "lucide-react";
import { appCopy } from "@/lib/constants/copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <div className="app-container py-8 sm:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <p className="text-xs tracking-[0.08em] text-muted-foreground">{appCopy.marketing.heroEyebrow}</p>
          <h1 className="max-w-3xl text-3xl leading-tight font-semibold sm:text-5xl">{appCopy.marketing.heroTitle}</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-lg">{appCopy.marketing.heroSubtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {appCopy.marketing.primaryCta}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {appCopy.marketing.secondaryCta}
            </Link>
          </div>
          <div className="grid max-w-2xl grid-cols-3 gap-3">
            <Card className="p-3">
              <p className="text-xl font-semibold">12 分钟</p>
              <p className="text-xs text-muted-foreground">平均单次学习时长</p>
            </Card>
            <Card className="p-3">
              <p className="text-xl font-semibold">9 天</p>
              <p className="text-xs text-muted-foreground">连续学习样例</p>
            </Card>
            <Card className="p-3">
              <p className="text-xl font-semibold">64 条</p>
              <p className="text-xs text-muted-foreground">已收藏短语样例</p>
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card shadow-xl shadow-black/5">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="text-xl">课程内点选短语示例</CardTitle>
            <p className="text-sm text-muted-foreground">阅读过程中无需跳转，右侧即可查看解释并加入复习。</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">已选内容</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge>as soon as</Badge>
                <Button size="icon-sm" variant="outline" aria-label="发音">
                  <Volume2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
              <div>
                <p className="text-xs tracking-[0.08em] text-muted-foreground">中文释义</p>
                <p className="text-sm font-medium">一……就……；立刻在某个动作之后</p>
              </div>
              <div>
                <p className="text-xs tracking-[0.08em] text-muted-foreground">用法讲解</p>
                <p className="text-sm text-muted-foreground">用于连接两个动作，强调后一个动作几乎立即发生。</p>
              </div>
              <div>
                <p className="text-xs tracking-[0.08em] text-muted-foreground">例句</p>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                  I get up as soon as my alarm goes off.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm">收藏短语</Button>
                <Button size="sm" variant="secondary">
                  加入复习
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpenText className="size-5" /> 课程阅读
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            每节课程围绕真实表达展开，句子可读、语境完整，减少脱离场景的记忆负担。
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers3 className="size-5" /> 短语理解
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            点选任意短语，立即查看中文释义、用法讲解、例句与发音，阅读节奏不被打断。
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gem className="size-5" /> 复习沉淀
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            把值得反复接触的表达加入复习，利用短时高频回顾形成长期记忆。
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 rounded-2xl border border-border/70 bg-card/70 p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-2xl font-semibold">学习闭环</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">从阅读到复习的每一步都轻量、可持续，帮助你把“看懂”变成“会用”。</p>
        <Separator className="my-5" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "阅读内容", "在课程中接触完整句子和真实语境。"],
            ["02", "点选短语", "遇到不熟悉表达时立即查看详情。"],
            ["03", "理解含义", "通过中文释义与用法讲解快速吃透。"],
            ["04", "收藏复习", "把关键短语加入复习，稳定强化。"],
          ].map(([step, title, desc]) => (
            <Card key={step} className="border-border/70 bg-background/80 p-4">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">{step}</p>
              <p className="mt-1 text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
