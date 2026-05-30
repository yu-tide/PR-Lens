"use client";

import type { RuleCheckResult } from "@/types";
import type { ReviewOrderItem } from "@/utils/result-fallbacks";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { getRiskLabel, normalizeRiskLevel } from "@/utils/review-helpers";
import { INNER_CARD_CLASS, SUBTLE_PANEL_CLASS } from "@/utils/result-fallbacks";

type OrderTabSectionProps = {
  ruleCheckResults: RuleCheckResult[];
  reviewOrder: ReviewOrderItem[];
};

export function OrderTabSection({ ruleCheckResults, reviewOrder }: OrderTabSectionProps) {
  return (
    <section className="h-full overflow-auto pr-1">
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        {/* 审查依据 */}
        <div className={INNER_CARD_CLASS}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">审查依据</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                汇总基础规则命中结果，用于解释为什么这些文件需要优先审查。
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              {ruleCheckResults.length} 项
            </span>
          </div>
          {ruleCheckResults.length === 0 ? (
            <div className={`${SUBTLE_PANEL_CLASS} px-5 py-5 text-center`}>
              <p className="text-sm font-medium text-slate-600">
                未发现明显基础规则风险
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                当前优先级将根据默认风险路径、影响范围与建议项生成。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ruleCheckResults.map((rule) => {
                const level = normalizeRiskLevel(rule.severity);
                const severityStyle = {
                  high: "border-red-300 bg-red-50 shadow-red-100/80",
                  medium: "border-amber-300 bg-amber-50 shadow-amber-100/80",
                  low: "border-emerald-300 bg-emerald-50 shadow-emerald-100/80",
                }[level];
                return (
                  <article key={rule.id} className={`rounded-2xl border p-4 shadow-sm ${severityStyle}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge level={level} label={getRiskLabel(level)} />
                      <h3 className="text-sm font-semibold text-slate-950">{rule.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{rule.message}</p>
                    {(rule.file || rule.line) && (
                      <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                        {rule.file ?? ""}
                        {rule.file && rule.line ? " · " : ""}
                        {rule.line ? `第 ${rule.line} 行` : ""}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* 优先审查顺序 */}
        <div className={INNER_CARD_CLASS}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">优先审查顺序</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                建议从高风险、高影响面的文件开始 Review，降低遗漏关键问题的概率。
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
              {reviewOrder.length} 个文件
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
            {reviewOrder.map((item, index) => (
              <div
                key={`${item.file}-${item.title}`}
                className="flex items-start gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 hover:bg-slate-50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-200">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.file}</p>
                    <PriorityBadge level={item.severity} label={getRiskLabel(item.severity)} />
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-600">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
