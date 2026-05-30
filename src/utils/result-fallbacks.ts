// ============================================================
// PR Lens — Result Page Fallback Constants
// Extracted from src/app/result/page.tsx (PR11 refactor)
// ============================================================

import type { RiskLevel } from "@/types";

// ============================================================
// CSS Class Constants
// ============================================================

export const PAGE_CARD_CLASS =
    "rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)]";

export const OVERVIEW_CARD_CLASS =
    "rounded-[24px] border border-slate-300 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.09)]";

export const INNER_CARD_CLASS =
    "rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]";

export const SUBTLE_PANEL_CLASS =
    "rounded-2xl border border-slate-200 bg-slate-50/80 shadow-inner";

// ============================================================
// Session Key
// ============================================================

export const SESSION_KEY = "pr-lens:last-analysis";

// ============================================================
// UI Types (local to result page)
// ============================================================

export type LocalRiskLevel = "high" | "medium" | "low";

export interface RiskDisplay {
  level: LocalRiskLevel;
  label: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface ReviewOrderItem {
  file: string;
  title: string;
  severity: LocalRiskLevel;
  description: string;
}

export interface PrInfoDisplay {
  title: string;
  repo: string;
  prNumber: string;
  author: string;
  changedFiles: string;
  additions: string;
  deletions: string;
}

export interface SuggestionDisplay {
  icon: string;
  title: string;
  description: string;
}

// ============================================================
// Fallback Mock Data (used when API data is unavailable)
// ============================================================

export const fallbackPrInfo: PrInfoDisplay = {
  title: "为 API 路由添加限流支持",
  repo: "vercel/next.js",
  prNumber: "#57855",
  author: "leerob",
  changedFiles: "12 个文件",
  additions: "+324",
  deletions: "-97",
};

export const fallbackSummary = [
  "本次 PR 为 Next.js 添加了 API 路由限流能力，提供了灵活的限流配置与多种应用方式。",
  "实现基于 Redis 的分布式限流，支持多种响应头与客户端友好的错误提示，提升系统稳定性与安全性。",
  "整体代码结构清晰，建议在生产环境中关注 Redis 可用性与限流配置合理性。",
];

export const fallbackRisks: RiskDisplay[] = [
  {
    level: "high",
    label: "高风险",
    title: "潜在性能影响",
    description: "高流量下 Redis 调用可能成为瓶颈。",
    suggestion: "建议在生产环境中压测并监控 Redis 延迟。",
  },
  {
    level: "medium",
    label: "中风险",
    title: "限流配置不当",
    description: "过于严格或宽松的限流策略可能影响业务。",
    suggestion: "建议根据实际流量调优阈值与窗口设置。",
  },
  {
    level: "low",
    label: "低风险",
    title: "客户端兼容性",
    description: "部分代理或旧客户端可能不识别标准响应头。",
    suggestion: "建议提供降级处理与友好错误提示。",
  },
];

export const fallbackSuggestions: SuggestionDisplay[] = [
  {
    icon: "beaker",
    title: "补充压力测试用例",
    description: "验证不同并发下的限流效果与性能表现。",
  },
  {
    icon: "settings",
    title: "完善配置校验",
    description: "避免阈值、窗口期或 Redis 配置出现不合理值。",
  },
  {
    icon: "chart",
    title: "增加限流指标监控",
    description: "便于在生产环境中快速定位限流异常问题。",
  },
  {
    icon: "doc",
    title: "补充使用文档与示例",
    description: "降低团队接入成本，提高可维护性。",
  },
];

export const fallbackMarkdownLines = [
  "# PR 审查报告：为 API 路由添加限流支持",
  "**仓库**：vercel/next.js",
  "**PR 编号**：#57855",
  "**作者**：leerob",
  "**状态**：分析完成",
];

export const fallbackReviewOrder: ReviewOrderItem[] = [
  {
    file: "src/server/api/rate-limit.ts",
    title: "Redis 调用 / 高流量路径",
    severity: "high",
    description:
      "该文件位于限流核心链路，应优先确认 Redis 访问、异常处理与性能边界。",
  },
  {
    file: "src/config/rate-limit.ts",
    title: "限流阈值与窗口配置",
    severity: "high",
    description:
      "配置项会直接影响线上请求体验，需要重点检查默认值、边界值与覆盖策略。",
  },
  {
    file: "tests/rate-limit.test.ts",
    title: "测试覆盖与异常场景",
    severity: "medium",
    description:
      "建议确认并发、Redis 失败、超限响应与恢复场景是否已有测试覆盖。",
  },
  {
    file: "docs/api-rate-limit.md",
    title: "使用说明与接入约束",
    severity: "low",
    description:
      "文档应说明响应头、错误码、配置示例与生产环境注意事项。",
  },
];

// ============================================================
// Aggregated Fallback
// ============================================================

export const FALLBACK = {
  prInfo: fallbackPrInfo,
  summary: fallbackSummary,
  risks: fallbackRisks,
  suggestions: fallbackSuggestions,
  markdownLines: fallbackMarkdownLines,
};
