"use client";

import { SparkIcon } from "@/components/icons";

type SummaryCardProps = { summary: string[] };

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <section className="group relative mt-auto flex min-h-[210px] flex-1 flex-col rounded-[28px] border border-slate-300 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <SparkIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-950">
              结论摘要
            </h2>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
        {summary.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      <div className="pointer-events-none absolute -right-12 -top-10 h-36 w-36 rounded-full bg-blue-50 blur-2xl" />
    </section>
  );
}
