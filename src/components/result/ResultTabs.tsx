"use client";

import type { TabKey } from "@/types";

type ResultTabsProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "order", label: "审查顺序" },
  { key: "risk", label: "风险列表" },
  { key: "suggestion", label: "Review 建议" },
  { key: "testGap", label: "测试缺口" },
  { key: "draft", label: "评论草稿" },
  { key: "markdown", label: "Markdown 报告" },
];

export function ResultTabs({ activeTab, onTabChange }: ResultTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === tab.key
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
              : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
