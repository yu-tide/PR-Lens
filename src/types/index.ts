// ============================================================
// PR Lens — Domain Types
// ============================================================

/**
 * 风险等级
 */
export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

/**
 * Review 中发现的一项风险
 */
export interface ReviewRisk {
  id: string;
  level: RiskLevel;
  title: string;
  file: string;
  reason: string;
  suggestion: string;
  requiresHumanCheck: boolean;
}

/**
 * Review 中给出的一条改进建议
 */
export interface ReviewSuggestion {
  id: string;
  title: string;
  category:
    | "Correctness"
    | "Security"
    | "Maintainability"
    | "Testing"
    | "Documentation";
  suggestion: string;
}

/**
 * 一次 Review 的完整结果
 */
export interface ReviewResult {
  summary: string;
  risks: ReviewRisk[];
  suggestions: ReviewSuggestion[];
}

/**
 * Pull Request 元信息
 */
export interface PullRequestMeta {
  title: string;
  author: string;
  repository: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

/**
 * 分析状态
 */
export type AnalysisStatus = "analyzing" | "success" | "error";

/**
 * 分析步骤
 */
export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
}
