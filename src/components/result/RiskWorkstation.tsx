"use client";

import { useState } from "react";
import type { ReviewFindingDisplay } from "@/types";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { RiskDetailBlock } from "@/components/result/RiskDetailBlock";

type Props = {
  findings: ReviewFindingDisplay[];
  onAddToDraft: (finding: ReviewFindingDisplay) => void;
};

function getRiskLabel(level: string): string {
  return { high: "高风险", medium: "中风险", low: "低风险" }[level] ?? level;
}

export function RiskWorkstation({ findings, onAddToDraft }: Props) {
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? null);

  const selected = findings.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── 工作台主体 ─────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* ── 左侧：风险索引列表 ───────────────────────── */}
        <aside className="flex w-[280px] shrink-0 flex-col gap-2 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
          {findings.map((finding) => {
            const isActive = finding.id === selectedId;

            return (
              <button
                key={finding.id}
                type="button"
                onClick={() => setSelectedId(finding.id)}
                className={`rounded-xl px-3.5 py-3 text-left transition ${
                  isActive
                    ? "bg-blue-50 ring-1 ring-blue-200 shadow-sm"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PriorityBadge
                    level={finding.level}
                    label={getRiskLabel(finding.level)}
                  />
                  {finding.category && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      {finding.category}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1.5 line-clamp-2 text-sm font-semibold leading-5 ${
                    isActive ? "text-blue-800" : "text-slate-800"
                  }`}
                >
                  {finding.title}
                </p>

                {isActive && (
                  <span className="mt-2 inline-block text-[11px] font-medium text-blue-600">
                    当前查看 →
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* ── 右侧：详情 ───────────────────────────────── */}
        <section className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <RiskDetailBlock finding={selected} />
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    当前风险可加入评论草稿，合并前建议 reviewer 复核。
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddToDraft(selected)}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    加入草稿箱
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              请从左侧选择一个风险项
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
