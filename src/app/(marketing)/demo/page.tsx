import Link from "next/link";
import {
  CalendarCheck,
  Highlighter,
  Map,
  Sparkles,
} from "lucide-react";

const demoCards = [
  {
    step: "1",
    title: "场景选择",
    icon: Map,
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
              <span className="text-[10px] text-blue-400 uppercase">{label}</span>
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

export default function DemoPage() {
  return (
    <div className="bg-[#fcfdfe] text-slate-900">
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <section className="mb-16 space-y-4 text-center sm:mb-20">
          <span className="inline-flex rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold tracking-widest text-blue-600 uppercase">
            Interactive Preview
          </span>
          <h1 className="text-4xl font-black tracking-normal text-slate-900 md:text-5xl">沉浸式学习流演示</h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500">
            跳过死记硬背。从真实场景出发，通过 chunking 记忆法将碎片知识转化为你的直觉语言。
          </p>
        </section>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
        </section>

        <section className="mt-24 rounded-[3rem] bg-blue-600 p-8 text-center text-white shadow-2xl shadow-blue-200 sm:mt-32 sm:p-12">
          <h2 className="mb-6 text-3xl font-bold tracking-normal">准备好开始你的结构化记忆之旅了吗？</h2>
          <div className="flex flex-col justify-center gap-4 md:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-10 py-4 font-bold text-blue-600 shadow-lg transition-all hover:bg-blue-50"
            >
              免费注册
            </Link>
            <Link
              href="/scenes"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-blue-400 bg-blue-500 px-10 py-4 font-bold text-white transition-all hover:bg-blue-400"
            >
              查看详细功能
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
