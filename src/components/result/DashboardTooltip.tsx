"use client";

import type { ReactNode } from "react";

type DashboardTooltipProps = {
  children: ReactNode;
  placement?: "top" | "bottom" | "left";
};

export function DashboardTooltip({ children, placement = "top" }: DashboardTooltipProps) {
  const placementClass =
    placement === "left" ? "right-full top-1/2 mr-3 -translate-y-1/2"
    : placement === "bottom" ? "left-1/2 top-full mt-3 -translate-x-1/2"
    : "bottom-full left-1/2 mb-3 -translate-x-1/2";

  const arrowClass =
    placement === "left" ? "-right-1.5 top-1/2 -translate-y-1/2 rotate-45"
    : placement === "bottom" ? "-top-1.5 left-1/2 -translate-x-1/2 rotate-45"
    : "-bottom-1.5 left-1/2 -translate-x-1/2 rotate-45";

  return (
    <span className={`pointer-events-none absolute z-[120] w-64 rounded-[20px] border border-blue-100 bg-white px-3.5 py-3 text-left text-xs leading-5 text-slate-700 opacity-0 shadow-[0_22px_60px_rgba(15,23,42,0.20)] ring-1 ring-blue-50 transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 ${placementClass}`}>
      <span className={`absolute h-3 w-3 border border-blue-100 bg-white shadow-sm ${arrowClass}`} />
      <span className="relative block">{children}</span>
    </span>
  );
}
