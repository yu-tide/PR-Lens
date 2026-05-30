"use client";

import type { ReviewFindingDisplay } from "@/types";
import { RiskCard } from "@/components/result/RiskCard";

type Props = { findings: ReviewFindingDisplay[]; onAddToDraft: (f: ReviewFindingDisplay) => void };

export function RiskTabSection({ findings, onAddToDraft }: Props) {
  return (
    <section className="h-full overflow-auto pr-1">
      <div className="grid gap-4 2xl:grid-cols-3">
        {findings.map((risk) => (
          <RiskCard key={risk.id} risk={risk} onAddToDraft={onAddToDraft} />
        ))}
      </div>
    </section>
  );
}
