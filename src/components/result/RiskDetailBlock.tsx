"use client";

import type { ReviewFindingDisplay } from "@/types";
import { ConfidenceBar } from "@/components/result/ConfidenceBar";

type Props = { finding: ReviewFindingDisplay };

const SECTION_CLASS =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function RiskDetailBlock({ finding }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* ── 发现的问题 ─────────────────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-700">发现的问题</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {finding.description}
        </p>
      </section>

      {/* ── 为什么有风险 / 影响范围 ────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-700">
          为什么有风险 / 影响范围
        </h3>

        <div className="mt-3 space-y-3">
          {finding.evidence.map((item, index) => (
            <div
              key={`${item.file}-${item.line}-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="break-all font-mono text-xs font-semibold text-slate-700">
                {item.file}
                {item.line ? ` · 第 ${item.line} 行` : ""}
              </p>

              {item.code && (
                <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-700 border-l-2 border-l-blue-400">
                  {item.code}
                </pre>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {item.reason}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 建议处理 ──────────────────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-700">建议处理</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {finding.suggestion}
        </p>
      </section>

      {/* ── 置信度 + 人工确认 ─────────────────────────── */}
      <section className={SECTION_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              分析置信度
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              AI 对该风险判断的确定程度
            </p>
          </div>
          <ConfidenceBar value={finding.confidence} />
        </div>

        {finding.needsHumanCheck && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800">
              ⚠ 需要人工确认
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              该建议依赖上下文判断，合并前建议 reviewer 复核。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
