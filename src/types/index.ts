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
  owner?: string;
  repo?: string;
  pullNumber?: number;
  description?: string;
  baseBranch?: string;
  headBranch?: string;
  url?: string;
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
  changedFiles?: ChangedFile[];
  ruleCheckResults?: RuleCheckResult[];
  source?: "github" | "mock";
  warning?: string;
  aiSource?: AiReviewSource;
  markdownReport?: string;
  mergedRisks?: MergedReviewRisk[];
}

// ============================================================
// GitHub 数据与服务类型
// ============================================================

/** 变更文件状态（兼容 GitHub API 返回值） */
export type ChangedFileStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

/** 单个变更文件 */
export interface ChangedFile {
  filename: string;
  status: ChangedFileStatus | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
  blobUrl?: string;
  isBinary?: boolean;
  isTooLarge?: boolean;
}

/** 规则检查严重程度 */
export type RuleCheckSeverity = "low" | "medium" | "high";

/** 规则预检查结果 */
export interface RuleCheckResult {
  id: string;
  title: string;
  message: string;
  severity: RuleCheckSeverity;
  file?: string;
  line?: number;
}

/** GitHub API 错误码 */
export type GitHubApiErrorCode =
  | "GITHUB_API_ERROR"
  | "GITHUB_PR_NOT_FOUND"
  | "GITHUB_RATE_LIMIT"
  | "GITHUB_TOKEN_MISSING";

// ============================================================
// AI 服务类型
// ============================================================

/** AI 分析来源 */
export type AiReviewSource = "bailian" | "mock";

/** AI 分析输入 */
export interface AiAnalysisInput {
  pullRequest: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
}

/** AI 分析结果 */
export interface AiAnalysisResult {
  reviewResult: ReviewResult;
  source: AiReviewSource;
  warning?: string;
}

/** AI Client 配置 */
export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** AI Client 错误码 */
export type AiClientErrorCode =
  | "AI_TOKEN_MISSING"
  | "AI_API_ERROR"
  | "AI_RATE_LIMIT"
  | "AI_TIMEOUT"
  | "AI_INVALID_RESPONSE";

// ============================================================
// Review 合并 & Markdown 报告类型
// ============================================================

/** 风险来源 */
export type ReviewRiskSource = "ai" | "rule" | "ai_and_rule";

/** 合并后的风险（扩展 ReviewRisk） */
export interface MergedReviewRisk extends ReviewRisk {
  source: ReviewRiskSource;
  ruleIds?: string[];
  aiRiskIds?: string[];
  ruleMessages?: string[];
}

/** Markdown 报告生成输入 */
export interface ReportBuilderInput {
  pullRequest: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
  reviewResult: ReviewResult;
  mergedRisks?: MergedReviewRisk[];
  source?: "github" | "mock";
  aiSource?: AiReviewSource;
  warning?: string;
}