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

export function ResultDashboard({
  data,
  overview,
  onNavigate,
}: ResultDashboardProps) {
  const riskTone =
    overview.riskLevel === "high"
      ? "red"
      : overview.riskLevel === "medium"
        ? "amber"
        : "emerald";

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white text-blue-600 shadow-sm">
          <ShieldIcon className="h-4 w-4" />
        </span>

        <h2 className="text-base font-semibold tracking-tight text-slate-950">
          审查数据看板
        </h2>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-2 xl:grid-cols-[1.25fr_0.9fr_1.05fr_0.72fr]">
        {/* Column 1 */}
        <div className="grid gap-2">
          <DashboardKpiCard
            label="风险评分"
            value={
              <span>
                {overview.riskScore}
                <span className="ml-1 text-sm font-semibold text-slate-400">
                  /100
                </span>
              </span>
            }
            description={overview.riskLabel}
            tone={riskTone}
            variant="hero"
            progress={overview.riskScore}
            onClick={() => onNavigate("risk")}
          />

          <div className="grid grid-cols-3 gap-2">
            <DashboardKpiCard
              label="风险项"
              value={data.totalRiskCount}
              description={`${data.highRiskCount} 高 · ${data.mediumRiskCount} 中`}
              tone={
                data.highRiskCount > 0
                  ? "red"
                  : data.mediumRiskCount > 0
                    ? "amber"
                    : "emerald"
              }
              onClick={() => onNavigate("risk")}
            />

            <DashboardKpiCard
              label="建议"
              value={data.suggestionCount}
              description="待处理"
              tone="blue"
              onClick={() => onNavigate("suggestion")}
            />

            <DashboardKpiCard
              label="置信度"
              value={`${overview.confidence}%`}
              description="平均"
              tone="emerald"
              onClick={() => onNavigate("risk")}
            />
          </div>
        </div>

        {/* Column 2 */}
        <RiskDonutChart data={data} onClick={() => onNavigate("risk")} />

        {/* Column 3 */}
        <ChangeBarChart
          additions={data.additions}
          deletions={data.deletions}
          changedFileCount={data.changedFileCount}
          totalChanges={data.totalChanges}
          onClick={() => onNavigate("preRule")}
        />

        {/* Column 4 */}
        <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
          <DashboardMetricButton
            label="测试缺口"
            value={data.testGapCount}
            description="需补充"
            onClick={() => onNavigate("testGap")}
          />

          <DashboardMetricButton
            label="证据"
            value={data.evidenceCount}
            description="条证据"
            onClick={() => onNavigate("risk")}
          />

          <DashboardMetricButton
            label="草稿"
            value={data.draftCommentCount}
            description="评论草稿"
            onClick={() => onNavigate("draft")}
          />
        </div>
      </div>
    </div>
  );
}