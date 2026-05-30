"use client";

import type { ReactNode } from "react";
import type { TabKey } from "@/types";
import { TabTooltip } from "@/components/result/TabTooltip";
import {
  ShieldIcon, MessageIcon, BeakerIcon, FileIcon, SparkIcon,
} from "@/components/icons";

interface TabDef {
  key: TabKey;
  label: string;
  icon: ReactNode;
  description: string;
}

const TABS: TabDef[] = [
  {
    key: "risk",
    label: "风险分析",
    icon: <ShieldIcon className="h-4 w-4" />,
    description: "按风险类型聚合规则与 AI 发现，并展示证据与置信度。",
  },
  {
    key: "suggestion",
    label: "审查建议",
    icon: <MessageIcon className="h-4 w-4" />,
    description: "AI 建议先进入草稿，由人工确认后再复制使用。",
  },
  {
    key: "testGap",
    label: "测试缺口",
    icon: <BeakerIcon className="h-4 w-4" />,
    description: "根据变更文件识别潜在测试覆盖缺口。",
  },
  {
    key: "draft",
    label: "评论草稿箱",
    icon: <FileIcon className="h-4 w-4" />,
    description: "将风险发现整理成可编辑、可筛选、可复制的 Review 评论草稿。",
  },
  {
    key: "order",
    label: "智能审查顺序",
    icon: <SparkIcon className="h-4 w-4" />,
    description: "根据风险等级、审查依据与潜在影响面生成优先级。",
  },
  {
    key: "markdown",
    label: "Markdown 报告",
    icon: <FileIcon className="h-4 w-4" />,
    description: "预览可复制、可下载的 Markdown 审查报告。",
  },
];

type ResultTabsProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export function ResultTabs({ activeTab, onTabChange }: ResultTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-visible">
      {TABS.map((tab, index) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`group relative inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              active
                ? "border-blue-300 bg-blue-50 text-blue-600 shadow-md shadow-blue-100/70"
                : "border-slate-200 bg-slate-50 text-slate-500 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            <TabTooltip
              align={
                index === 0
                  ? "left"
                  : index >= TABS.length - 2
                    ? "right"
                    : "center"
              }
            >
              {tab.description}
            </TabTooltip>
          </button>
        );
      })}
    </div>
  );
}
