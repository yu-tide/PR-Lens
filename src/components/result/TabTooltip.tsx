"use client";

import type { ReactNode } from "react";

type TabTooltipProps = { children: ReactNode; align?: "left" | "center" | "right" };

export function TabTooltip({ children, align = "center" }: TabTooltipProps) {
  const alignClass = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrowClass = align === "left" ? "left-6" : align === "right" ? "right-6" : "left-1/2 -translate-x-1/2";

  return (
    <span className={`pointer-events-none absolute top-full z-[160] mt-2.5 w-56 rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-left text-xs leading-5 text-slate-700 opacity-0 shadow-[0_18px_46px_rgba(15,23,42,0.18)] ring-1 ring-blue-50 transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 ${alignClass}`}>
      <span className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-blue-100 bg-white shadow-sm ${arrowClass}`} />
      <span className="relative block">{children}</span>
    </span>
  );
}
