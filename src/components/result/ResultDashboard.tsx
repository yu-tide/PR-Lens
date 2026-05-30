"use client";

import { ShieldIcon } from "@/components/icons";
import { ChangeBarChart } from "@/components/result/ChangeBarChart";
import { DashboardKpiCard } from "@/components/result/DashboardKpiCard";
import { DashboardMetricButton } from "@/components/result/DashboardMetricButton";
import { RiskDonutChart } from "@/components/result/RiskDonutChart";
import type { DashboardData, OverviewDisplay, TabKey } from "@/types";

type ResultDashboardProps = {
  data: DashboardData;
  overview: OverviewDisplay;
  onNavigate: (tab: TabKey) => void;
};

export function ResultDashboard({ data, overview, onNavigate }: ResultDashboardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <ShieldIcon className="h-4 w-4" />
          </span>
          <div><h2 className="text-lg font-semibold tracking-tight text-slate-950">审查数据看板</h2></div>
        </div>
      </div>
      <div className="grid gap-3 2xl:grid-cols-[1.05fr_0.95fr_1.1fr_0.72fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          <DashboardKpiCard label="风险评分"
            value={<span>{overview.riskScore}<span className="ml-1 text-xs font-semibold">/100</span></span>}
            description={overview.riskLabel}
            tone={overview.riskLevel === "high" ? "red" : overview.riskLevel === "medium" ? "amber" : "emerald"}
            onClick={() => onNavigate("risk")} />
          <DashboardKpiCard label="高风险项" value={overview.highRiskCount}
            description="需人工确认"
            tone={overview.highRiskCount > 0 ? "red" : "emerald"}
            onClick={() => onNavigate("risk")} />
          <DashboardKpiCard label="建议数量" value={overview.suggestionCount}
            description="可复制草稿" tone="blue"
            onClick={() => onNavigate("suggestion")} />
          <DashboardKpiCard label="平均置信度" value={`${overview.confidence}%`}
            description="AI 建议均值" tone="emerald"
            onClick={() => onNavigate("risk")} />
        </div>
        <RiskDonutChart data={data} onClick={() => onNavigate("risk")} />
        <ChangeBarChart additions={data.additions} deletions={data.deletions}
          changedFileCount={data.changedFileCount} totalChanges={data.totalChanges}
          onClick={() => onNavigate("order")} />
        <div className="grid gap-2 sm:grid-cols-3 2xl:grid-cols-1">
          <DashboardMetricButton label="测试缺口" value={data.testGapCount}
            description={`识别到 ${data.testGapCount} 个潜在测试缺口。点击查看测试缺口。`}
            onClick={() => onNavigate("testGap")} />
          <DashboardMetricButton label="证据" value={data.evidenceCount}
            description={`共聚合 ${data.evidenceCount} 条 evidence。点击查看风险证据。`}
            onClick={() => onNavigate("risk")} />
          <DashboardMetricButton label="草稿" value={data.draftCommentCount}
            description={`草稿箱中有 ${data.draftCommentCount} 条评论草稿。点击查看草稿箱。`}
            onClick={() => onNavigate("draft")} />
        </div>
      </div>
    </div>
  );
}
