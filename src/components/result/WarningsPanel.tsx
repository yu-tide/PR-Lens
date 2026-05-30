"use client";

import type { AppError } from "@/types";

type WarningsPanelProps = {
  warnings: AppError[];
};

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-xl shadow-slate-200/70">
      <p className="text-sm font-semibold text-amber-800">
        当前结果包含降级提示
      </p>
      <ul className="mt-2 space-y-1.5">
        {warnings.map((w, i) => (
          <li key={i} className="text-sm text-amber-700">
            {w.message}
            {w.action && (
              <span className="ml-2 text-xs text-amber-600">
                — {w.action}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
