"use client";

type ConfidenceBarProps = { value: number };

export function ConfidenceBar({ value }: ConfidenceBarProps) {
  const tone =
    value >= 80 ? "bg-emerald-500"
    : value >= 60 ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600">{value}%</span>
    </div>
  );
}
