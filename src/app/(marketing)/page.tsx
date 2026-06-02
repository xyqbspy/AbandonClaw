import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  Check,
  Gem,
  Highlighter,
  Layers3,
  Map,
  Sparkles,
  Volume2,
} from "lucide-react";
import { appCopy } from "@/lib/constants/copy";

const trialHref = "/trial";

const stats = [
  ["12 分钟", "平均单次学习时长"],
  ["9 天", "连续学习样例"],
  ["64 条", "已收藏短语样例"],
] as const;

const steps = [
  ["01", "阅读内容", "在课程中接触完整句子和真实语境。"],
  ["02", "点选短语", "遇到不熟悉表达时立即查看详情。"],
  ["03", "理解含义", "通过中文释义与用法讲解快速吃透。"],
  ["04", "收藏复习", "把关键短语加入复习，稳定强化。"],
] as const;

const featureItems = [
  [BookOpenText, "课程阅读", "围绕真实表达展开，句子可读、语境完整，减少脱离场景的记忆负担。"],
  [Layers3, "短语理解", "点选任意短语，立即查看中文释义、用法讲解、例句与发音。"],
  [Gem, "复习沉淀", "把值得反复接触的表达加入复习，让短时理解慢慢沉淀为长期资产。"],
] as const;

const demoCards = [
  {
    step: "1",
    title: "场景选择",
    icon: Map,
    dark: false,
    body: (
      <>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
          <h4 className="mb-1 text-lg font-bold text-blue-600">Dinner Plan Cancelled</h4>
          <p className="mb-4 text-xs text-slate-400">难度: Intermediate · 预计 10 mins</p>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-200" />
            <div className="h-2 w-3/4 rounded-full bg-slate-200" />
          </div>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-slate-500">进入真实对话语境，感受母语者的表达逻辑。</p>
      </>
    ),
  },
  {
    step: "2",
    title: "短语捕获",
    icon: Highlighter,
    dark: false,
    body: (
      <>
        <div className="rounded-r-2xl border-l-4 border-blue-600 bg-[linear-gradient(120deg,rgba(147,197,253,0.3)_0%,rgba(147,197,253,0)_100%)] p-6">
          <span className="mb-2 block font-mono text-2xl font-bold text-slate-800">as soon as...</span>
          <p className="text-sm text-blue-600/80">一......就......</p>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          点击场景中的任何短语，系统会自动解析用法并将其加入你的私人表达库。
        </p>
      </>
    ),
  },
  {
    step: "3",
    title: "智能任务分配",
    icon: CalendarCheck,
    dark: false,
    body: (
      <>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {[
            ["1", "场景"],
            ["2", "复习"],
            ["1", "练习"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-blue-50 p-3 text-center">
              <span className="block font-bold text-blue-600">{value}</span>
              <span className="text-[10px] uppercase text-blue-400">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500">根据艾宾浩斯曲线，AI 每日为你定制最合理的复习与新知比例。</p>
      </>
    ),
  },
  {
    step: "4",
    title: "深度复习",
    icon: Sparkles,
    dark: true,
    body: (
      <div className="relative py-4">
        <div className="absolute left-0 top-0 h-full w-full translate-x-2 translate-y-2 rounded-2xl bg-blue-500/20" />
        <div className="relative rounded-2xl bg-white p-6 text-slate-800 shadow-xl">
          <span className="mb-1 block text-sm font-bold text-blue-600">Pick up useful expressions</span>
          <p className="text-xs text-slate-400">在语境中自然习得实用表达</p>
          <Link
            href="/review"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
          >
            开始复习
          </Link>
        </div>
      </div>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="bg-white text-[#1d1d1f]">
      <section className="mx-auto max-w-7xl px-5 pb-10 pt-16 text-center sm:px-8 sm:pb-14 sm:pt-24 lg:px-12">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#86868b] sm:text-sm">
          {appCopy.marketing.heroEyebrow}
        </p>
        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-extrabold leading-[1.16] tracking-normal sm:text-5xl lg:text-6xl">
          不是死记硬背，
          <br className="hidden sm:block" />
          而是
          <span className="text-[#007aff]">在语境里真正理解</span>
          。
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#86868b] sm:text-lg">
          {appCopy.marketing.heroSubtitle}
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/scenes"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-8 py-3 text-base font-semibold text-white shadow-[0_10px_20px_rgba(0,122,255,0.2)] transition hover:bg-[#005fc8] sm:text-lg"
          >
            {appCopy.marketing.primaryCta}
            <ArrowRight className="size-5" />
          </Link>
          <Link
            href="#demo"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#007aff] px-8 py-3 text-base font-semibold text-[#007aff] transition hover:bg-[#e5f1ff] sm:text-lg"
          >
            {appCopy.marketing.secondaryCta}
          </Link>
          <Link
            href={trialHref}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1d1d1f] px-8 py-3 text-base font-semibold text-[#1d1d1f] transition hover:bg-[#f2f2f7] sm:text-lg"
          >
            免登录试用
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:gap-8 lg:px-12">
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="rounded-3xl border border-[#f0f0f0] bg-white p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] sm:p-8"
          >
            <p className="text-3xl font-extrabold leading-tight text-[#1d1d1f]">{value}</p>
            <p className="mt-2 text-sm text-[#86868b]">{label}</p>
          </div>
        ))}
      </section>

      <section className="bg-[#f5f7fa] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-sm font-semibold text-[#007aff]">语境内即时理解</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal text-[#1d1d1f] sm:text-4xl">
              课程内点选短语示例
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#86868b] sm:text-[17px]">
              阅读过程中无需跳转，右侧即可查看解释并加入复习。让阅读节奏不被中断，把“看懂”推进到“会用”。
            </p>
            <div className="mt-7 grid gap-3">
              {featureItems.map(([Icon, title, description]) => (
                <div key={title} className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e5f1ff] text-[#007aff]">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-left">
                    <span className="block text-base font-bold text-[#1d1d1f]">{title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#86868b]">{description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border-[8px] border-[#1d1d1f] bg-white p-5 shadow-[0_30px_60px_rgba(0,0,0,0.1)] sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#1d1d1f] px-4 py-2 text-sm font-semibold text-white">
              as soon as
              <Volume2 className="size-4" />
            </div>
            <div className="mt-4 rounded-2xl bg-[#f2f2f7] p-5">
              <p className="text-sm font-bold text-[#1d1d1f]">中文释义</p>
              <p className="mt-2 text-base font-semibold text-[#007aff]">一......就......；立刻在某个动作之后</p>
              <p className="mt-4 text-sm font-bold text-[#1d1d1f]">用法讲解</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">用于连接两个动作，强调后一个动作几乎立刻发生。</p>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-[#c7c7cc] bg-white p-5">
              <p className="text-sm italic leading-7 text-[#1d1d1f]">
                &ldquo;I get up <strong>as soon as</strong> my alarm goes off.&rdquo;
              </p>
            </div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007aff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#005fc8]">
              <Check className="size-4" />
              加入收藏复习
            </button>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold text-[#007aff]">完整学习流</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal text-[#1d1d1f] sm:text-4xl">
            从看懂一句话，到沉淀一组表达
          </h2>
          <p className="mt-4 text-base leading-8 text-[#86868b]">
            演示不再单独放一个页面，而是嵌在首页的产品语境里：你看到的是同一条学习链路如何继续推进。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {demoCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.step}
                className={[
                  "group relative overflow-hidden rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.02)]",
                  card.dark ? "border-slate-900 bg-slate-900 text-white" : "border-[#edf2f7] bg-white",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-10 transition-opacity group-hover:opacity-20">
                  <Icon className="size-16" aria-hidden="true" />
                </div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {card.step}
                  </span>
                  <h3 className={card.dark ? "font-bold text-white" : "font-bold text-slate-800"}>{card.title}</h3>
                </div>
                {card.body}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-12">
        <h2 className="text-3xl font-extrabold tracking-normal sm:text-4xl">极简的学习闭环</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#86868b]">
          从阅读到复习的每一步都轻量、可持续，让关键表达自然留在长期记忆里。
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([step, title, description]) => (
            <div
              key={step}
              className="rounded-3xl bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
            >
              <p className="text-sm font-extrabold text-[#007aff]">{step}</p>
              <h3 className="mt-3 text-lg font-bold tracking-normal text-[#1d1d1f]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#86868b]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
