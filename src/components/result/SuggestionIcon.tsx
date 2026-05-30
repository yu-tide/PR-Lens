"use client";

import { BeakerIcon, SettingsIcon, ChartIcon, FileIcon } from "@/components/icons";

type SuggestionIconProps = { name: string };

export function SuggestionIcon({ name }: SuggestionIconProps) {
  const className = "h-4.5 w-4.5";

  const icon =
    name === "beaker" ? <BeakerIcon className={className} />
    : name === "settings" ? <SettingsIcon className={className} />
    : name === "chart" ? <ChartIcon className={className} />
    : <FileIcon className={className} />;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm">
      {icon}
    </span>
  );
}
