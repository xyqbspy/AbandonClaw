import { ReactNode } from "react";

// 从 src/components/shared/page-header.tsx 整体迁来，仅服务 /admin 子域。
// 原 variant="default" 分支没有真实使用方，本轮移除；只保留 admin 样式。
// 学习工作台如果未来需要相似 header，应单独抽 shared 组件，不要复用本组件。
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
