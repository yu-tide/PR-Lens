"use client";

import type { DashboardData } from "@/types";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type RiskDonutChartProps = {
  data: DashboardData;
  onClick: () => void;
};

export function RiskDonutChart({ data, onClick }: RiskDonutChartProps) {
  const total = data.totalRiskCount;

  const segments = [
    {
      label: "高",
      value: data.highRiskCount,
      barClass: "bg-red-500",
      textClass: "text-red-600",
      bgClass: "bg-red-50/70",
    },
    {
      label: "中",
      value: data.mediumRiskCount,
      barClass: "bg-amber-500",
      textClass: "text-amber-600",
      bgClass: "bg-amber-50/70",
    },
    {
      label: "低",
      value: data.lowRiskCount,
      barClass: "bg-emerald-500",
      textClass: "text-emerald-600",
      bgClass: "bg-emerald-50/70",
    },
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative z-0 flex h-full min-h-[112px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-slate-200/40 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-slate-500">风险构成</p>

            <p className="mt-1 text-2xl font-bold leading-none text-slate-950">
              {total}
              <span className="ml-1 text-xs font-medium text-slate-400">
                项
              </span>
            </p>
          </div>

          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
            高 / 中 / 低
          </span>
        </div>

        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          {total > 0 ? (
            segments.map((item) =>
              item.value > 0 ? (
                <div
                  key={item.label}
                  className={item.barClass}
                  style={{ flexGrow: item.value }}
                />
              ) : null,
            )
          ) : (
            <div className="h-full w-full bg-slate-200" />
          )}
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-1.5">
        {segments.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg px-2 py-1 text-center ring-1 ring-slate-100 ${item.bgClass}`}
          >
            <p className={`text-sm font-bold leading-none ${item.textClass}`}>
              {item.value}
            </p>

            <p className="mt-0.5 text-[10px] leading-none text-slate-400">
              {item.label}风险
            </p>
          </div>
        ))}
      </div>

      <DashboardTooltip placement="top">
        风险构成：高风险 {data.highRiskCount} 项，中风险 {data.mediumRiskCount} 项，低风险{" "}
        {data.lowRiskCount} 项。点击查看风险分析。
      </DashboardTooltip>
    </button>
  );
}