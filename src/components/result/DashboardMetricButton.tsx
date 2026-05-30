"use client";

import type { ReactNode } from "react";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type DashboardMetricButtonProps = {
  label: string; value: ReactNode; description: string; onClick: () => void;
};

export function DashboardMetricButton({
  label, value, description, onClick,
}: DashboardMetricButtonProps) {
  return (
    <button type="button" onClick={onClick}
      className="group relative z-0 flex min-h-[36px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="text-base font-semibold text-slate-950">{value}</span>
      <DashboardTooltip placement="left">{description}</DashboardTooltip>
    </button>
  );
}
