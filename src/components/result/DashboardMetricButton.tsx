"use client";

import type { ReactNode } from "react";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type DashboardMetricButtonProps = {
  label: string;
  value: ReactNode;
  description: string;
  onClick: () => void;
};

export function DashboardMetricButton({
  label,
  value,
  description,
  onClick,
}: DashboardMetricButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative z-0 flex min-h-[32px] flex-col justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {label}
      </span>

      <span className="mt-1 text-lg font-bold leading-none text-slate-950">
        {value}
      </span>

      <span className="mt-0.5 truncate text-[10px] leading-none text-slate-400">
        {description}
      </span>

      <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-blue-500 transition-all duration-200 group-hover:w-full" />

      <DashboardTooltip placement="left">
        {label}：{description}
      </DashboardTooltip>
    </button>
  );
}