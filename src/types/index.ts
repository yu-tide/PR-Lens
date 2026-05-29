export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ReviewRisk {
  id: string;
  level: RiskLevel;
  title: string;
  file: string;
  reason: string;
  suggestion: string;
  requiresHumanCheck: boolean;
}

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

export interface ReviewResult {
  summary: string;
  risks: ReviewRisk[];
  suggestions: ReviewSuggestion[];
}

export interface PullRequestMeta {
  title: string;
  author: string;
  repository: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export type AnalysisStatus = "idle" | "analyzing" | "success" | "error";

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
}

export interface ExamplePR {
  id: string;
  repo: string;
  prNumber: string;
  title: string;
  url: string;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: "flash" | "shield" | "message";
  tone: "blue" | "green" | "purple";
}

// ============================================================
// API 请求/响应类型
// ============================================================

/** 解析后的 PR 链接 */
export interface ParsedPullRequestUrl {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
}

/** 分析模式 */
export type AnalyzeMode = "real" | "mock";

/** 应用层错误码 */
export type AppErrorCode =
  | "INVALID_PR_URL"
  | "MOCK_MODE"
  | "UNKNOWN_ERROR";

/** 应用层错误 */
export interface AppError {
  code: AppErrorCode;
  message: string;
  detail?: string;
  recoverable: boolean;
}

/** POST /api/analyze-pr 请求 */
export interface AnalyzePrRequest {
  url?: string;
  useMock?: boolean;
}

/** POST /api/analyze-pr 响应 */
export interface AnalyzePrResponse {
  success: boolean;
  mode: AnalyzeMode;
  pullRequest?: PullRequestMeta;
  reviewResult?: ReviewResult;
  error?: AppError;
}