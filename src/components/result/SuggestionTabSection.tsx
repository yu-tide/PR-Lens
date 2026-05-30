"use client";

import { SuggestionIcon } from "@/components/result/SuggestionIcon";

type Suggestion = { icon: string; title: string; description: string };
type Props = { suggestions: Suggestion[] };

export function SuggestionTabSection({ suggestions }: Props) {
  return (
    <section className="h-full overflow-auto pr-1">
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
        {suggestions.map((s, index) => (
          <div key={s.title} className="flex items-center gap-4 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50">
            <SuggestionIcon name={s.icon} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  Confidence {Math.max(66, 88 - index * 5)}%
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{s.description}</p>
            </div>
            <span className="text-lg text-slate-300">›</span>
          </div>
        ))}
      </div>
    </section>
  );
}
