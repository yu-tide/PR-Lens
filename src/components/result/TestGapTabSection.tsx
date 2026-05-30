"use client";

import type { TestGapDisplay } from "@/types";
import { CheckIcon } from "@/components/icons";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { getRiskLabel } from "@/utils/review-helpers";

type Props = { gaps: TestGapDisplay[] };
export function TestGapTabSection({ gaps }: Props) {
  return (<section className="h-full overflow-auto pr-1"><div className="grid gap-4 2xl:grid-cols-2">{gaps.map((gap) => (<article key={gap.id} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"><div className="flex flex-wrap items-center gap-2"><PriorityBadge level={gap.severity} label={getRiskLabel(gap.severity)} /><p className="text-sm font-semibold text-slate-950">潜在测试缺口</p></div><p className="mt-3 break-all font-mono text-sm text-slate-700">{gap.sourceFile}</p><p className="mt-2 text-sm leading-6 text-slate-600">{gap.reason}</p><div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-xs font-semibold text-slate-600">建议测试文件</p><p className="mt-1 break-all font-mono text-xs text-slate-500">{gap.expectedTestFile}</p></div><div className="mt-3"><p className="text-xs font-semibold text-slate-700">建议补充用例</p><ul className="mt-1.5 space-y-1">{gap.suggestedTestCases.map((item) => (<li key={item} className="flex gap-2 text-xs leading-5 text-slate-500"><CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>{item}</span></li>))}</ul></div></article>))}</div></section>);
}
