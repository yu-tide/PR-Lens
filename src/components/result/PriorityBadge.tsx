"use client";

type PriorityBadgeProps = { level: "high" | "medium" | "low"; label: string };

export function PriorityBadge({ level, label }: PriorityBadgeProps) {
  const styles = {
    high: "bg-red-100 text-red-700 ring-red-200",
    medium: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  }[level];

  return (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>
      {label}
    </span>
  );
}
