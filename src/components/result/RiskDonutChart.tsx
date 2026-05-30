"use client";

import type { DashboardData } from "@/types";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type RiskDonutChartProps = { data: DashboardData; onClick: () => void };

export function RiskDonutChart({ data, onClick }: RiskDonutChartProps) {
  const total = data.totalRiskCount;
  const highDeg = total > 0 ? (data.highRiskCount / total) * 360 : 0;
  const mediumDeg = total > 0 ? (data.mediumRiskCount / total) * 360 : 0;
  const chartBackground = total > 0
    ? `conic-gradient(#ef4444 0deg ${highDeg}deg, #f59e0b ${highDeg}deg ${highDeg + mediumDeg}deg, #10b981 ${highDeg + mediumDeg}deg 360deg)`
    : "conic-gradient(#e2e8f0 0deg 360deg)";

  return (
    <button type="button" onClick={onClick}
      className="group relative z-0 flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left shadow-inner transition hover:z-30 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-1.5 shadow-sm"
        style={{ background: chartBackground }}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
          <span className="text-sm font-bold text-slate-950">{total}</span>
          <span className="text-[8px] font-semibold text-slate-400">风险项</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-700">风险构成</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          高 {data.highRiskCount} · 中 {data.mediumRiskCount} · 低 {data.lowRiskCount}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-blue-600">点击查看风险分析</p>
      </div>
      <DashboardTooltip placement="top">
        风险构成：高风险 {data.highRiskCount} 项，中风险 {data.mediumRiskCount} 项，低风险 {data.lowRiskCount} 项。点击查看风险分析。
      </DashboardTooltip>
    </button>
  );
}
