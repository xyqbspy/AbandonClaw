"use client";

import { MotionCardLink } from "@/components/shared/motion-card-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoPage() {
  return (
    <div className="app-container space-y-8 py-8 sm:py-12">
      <div className="space-y-2">
        <p className="text-xs tracking-[0.08em] text-muted-foreground">交互预览</p>
        <h1 className="text-4xl font-semibold">产品演示</h1>
        <p className="max-w-2xl text-muted-foreground">
          快速查看完整学习流程：阅读场景、点选短语、理解用法、加入复习。
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MotionCardLink href="/scene/dinner-plan-cancelled" motionId="demo-scene-card" className="group block">
          {(motionStateAttrs) => (
            <Card
              data-pressed={motionStateAttrs["data-pressed"]}
              data-activated={motionStateAttrs["data-activated"]}
              className="scene-card-motion h-full border-border/70 transition-colors hover:bg-muted/30"
            >
              <CardHeader>
                <CardTitle>场景卡片示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Dinner Plan Cancelled（晚餐计划取消）</p>
                <p className="text-muted-foreground">预计时间 10 分钟 · 难度 中级</p>
                <p className="text-xs text-muted-foreground">点击卡片进入场景</p>
              </CardContent>
            </Card>
          )}
        </MotionCardLink>
        <Card>
          <CardHeader>
            <CardTitle>已选内容示例</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="rounded-lg bg-muted p-3">as soon as - 一……就……</p>
            <p className="text-muted-foreground">
              用于连接两个动作，后一个动作紧接前一个动作发生。
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>今日任务示例</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            1 个场景、8 条复习项和 1 条输出练习，保持稳定学习节奏。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>复习卡片示例</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">pick up useful expressions</p>
            <p className="text-muted-foreground">在语境中自然习得实用表达</p>
            <Button size="sm" variant="secondary">
              开始复习
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
