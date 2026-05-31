"use client";

import type { ReactNode } from "react";
import { DashboardTooltip } from "@/components/result/DashboardTooltip";

type DashboardKpiCardProps = {
  label: string;
  value: ReactNode;
  description: string;
  tone?: "red" | "amber" | "emerald" | "blue";
  onClick?: () => void;
  variant?: "default" | "hero";
  progress?: number;
};

export function DashboardKpiCard({
  label,
  value,
  description,
  tone = "blue",
  onClick,
  variant = "default",
  progress,
}: DashboardKpiCardProps) {
  const isHero = variant === "hero";

  const toneStyles = {
    red: {
      value: "text-red-600",
      border: "border-red-100",
      bg: "bg-gradient-to-br from-red-50/80 via-white to-white",
      badge: "bg-red-100/80 text-red-700 ring-red-200/70",
      track: "bg-red-100/60",
      bar: "bg-red-500",
      glow: "bg-red-400/10",
    },
    amber: {
      value: "text-amber-600",
      border: "border-amber-100",
      bg: "bg-gradient-to-br from-amber-50/90 via-white to-white",
      badge: "bg-amber-100/90 text-amber-700 ring-amber-200/70",
      track: "bg-amber-100/70",
      bar: "bg-amber-500",
      glow: "bg-amber-400/10",
    },
    emerald: {
      value: "text-emerald-600",
      border: "border-emerald-100",
      bg: "bg-gradient-to-br from-emerald-50/80 via-white to-white",
      badge: "bg-emerald-100/80 text-emerald-700 ring-emerald-200/70",
      track: "bg-emerald-100/60",
      bar: "bg-emerald-500",
      glow: "bg-emerald-400/10",
    },
    blue: {
      value: "text-blue-600",
      border: "border-blue-100",
      bg: "bg-gradient-to-br from-blue-50/80 via-white to-white",
      badge: "bg-blue-100/80 text-blue-700 ring-blue-200/70",
      track: "bg-blue-100/60",
      bar: "bg-blue-500",
      glow: "bg-blue-400/10",
    },
  }[tone];

  const safeProgress =
    typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : 0;

  const cardClass = [
    "group relative z-0 flex w-full flex-col overflow-hidden rounded-xl border text-left shadow-sm transition",
    "hover:z-30 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
    "focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
    isHero
      ? `${toneStyles.border} ${toneStyles.bg} gap-2 px-3 py-2.5`
      : "border-slate-200/80 bg-white gap-1 px-2.5 py-2 hover:bg-slate-50/60",
  ].join(" ");

  const content = isHero ? (
    <>
      <span
        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl ${toneStyles.glow}`}
      />

      <div className="relative flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${toneStyles.badge}`}
        >
          {description}
        </span>
      </div>

      <span
        className={`relative text-3xl font-bold leading-none tracking-tight ${toneStyles.value}`}
      >
        {value}
      </span>

      <div
        className={`relative h-1.5 w-full overflow-hidden rounded-full ${toneStyles.track}`}
      >
        <div
          className={`h-full rounded-full ${toneStyles.bar}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </>
  ) : (
    <>
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {label}
      </span>

      <span
        className={`text-lg font-bold leading-none tracking-tight ${toneStyles.value}`}
      >
        {value}
      </span>

      <span className="truncate text-[10px] leading-none text-slate-400">
        {description}
      </span>

      <span
        className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full ${toneStyles.bar}`}
      />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClass}>
        {content}

        <DashboardTooltip placement={isHero ? "bottom" : "top"}>
          {label}：{description}
        </DashboardTooltip>
      </button>
    );
  }

  return <article className={cardClass}>{content}</article>;
}