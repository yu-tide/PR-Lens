"use client";

import type { ReviewFindingDisplay } from "@/types";

// ── RiskCard ───────────────────────────────────────────

type RiskCardProps = {
  risk: ReviewFindingDisplay;
  onAddToDraft: (finding: ReviewFindingDisplay) => void;
};

export function RiskCard({ risk, onAddToDraft }: RiskCardProps) {
  const styles = {
    high: { card: "border-red-300 bg-red-50 shadow-red-100/80", badge: "bg-red-100 text-red-700 ring-red-200" },
    medium: { card: "border-amber-300 bg-amber-50 shadow-amber-100/80", badge: "bg-amber-100 text-amber-700 ring-amber-200" },
    low: { card: "border-emerald-300 bg-emerald-50 shadow-emerald-100/80", badge: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  }[risk.level];

  return (
    <article className={`rounded-2xl border p-4 shadow-md ${styles.card}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>{risk.label}</span>
        <h3 className="text-base font-bold text-slate-950">{risk.title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{risk.description}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        <span className="font-semibold text-slate-800">建议：</span>
        {risk.suggestion}
      </p>

      {risk.evidence.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-700">Evidence</p>
          <div className="mt-3 space-y-3">
            {risk.evidence.map((item, index) => (
              <div key={`${item.file}-${item.line}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* 文件路径 + 行号（静态文本） */}
                <p className="break-all font-mono text-xs font-bold text-slate-800">
                  {item.file}
                  {item.line ? ` · 第 ${item.line} 行` : ""}
                </p>

                {/* 代码行（静态展示） */}
                {item.code && (
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-700">
                    {item.code}
                  </pre>
                )}

                {/* 说明原因 */}
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {risk.needsHumanCheck && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <span className="font-semibold">⚠ 需要人工确认：</span>该建议依赖上下文判断，合并前建议 reviewer 复核。
        </p>
      )}

      <button type="button" onClick={() => onAddToDraft(risk)}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
        加入草稿箱
      </button>
    </article>
  );
}
