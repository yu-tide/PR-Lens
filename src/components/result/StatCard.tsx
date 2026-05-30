"use client";

import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  onClick?: () => void;
  hint?: string;
};

export function StatCard({
  icon, label, value, valueClassName = "text-slate-950", onClick, hint,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-600 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`mt-1 truncate text-base font-semibold ${valueClassName}`}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
      >
        {content}
        <span className="text-lg text-slate-300">›</span>
      </button>
    );
  }

  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
      {content}
    </div>
  );
}
