"use client";

import type { ReactNode } from "react";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type DashboardKpiCardProps = {
  label: string; value: ReactNode; description: string;
  tone?: "red" | "amber" | "emerald" | "blue"; onClick?: () => void;
};

export function DashboardKpiCard({
  label, value, description, tone = "blue", onClick,
}: DashboardKpiCardProps) {
  const toneStyles = {
    red: "border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-50/80",
    amber: "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-50/80",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/80",
    blue: "border-blue-200 bg-blue-50/70 text-blue-600 hover:border-blue-300 hover:bg-blue-50/90",
  }[tone];

  const content = (
    <>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="mt-1 text-lg font-bold leading-none tracking-tight">{value}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className={`group relative z-0 flex min-h-[42px] flex-col rounded-xl border px-3 py-2 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30 ${toneStyles}`}>
        {content}
        <DashboardTooltip placement="bottom">{description}</DashboardTooltip>
      </button>
    );
  }

  return (
    <article className={`group relative z-0 flex min-h-[42px] flex-col rounded-xl border px-3 py-2 shadow-sm ${toneStyles}`}>
      {content}
    </article>
  );
}
