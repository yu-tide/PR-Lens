"use client";

import { ChartIcon } from "@/components/icons";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type ChangeBarChartProps = {
  additions: number;
  deletions: number;
  changedFileCount: number;
  totalChanges: number;
  onClick: () => void;
};

export function ChangeBarChart({
  additions,
  deletions,
  changedFileCount,
  totalChanges,
  onClick,
}: ChangeBarChartProps) {
  const max = Math.max(additions, deletions, 1);
  const additionPercent = Math.max(6, Math.round((additions / max) * 100));
  const deletionPercent = Math.max(6, Math.round((deletions / max) * 100));

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative z-0 flex h-full min-h-[112px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-200/30 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500">代码变更</p>

          <p className="mt-1 text-2xl font-bold leading-none text-slate-950">
            {changedFileCount}
            <span className="ml-1 text-xs font-medium text-slate-400">
              文件
            </span>
          </p>
        </div>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <ChartIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="relative space-y-1.5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">
              新增
            </span>

            <span className="text-sm font-bold leading-none text-emerald-600">
              +{additions}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-emerald-50">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${additionPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">
              删除
            </span>

            <span className="text-sm font-bold leading-none text-red-500">
              -{deletions}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-red-50">
            <div
              className="h-full rounded-full bg-red-500"
              style={{ width: `${deletionPercent}%` }}
            />
          </div>
        </div>
      </div>

      <p className="relative text-[10px] leading-none text-slate-400">
        共 {totalChanges} 行变更
      </p>

      <DashboardTooltip placement="top">
        代码变更规模：{changedFileCount} 个文件，新增 {additions} 行，删除 {deletions} 行。点击查看预规则分析。
      </DashboardTooltip>
    </button>
  );
}