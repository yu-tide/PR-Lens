"use client";

import type { ReactNode } from "react";

type SectionTitleProps = {
  icon: ReactNode;
  title: string;
  description?: string;
};

export function SectionTitle({ icon, title, description }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}
