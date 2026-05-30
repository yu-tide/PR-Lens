"use client";

import { ChartIcon } from "@/components/icons";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type ChangeBarChartProps = {
  additions: number; deletions: number; changedFileCount: number;
  totalChanges: number; onClick: () => void;
};

export function ChangeBarChart({
  additions, deletions, changedFileCount, totalChanges, onClick,
}: ChangeBarChartProps) {
  const max = Math.max(additions, deletions, 1);
  const additionPercent = Math.max(8, Math.round((additions / max) * 100));
  const deletionPercent = Math.max(8, Math.round((deletions / max) * 100));

  return (
    <button type="button" onClick={onClick}
      className="group relative z-0 flex min-h-[76px] flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left shadow-inner transition hover:z-30 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">代码变更</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{changedFileCount} 个文件 · 共 {totalChanges} 行</p>
        </div>
        <ChartIcon className="h-4.5 w-4.5 text-blue-500" />
      </div>
      <div className="mt-1.5 space-y-1">
        <div>
          <div className="mb-0.5 flex justify-between text-[11px] font-semibold text-emerald-600">
            <span>新增</span><span>+{additions}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${additionPercent}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-0.5 flex justify-between text-[11px] font-semibold text-red-500">
            <span>删除</span><span>-{deletions}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-red-100">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${deletionPercent}%` }} />
          </div>
        </div>
      </div>
      <DashboardTooltip placement="top">
        代码变更规模：{changedFileCount} 个文件，新增 {additions} 行，删除 {deletions} 行。点击查看智能审查顺序。
      </DashboardTooltip>
    </button>
  );
}
