"use client";

import type { ReviewFindingDisplay } from "@/types";

// ============================================================
// RiskDetailBlock
// ============================================================

type Props = { finding: ReviewFindingDisplay };

const SECTION_CLASS =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function RiskDetailBlock({ finding }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* ── 发现的问题 ─────────────────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-800">发现的问题</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {finding.description}
        </p>
      </section>

      {/* ── 为什么有风险 / 影响范围 ────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-800">
          为什么有风险 / 影响范围
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {finding.description}
        </p>
      </section>

      {/* ── 证据定位 ────────────────────────────────────── */}
      <section className={SECTION_CLASS}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">
            证据定位
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {finding.evidence.length} 条
          </span>
        </div>

        <div className="mt-3">
          {finding.evidence.length > 0 ? (
            <div className="space-y-3">
              {finding.evidence.map((item, index) => (
                <div
                  key={`${item.file}-${item.line}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="grid gap-2 text-xs">
                    {/* 涉及文件 */}
                    <div>
                      <p className="font-semibold text-slate-500">涉及文件</p>
                      <p className="mt-1 break-all font-mono font-bold text-slate-800">
                        {item.file}
                      </p>
                    </div>

                    {/* 命中位置 */}
                    {item.line && (
                      <div>
                        <p className="font-semibold text-slate-500">命中位置</p>
                        <p className="mt-1 font-mono font-bold text-slate-800">
                          第 {item.line} 行
                        </p>
                      </div>
                    )}

                    {/* 命中代码 */}
                    {item.code && (
                      <div>
                        <p className="font-semibold text-slate-500">命中代码</p>
                        <pre className="mt-1 overflow-x-auto rounded-lg border border-blue-100 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-700 shadow-sm">
                          {item.code}
                        </pre>
                      </div>
                    )}

                    {/* 说明 */}
                    <p className="leading-5 text-slate-500">
                      {item.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              暂无明确代码证据，建议结合 PR diff 人工确认。
            </p>
          )}
        </div>
      </section>

      {/* ── 建议处理 ──────────────────────────────────── */}
      <section className={SECTION_CLASS}>
        <h3 className="text-sm font-semibold text-slate-800">建议处理</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {finding.suggestion}
        </p>
      </section>

      {/* ── 人工确认 ──────────────────────────────────── */}
      {finding.needsHumanCheck && (
        <section className={SECTION_CLASS}>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800">
              ⚠ 需要人工确认
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              该建议依赖上下文判断，合并前建议 reviewer 复核。
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
